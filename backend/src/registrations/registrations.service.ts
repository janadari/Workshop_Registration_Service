import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';

@Injectable()
export class RegistrationsService {
  constructor(private prisma: PrismaService) {}

  private async promoteNextWaitlist(tx: any, workshopId: string, actorId: string) {
    const workshop = await tx.workshop.findUnique({
      where: { id: workshopId },
      select: { capacity: true },
    });

    if (!workshop) return null;

    const activeCount = await tx.registration.count({
      where: { workshopId, status: 'ACTIVE' },
    });

    if (activeCount >= workshop.capacity) return null;

    const nextWaitlisted = await tx.registration.findFirst({
      where: { workshopId, status: 'WAITLISTED' },
      orderBy: { createdAt: 'asc' },
    });

    if (!nextWaitlisted) return null;

    const promoted = await tx.registration.update({
      where: { id: nextWaitlisted.id },
      data: {
        status: 'ACTIVE',
        cancelledAt: null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: 'PROMOTE_WAITLIST',
        entity: 'Registration',
        entityId: promoted.id,
        details: JSON.stringify({ workshopId, attendeeEmail: promoted.attendeeEmail }),
      },
    });

    return promoted;
  }

  async register(createRegistrationDto: CreateRegistrationDto, userId: string) {
    const { workshopId, attendeeName, attendeeEmail } = createRegistrationDto;

    return await this.prisma.$transaction(async (tx) => {
      const workshop = await tx.workshop.findUnique({
        where: { id: workshopId },
        select: {
          id: true,
          capacity: true,
        },
      });

      if (!workshop) {
        throw new NotFoundException('Workshop not found');
      }

      const activeCount = await tx.registration.count({
        where: { workshopId, status: 'ACTIVE' },
      });

      const status = activeCount >= workshop.capacity ? 'WAITLISTED' : 'ACTIVE';

      const registration = await tx.registration.create({
        data: {
          workshopId,
          attendeeName,
          attendeeEmail,
          status,
          createdById: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: status === 'ACTIVE' ? 'REGISTER_WORKSHOP' : 'JOIN_WAITLIST',
          entity: 'Registration',
          entityId: registration.id,
          details: JSON.stringify({ workshopId, attendeeEmail, status }),
        },
      });

      return registration;
    });
  }

  async cancel(id: string, userId: string) {
    const registration = await this.prisma.registration.findUnique({ where: { id } });
    if (!registration) throw new NotFoundException();

    const wasActive = registration.status === 'ACTIVE';

    const updated = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.registration.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledById: userId,
          cancelledAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CANCEL_REGISTRATION',
          entity: 'Registration',
          entityId: cancelled.id,
          details: JSON.stringify({ workshopId: cancelled.workshopId, attendeeEmail: cancelled.attendeeEmail }),
        },
      });

      if (wasActive) {
        await this.promoteNextWaitlist(tx, cancelled.workshopId, userId);
      }

      return cancelled;
    });

    return updated;
  }
}
