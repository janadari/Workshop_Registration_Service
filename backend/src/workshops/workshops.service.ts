import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkshopDto, UpdateWorkshopDto } from './dto/create-workshop.dto';

@Injectable()
export class WorkshopsService {
  constructor(private prisma: PrismaService) {}

  async create(createWorkshopDto: CreateWorkshopDto, userId: string) {
    /*
     * `code` is unique. Without this check a duplicate code reached Prisma and
     * came back as a bare "Internal server error" (500) - the manager filling in
     * the form has no idea the code is taken. Checked explicitly so the API
     * answers 409 with the offending code.
     */
    const duplicate = await this.prisma.workshop.findUnique({
      where: { code: createWorkshopDto.code },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(`Workshop code ${createWorkshopDto.code} is already in use`);
    }

    const workshop = await this.prisma.workshop.create({
      data: {
        ...createWorkshopDto,
        date: new Date(createWorkshopDto.date)
      }
    });
    
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE_WORKSHOP',
        entity: 'Workshop',
        entityId: workshop.id,
        details: JSON.stringify(createWorkshopDto)
      }
    });
    
    return workshop;
  }

  findAll() {
    return this.prisma.workshop.findMany({
      orderBy: { date: 'asc' },
      include: {
        _count: {
          select: { registrations: { where: { status: 'ACTIVE' } } }
        }
      }
    });
  }

  findOne(id: string) {
    return this.prisma.workshop.findUnique({
      where: { id },
      include: {
        /*
         * The manage-workshop panel renders "booked / seats left" with the same
         * helpers the catalogue uses (frontend .../dashboard/types.ts ->
         * bookedSeats), which read `_count.registrations`. This include was
         * missing from the detail response, so `_count` was `undefined` there and
         * the panel treated every workshop as empty: capacity 20 with 3 ACTIVE
         * registrations showed "20 seats left" and a 0% meter, and re-fetching
         * after a registration redisplayed the same wrong numbers (only the
         * attendee list looked updated). Filtered to ACTIVE exactly like
         * findAll() so the list and the detail panel always agree.
         */
        _count: {
          select: { registrations: { where: { status: 'ACTIVE' } } }
        },
        registrations: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: { select: { email: true, role: true } },
            cancelledBy: { select: { email: true, role: true } }
          }
        }
      }
    });
  }

  async update(id: string, updateWorkshopDto: UpdateWorkshopDto, userId: string) {
    const data: any = { ...updateWorkshopDto };
    if (data.date) data.date = new Date(data.date);
    
    const workshop = await this.prisma.workshop.update({
      where: { id },
      data
    });
    
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_WORKSHOP',
        entity: 'Workshop',
        entityId: id,
        details: JSON.stringify(updateWorkshopDto)
      }
    });
    
    return workshop;
  }
}
