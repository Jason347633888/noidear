import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Snowflake } from '../../common/utils/snowflake';
import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import * as bcrypt from 'bcrypt';

const SYSTEM_ROLE_BASELINE = {
  admin: { name: '系统管理员', description: '系统内置管理员角色' },
  leader: { name: '部门负责人', description: '系统内置部门负责人角色' },
  user: { name: '普通用户', description: '系统内置普通用户角色' },
} as const;

@Injectable()
export class UserService {
  private readonly snowflake: Snowflake;
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService) {
    this.snowflake = new Snowflake(1, 1);
  }

  private readonly userInclude = {
    roleObj: { select: { id: true, code: true, name: true } },
    department: { select: { id: true, name: true, status: true } },
  };

  async findAll(page = 1, limit = 20, keyword?: string, departmentId?: string, role?: string, status?: string) {
    const conditions: object[] = [];
    if (keyword) {
      conditions.push({ OR: [{ name: { contains: keyword } }, { username: { contains: keyword } }] });
    }
    if (departmentId === 'unassigned') {
      conditions.push({ departmentId: null });
    } else if (departmentId) {
      conditions.push({ departmentId });
    }
    if (role) {
      conditions.push({ roleObj: { code: role } });
    }
    if (status) {
      conditions.push({ status });
    }
    const where = conditions.length > 0 ? { AND: conditions } : {};
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.userInclude,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { list, total, page, limit };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: this.userInclude });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  private async validateRole(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, code: true, deletedAt: true },
    });
    if (!role || role.deletedAt) {
      throw new BadRequestException('角色不存在或已停用');
    }
    return role;
  }

  private async ensureSystemRole(code: keyof typeof SYSTEM_ROLE_BASELINE) {
    const role = SYSTEM_ROLE_BASELINE[code];
    return this.prisma.role.upsert({
      where: { code },
      update: { deletedAt: null },
      create: {
        id: code,
        code,
        name: role.name,
        description: role.description,
      },
      select: { id: true, code: true },
    });
  }

  private async resolveRole(roleId?: string, fallbackRole?: string): Promise<{ id?: string; code: string }> {
    if (roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: roleId }, select: { id: true, code: true } });
      if (role) return role;
    }
    const code = fallbackRole ?? 'user';
    if (code in SYSTEM_ROLE_BASELINE) {
      return this.ensureSystemRole(code as keyof typeof SYSTEM_ROLE_BASELINE);
    }
    const role = await this.prisma.role.findUnique({ where: { code }, select: { id: true, code: true } });
    return role ?? { code };
  }

  async create(dto: CreateUserDTO) {
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) {
      throw new BusinessException(ErrorCode.CONFLICT, '用户名已存在');
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const role = await this.validateRole(dto.roleId);
    return this.prisma.user.create({
      data: {
        id: this.snowflake.nextId(),
        username: dto.username,
        password: hashedPassword,
        name: dto.name,
        departmentId: dto.departmentId,
        roleId: role.id,
        superiorId: dto.superiorId,
      },
      include: this.userInclude,
    });
  }

  async update(id: string, dto: UpdateUserDTO) {
    await this.findOne(id);
    const data: Record<string, unknown> = {
      name: dto.name,
      departmentId: dto.departmentId,
      superiorId: dto.superiorId,
      status: dto.status,
    };
    if (dto.roleId !== undefined) {
      const role = await this.validateRole(dto.roleId);
      data.roleId = role.id;
    }
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    const updated = await this.prisma.user.update({ where: { id }, data, include: this.userInclude });

    // BR-319: 用户离职数据转交 — 状态变为 inactive 时转交未完成工作流任务给直属上级
    if (dto.status === 'inactive') {
      await this.handleUserOffboarding(id).catch((err) => {
        this.logger.error(`用户离职数据转交失败 userId=${id}: ${err.message}`, err.stack);
      });
    }

    return updated;
  }

  /**
   * BR-319: 用户离职数据转交
   * 将用户名下 PENDING 状态的统一审批任务转交给直属上级。
   * 旧 WorkflowTask 已剔除，本方法只处理 ApprovalTask。
   */
  private async handleUserOffboarding(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { superiorId: true, name: true },
    });

    if (!user?.superiorId) {
      this.logger.warn(`用户 ${userId} 无直属上级，跳过审批任务转交`);
      return;
    }

    const pendingTasks = await this.prisma.approvalTask.findMany({
      where: { assigneeUserId: userId, status: 'PENDING' },
      select: { id: true },
    });

    if (pendingTasks.length === 0) {
      return;
    }

    await this.prisma.approvalTask.updateMany({
      where: { assigneeUserId: userId, status: 'PENDING' },
      data: { assigneeUserId: user.superiorId },
    });

    this.logger.log(
      `用户 ${userId} 离职转交: ${pendingTasks.length} 个审批任务已转交给直属上级 ${user.superiorId}`,
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async resetPassword(id: string) {
    await this.findOne(id);
    const defaultPassword = '12345678';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword, loginAttempts: 0, lockedUntil: null },
    });
    return { message: '密码已重置为默认密码' };
  }
}
