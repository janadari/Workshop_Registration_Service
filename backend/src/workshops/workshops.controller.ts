import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto, UpdateWorkshopDto } from './dto/create-workshop.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Roles('MANAGER')
  @Post()
  create(@Body() createWorkshopDto: CreateWorkshopDto, @Request() req) {
    return this.workshopsService.create(createWorkshopDto, req.user.id);
  }

  @Roles('MANAGER', 'STAFF')
  @Get()
  findAll() {
    return this.workshopsService.findAll();
  }

  @Roles('MANAGER', 'STAFF')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workshopsService.findOne(id);
  }

  @Roles('MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWorkshopDto: UpdateWorkshopDto, @Request() req) {
    return this.workshopsService.update(id, updateWorkshopDto, req.user.id);
  }
}
