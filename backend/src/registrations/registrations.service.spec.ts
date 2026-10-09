import { RegistrationsService } from './registrations.service';

describe('RegistrationsService', () => {
  it('should place a registration on the waitlist when the workshop is full', async () => {
    const mockTx = {
      workshop: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'workshop-1',
          capacity: 1,
        }),
      },
      registration: {
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: 'reg-1',
          ...data,
        })),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    const prisma = {
      $transaction: vi.fn(async (callback) => callback(mockTx)),
    };

    const service = new RegistrationsService(prisma as any);

    const result = await service.register(
      { workshopId: 'workshop-1', attendeeName: 'Jane', attendeeEmail: 'jane@example.com' },
      'user-1',
    );

    expect(result.status).toBe('WAITLISTED');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
