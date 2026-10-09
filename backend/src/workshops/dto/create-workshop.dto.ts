import { IsString, IsNotEmpty, IsInt, Min, IsDateString, IsOptional } from 'class-validator';

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
  code?: string;

  @IsOptional()
  title?: string;

  @IsOptional()
  instructor?: string;

  @IsOptional()
  date?: string;

  @IsOptional()
  capacity?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
