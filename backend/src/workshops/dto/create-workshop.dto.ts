import { IsString, IsNotEmpty, IsInt, Min, IsDateString, IsOptional, IsIn } from 'class-validator';

/*
 * The lifecycle values the UI and the schema comment both expect
 * (see the `status` field in prisma/schema.prisma).
 */
export const WORKSHOP_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;

export class CreateWorkshopDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  instructor: string;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  capacity: number;
}

export class UpdateWorkshopDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  instructor?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  /*
   * These two were `@IsOptional()`-only, which in class-validator means
   * "present and completely unchecked" (the global ValidationPipe has
   * whitelist: true, so a decorated property survives). A PATCH with
   * {"capacity": "many"} therefore reached Prisma and surfaced as a 500 instead
   * of a 400, and {"status": "whatever"} wrote a status the app cannot render.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  @IsIn(WORKSHOP_STATUSES)
  status?: string;
}
