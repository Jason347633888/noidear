import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
  QuerySystemConfigDto,
} from './dto/system-config.dto';

@Injectable()
export class SystemConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * P0-6: 创建系统配置
   */
  async create(createDto: CreateSystemConfigDto) {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key: createDto.key },
    });

    if (existing) {
      throw new ConflictException(`配置键 ${createDto.key} 已存在`);
    }

    return await this.prisma.systemConfig.create({
      data: {
        key: createDto.key,
        value: createDto.value,
        valueType: createDto.valueType || 'text',
        category: createDto.category,
        description: createDto.description,
      },
    });
  }

  /**
   * 查询所有配置
   */
  async findAll(query: QuerySystemConfigDto) {
    const where: any = {};

    if (query.category) {
      where.category = query.category;
    }

    if (query.keyword) {
      where.OR = [
        { key: { contains: query.keyword } },
        { description: { contains: query.keyword } },
      ];
    }

    const configs = await this.prisma.systemConfig.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return { data: configs, total: configs.length };
  }

  /**
   * 根据 key 获取单个配置
   */
  async findByKey(key: string) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      throw new NotFoundException(`配置键 ${key} 不存在`);
    }

    return config;
  }

  /**
   * 获取配置值（带类型转换）
   */
  async getValue(key: string): Promise<any> {
    const config = await this.findByKey(key);

    switch (config.valueType) {
      case 'number':
        return Number(config.value);
      case 'boolean':
        return config.value === 'true';
      case 'json':
        try {
          return JSON.parse(config.value);
        } catch {
          throw new BadRequestException(`配置 ${key} 的 JSON 值无效`);
        }
      default:
        return config.value;
    }
  }

  /**
   * 更新配置
   */
  async update(key: string, updateDto: UpdateSystemConfigDto) {
    await this.findByKey(key);

    return await this.prisma.systemConfig.update({
      where: { key },
      data: {
        value: updateDto.value,
        description: updateDto.description,
      },
    });
  }

  /**
   * 删除配置
   */
  async remove(key: string) {
    await this.findByKey(key);

    await this.prisma.systemConfig.delete({
      where: { key },
    });

    return { success: true, message: `配置 ${key} 已删除` };
  }
}
