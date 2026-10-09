import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/*
 * Development seed data.
 *
 * The brief asks for "a seeded Admin login and a few sample workshops so we can
 * try it straight away", so this creates one account per role and a small
 * catalogue that exercises every interesting state:
 *
 *   POT-101  this week, seats left        -> register + history flows
 *   COD-201  this week, one cancellation  -> cancelled row keeps who/when
 *   FIT-301  full (capacity reached)      -> the next registration is WAITLISTED
 *   CER-110  last week, COMPLETED         -> date/status filtering
 *
 * Re-running must never damage existing data: users are upserted with
 * `update: {}` (so a password changed in the app is not reset) and the
 * registrations below are only inserted when a workshop has none.
 */

const DEMO_USERS = [
  { email: 'admin@test.com', password: 'admin123', role: 'ADMIN' },
  { email: 'manager@test.com', password: 'manager123', role: 'MANAGER' },
  { email: 'staff@test.com', password: 'staff123', role: 'STAFF' },
];

const DAY = 24 * 60 * 60 * 1000;

/** A date `offsetDays` from today, at the given local time. */
function at(offsetDays: number, hours: number, minutes = 0) {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function main() {
  const users: Record<string, { id: string }> = {};

  for (const user of DEMO_USERS) {
    users[user.role] = await prisma.user.upsert({
      where: { email: user.email },
      update: {}, // keep an existing password / role as it is
      create: {
        email: user.email,
        password: await bcrypt.hash(user.password, 10),
        role: user.role,
      },
    });
  }

  const workshops = [
    {
      code: 'POT-101',
      title: 'Pottery Basics',
      instructor: 'Nadia Perera',
      date: at(2, 9, 30),
      capacity: 12,
      status: 'SCHEDULED',
    },
    {
      code: 'COD-201',
      title: 'Intro to Coding',
      instructor: 'Marcus Silva',
      date: at(4, 14, 0),
      capacity: 20,
      status: 'SCHEDULED',
    },
    {
      code: 'FIT-301',
      title: 'Morning Fitness',
      instructor: 'Danushka Fernando',
      date: at(1, 7, 0),
      capacity: 4,
      status: 'SCHEDULED',
    },
    {
      code: 'CER-110',
      title: 'Ceramics Glazing',
      instructor: 'Nadia Perera',
      date: at(-6, 10, 0),
      capacity: 8,
      status: 'COMPLETED',
    },
  ];

  const ids: Record<string, string> = {};

  for (const workshop of workshops) {
    const row = await prisma.workshop.upsert({
      where: { code: workshop.code },
      update: {},
      create: workshop,
    });
    ids[workshop.code] = row.id;

    await prisma.auditLog.create({
      data: {
        userId: users.MANAGER.id,
        action: 'CREATE_WORKSHOP',
        entity: 'Workshop',
        entityId: row.id,
        details: JSON.stringify({ code: row.code, title: row.title, capacity: row.capacity }),
      },
    });
  }

  /* Only fill a workshop that has no registration history yet. */
  const isEmpty = async (workshopId: string) =>
    (await prisma.registration.count({ where: { workshopId } })) === 0;

  const addRegistration = async (
    workshopId: string,
    attendeeName: string,
    attendeeEmail: string,
    status: 'ACTIVE' | 'WAITLISTED' | 'CANCELLED',
    actorId: string,
  ) => {
    const row = await prisma.registration.create({
      data: {
        workshopId,
        attendeeName,
        attendeeEmail,
        status,
        createdById: actorId,
        cancelledById: status === 'CANCELLED' ? actorId : null,
        cancelledAt: status === 'CANCELLED' ? new Date(Date.now() - DAY) : null,
        createdAt: new Date(Date.now() - 2 * DAY),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action:
          status === 'ACTIVE'
            ? 'REGISTER_WORKSHOP'
            : status === 'WAITLISTED'
              ? 'JOIN_WAITLIST'
              : 'CANCEL_REGISTRATION',
        entity: 'Registration',
        entityId: row.id,
        details: JSON.stringify({ workshopId, attendeeEmail, status }),
      },
    });
  };

  // Open workshop with seats left.
  if (await isEmpty(ids['POT-101'])) {
    await addRegistration(ids['POT-101'], 'Ishara Wickrama', 'ishara@example.com', 'ACTIVE', users.STAFF.id);
    await addRegistration(ids['POT-101'], 'Tharindu Jay', 'tharindu@example.com', 'ACTIVE', users.STAFF.id);
  }

  // One cancelled registration: the row is kept, including who cancelled it and when.
  if (await isEmpty(ids['COD-201'])) {
    await addRegistration(ids['COD-201'], 'Ruwan Dias', 'ruwan@example.com', 'ACTIVE', users.MANAGER.id);
    await addRegistration(ids['COD-201'], 'Amaya Silva', 'amaya@example.com', 'ACTIVE', users.MANAGER.id);
    await addRegistration(ids['COD-201'], 'Kavindu Perera', 'kavindu@example.com', 'CANCELLED', users.STAFF.id);
  }

  // Deliberately FULL workshop, with a queue behind it.
  if (await isEmpty(ids['FIT-301'])) {
    for (const name of ['Sanduni Raj', 'Dilan Kodagoda', 'Hasini Mudalige', 'Nimali Jayawardena']) {
      await addRegistration(
        ids['FIT-301'],
        name,
        `${name.split(' ')[0].toLowerCase()}@example.com`,
        'ACTIVE',
        users.STAFF.id,
      );
    }
    await addRegistration(ids['FIT-301'], 'Chathura Bandara', 'chathura@example.com', 'WAITLISTED', users.STAFF.id);
  }

  console.log('\nSeeded development data:');
  for (const user of DEMO_USERS) {
    console.log(`  ${user.role.padEnd(7)} ${user.email.padEnd(18)} password: ${user.password}`);
  }
  console.log(
    `  ${workshops.length} workshops: ${workshops.map((w) => w.code).join(', ')} - FIT-301 is full with 1 waitlisted`,
  );
  console.log('  Dev-only credentials - replace them before any real deployment.\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
