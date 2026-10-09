import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkshopsModule } from './workshops/workshops.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PrismaModule, AuthModule, WorkshopsModule, RegistrationsModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
