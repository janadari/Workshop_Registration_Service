import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';

@Injectable()
export class RegistrationsService {
  constructor(private prisma: PrismaService) {}

  /*
   * The capacity rule ("never more ACTIVE registrations than seats") is a
   * read-then-write decision: count the active rows, then insert/update.
   *
   * Postgres runs every statement at READ COMMITTED, so two overlapping
   * transactions can both count 0 active rows for a 1-seat workshop and both
   * insert ACTIVE - the exact double-booking this system exists to prevent
   * (measured: 7 ACTIVE rows for a capacity-1 workshop under 10 simultaneous
   * requests). A Prisma $transaction alone does not help, because READ
   * COMMITTED takes no predicate locks on a COUNT().
   *
   * Taking a row lock on the workshop first serialises every capacity decision
   * for that workshop: the second transaction blocks until the first commits,
   * then re-reads the count and sees the seat is gone.
   *
   * Requires Postgres (the schema's provider). The tagged template becomes $1,
   * so the id is parameterised, never interpolated.
   */
  private async lockWorkshop(tx: any, workshopId: string) {
    await tx.$queryRaw`SELECT id FROM "Workshop" WHERE id = ${workshopId} FOR UPDATE`;
  }

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
      // Lock before counting: the count below must be the truth for this
      // workshop, not a snapshot that another transaction is about to invalidate.
      await this.lockWorkshop(tx, workshopId);

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
    /*
     * Cancelling is the mirror image of registering: the seat that is freed is
     * handed to the next waitlisted attendee, so the same interleaving can
     * promote two attendees into one seat. Two guards here:
     *   1. the workshop row lock is taken before the status is re-read, so the
     *      "was this seat actually freed?" decision cannot be made twice;
     *   2. an already-CANCELLED registration returns its existing row instead of
     *      cancelling again - the second cancellation must not free a second
     *      seat (and must not overwrite who cancelled it first).
     * The record itself is never deleted: status / cancelledBy / cancelledAt
     * keep the history, and the audit log keeps who did it and when.
     */
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.registration.findUnique({
        where: { id },
        select: { workshopId: true },
      });
      if (!existing) throw new NotFoundException();

      await this.lockWorkshop(tx, existing.workshopId);

      const registration = await tx.registration.findUnique({ where: { id } });
      if (!registration) throw new NotFoundException();

      if (registration.status === 'CANCELLED') return registration;

      const wasActive = registration.status === 'ACTIVE';

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
  }
}
