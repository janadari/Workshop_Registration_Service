import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JWT_EXPIRES_IN, JWT_SECRET } from './jwt.constants';

@Module({
  imports: [
    PassportModule,
    /*
     * Secret comes from src/auth/jwt.constants.ts so that signing (here) and
     * verification (jwt.strategy.ts) can never drift apart. See that file for
     * why the literal 'super-secret' this used to contain was a problem.
     */
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
