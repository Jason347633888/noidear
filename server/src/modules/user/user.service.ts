import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Snowflake } from '../../common/utils/snowflake';
import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private readonly snowflake: Snowflake;

  constructor(private prisma: PrismaService) {
    this.snowflake = new Snowflake(1, 1);
  }

  async findAll(page = 1, limit = 20, keyword?: string) {
    const where = keyword ? { OR: [{ name: { contains: keyword } }, { username: { contains: keyword } }] } : {};
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);
    return { list, total, page, limit };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async create(dto: CreateUserDTO) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        id: this.snowflake.nextId(),
        username: dto.username,
        password: hashedPassword,
        name: dto.name,
        departmentId: dto.departmentId,
        role: dto.role,
        superiorId: dto.superiorId,
      },
    });
  }

  async update(id: string, dto: UpdateUserDTO) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
