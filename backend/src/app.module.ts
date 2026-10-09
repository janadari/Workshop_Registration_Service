import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkshopsModule } from './workshops/workshops.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PrismaModule, AuthModule, WorkshopsModule, RegistrationsModule, UsersModule],
})
export class AppModule {}
