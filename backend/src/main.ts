import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS is open by default, which works for local development and for any
  // *.netlify.app deploy URL. To lock it down, set CORS_ORIGIN on the host to a
  // comma-separated list of allowed origins (no trailing slash), e.g.
  //   CORS_ORIGIN="https://your-site.netlify.app,https://your-domain.com"
  const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors(allowedOrigins.length > 0 ? { origin: allowedOrigins } : {});
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
