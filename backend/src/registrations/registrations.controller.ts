import { Controller, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Roles('MANAGER', 'STAFF')
  @Post()
  register(@Body() createRegistrationDto: CreateRegistrationDto, @Request() req) {
    return this.registrationsService.register(createRegistrationDto, req.user.id);
  }

  @Roles('MANAGER', 'STAFF')
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Request() req) {
    return this.registrationsService.cancel(id, req.user.id);
  }
}
