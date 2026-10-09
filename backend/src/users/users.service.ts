import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, adminId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: createUserDto.email } });
    if (existing) throw new BadRequestException('Email already exists');
    
    const password = await bcrypt.hash(createUserDto.password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password,
        role: createUserDto.role
      }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({ email: user.email, role: user.role })
      }
    });
    
    return { id: user.id, email: user.email, role: user.role };
  }

  findAll() {
    return this.prisma.user.findMany({ select: { id: true, email: true, role: true } });
  }

  async findAuditTrail() {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    const activity = await Promise.all(
      logs.map(async (log) => {
        const user = await this.prisma.user.findUnique({
          where: { id: log.userId },
          select: { email: true },
        });

        return {
          id: log.id,
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
          details: log.details,
          createdAt: log.createdAt,
          user: user ? { email: user.email } : null,
        };
      }),
    );

    return activity;
  }
}
