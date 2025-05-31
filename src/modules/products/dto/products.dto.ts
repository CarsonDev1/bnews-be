import { IsOptional, IsString, IsArray, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchProductsDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Category UID' })
  @IsOptional()
  @IsString()
  categoryUid?: string;

  @ApiPropertyOptional({ description: 'Page size', minimum: 1, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Current page', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  currentPage?: number;
}

export class ValidateProductsDto {
  @ApiProperty({ description: 'Array of product URL keys to validate' })
  @IsArray()
  @IsString({ each: true })
  productKeys: string[];
}
