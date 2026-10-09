import { NotFoundException } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';

/*
 * Capacity rule / concurrency guard tests.
 *
 * The count-then-insert check is only correct because the service takes a
 * Postgres row lock on the workshop first (RegistrationsService.lockWorkshop).
 * These tests pin that contract down with mocks: a real interleaving
 * reproduction lives in the README ("Issues and how they were solved") and was
 * measured at 7 ACTIVE rows for a capacity-1 workshop before the lock existed.
 */

function makeTx() {
  return {
    // `tx.$queryRaw` is called as a tagged template: (strings, ...values).
    $queryRaw: vi.fn().mockResolvedValue([{ id: 'workshop-1' }]),
    workshop: {
      findUnique: vi.fn().mockResolvedValue({ id: 'workshop-1', capacity: 1 }),
    },
    registration: {
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: 'reg-1', ...data })),
      findUnique: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockImplementation(async ({ data }) => ({ id: 'reg-1', ...data })),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  };
}

function makePrisma(tx: ReturnType<typeof makeTx>) {
  return { $transaction: vi.fn(async (callback: (t: unknown) => unknown) => callback(tx)) };
}

describe('RegistrationsService', () => {
  it('should place a registration on the waitlist when the workshop is full', async () => {
    const mockTx = makeTx();
    const prisma = makePrisma(mockTx);

    const service = new RegistrationsService(prisma as any);

    const result = await service.register(
      { workshopId: 'workshop-1', attendeeName: 'Jane', attendeeEmail: 'jane@example.com' },
      'user-1',
    );

    expect(result.status).toBe('WAITLISTED');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('locks the workshop row before counting, so the capacity check cannot race', async () => {
    const mockTx = makeTx();
    mockTx.registration.count.mockResolvedValue(0); // a seat is free
    const prisma = makePrisma(mockTx);
    const service = new RegistrationsService(prisma as any);

    const result = await service.register(
      { workshopId: 'workshop-1', attendeeName: 'Jane', attendeeEmail: 'jane@example.com' },
      'user-1',
    );

    expect(result.status).toBe('ACTIVE');
    expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

    const lockOrder = mockTx.$queryRaw.mock.invocationCallOrder[0];
    const countOrder = mockTx.registration.count.mock.invocationCallOrder[0];
    const insertOrder = mockTx.registration.create.mock.invocationCallOrder[0];
    expect(lockOrder).toBeLessThan(countOrder);
    expect(countOrder).toBeLessThan(insertOrder);
  });

  it('rejects a registration for a workshop that does not exist', async () => {
    const mockTx = makeTx();
    mockTx.workshop.findUnique.mockResolvedValue(null);
    const service = new RegistrationsService(makePrisma(mockTx) as any);

    await expect(
      service.register(
        { workshopId: 'missing', attendeeName: 'Jane', attendeeEmail: 'jane@example.com' },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockTx.registration.create).not.toHaveBeenCalled();
  });

  it('does not free a second seat when the same registration is cancelled twice', async () => {
    const mockTx = makeTx();
    mockTx.registration.findUnique
      .mockResolvedValueOnce({ workshopId: 'workshop-1' })
      .mockResolvedValueOnce({ id: 'reg-1', workshopId: 'workshop-1', status: 'CANCELLED' });
    const service = new RegistrationsService(makePrisma(mockTx) as any);

    const result = await service.cancel('reg-1', 'user-2');

    expect(result.status).toBe('CANCELLED');
    // The lock is still taken first, so the re-read happens after it.
    expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
    // No second cancellation -> no second promotion of a waitlisted attendee.
    expect(mockTx.registration.update).not.toHaveBeenCalled();
    expect(mockTx.auditLog.create).not.toHaveBeenCalled();
  });

  it('promotes the oldest waitlisted attendee when an active seat is cancelled', async () => {
    const mockTx = makeTx();
    mockTx.registration.findUnique
      .mockResolvedValueOnce({ workshopId: 'workshop-1' })
      .mockResolvedValueOnce({ id: 'reg-1', workshopId: 'workshop-1', status: 'ACTIVE' });
    mockTx.workshop.findUnique.mockResolvedValue({ id: 'workshop-1', capacity: 4 });
    mockTx.registration.count.mockResolvedValue(3); // one seat just freed
    mockTx.registration.findFirst.mockResolvedValue({ id: 'reg-9', status: 'WAITLISTED' });
    const service = new RegistrationsService(makePrisma(mockTx) as any);

    await service.cancel('reg-1', 'user-2');

    expect(mockTx.registration.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { id: 'reg-1' }, data: expect.objectContaining({ status: 'CANCELLED' }) }),
    );
    expect(mockTx.registration.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { id: 'reg-9' }, data: expect.objectContaining({ status: 'ACTIVE' }) }),
    );
  });
});

