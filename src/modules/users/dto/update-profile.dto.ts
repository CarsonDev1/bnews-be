import {
  IsString,
  IsOptional,
  MaxLength,
  IsUrl,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  // Remove avatar from here - it's handled via upload endpoint
  // @ApiPropertyOptional({ description: 'Avatar URL' })
  // @IsOptional()
  // @IsUrl()
  // avatar?: string;

  @ApiPropertyOptional({ description: 'Bio (max 500 characters)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  isEmailNotificationEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Make profile public' })
  @IsOptional()
  @IsBoolean()
  isProfilePublic?: boolean;

  @ApiPropertyOptional({ description: 'SEO title for profile page' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO description for profile page' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoDescription?: string;
}
