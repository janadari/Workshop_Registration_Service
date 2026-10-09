import { WorkshopsService } from './workshops.service';

/*
 * Seat-count response shapes.
 *
 * The dashboard derives "seats left" from `_count.registrations` (see
 * frontend/src/components/dashboard/types.ts -> bookedSeats). findOne() used to
 * omit that include, so the manage-workshop panel showed capacity 20 / 3 ACTIVE
 * registrations as "20 seats left" with a 0% meter - and re-fetching after a
 * registration showed the same numbers again. These tests pin the field (and its
 * ACTIVE filter) on both read endpoints so the two screens cannot drift apart.
 */

const ACTIVE_ONLY_COUNT = { select: { registrations: { where: { status: 'ACTIVE' } } } };

function makeService() {
  const prisma = {
    workshop: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue({ id: 'workshop-1' }),
    },
  };
  return { prisma, service: new WorkshopsService(prisma as any) };
}

describe('WorkshopsService seat counts', () => {
  it('findAll() counts only ACTIVE registrations for the catalogue view', async () => {
    const { prisma, service } = makeService();

    await service.findAll();

    expect(prisma.workshop.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ _count: ACTIVE_ONLY_COUNT }),
      }),
    );
  });

  it('findOne() exposes the same ACTIVE-only count so the detail panel is not empty', async () => {
    const { prisma, service } = makeService();

    await service.findOne('workshop-1');

    const args = prisma.workshop.findUnique.mock.calls[0][0];
    expect(args.where).toEqual({ id: 'workshop-1' });
    expect(args.include._count).toEqual(ACTIVE_ONLY_COUNT);
    // The attendee history still needs every row, cancellations included.
    expect(args.include.registrations).toBeDefined();
  });
});
