import { ApiProperty } from '@nestjs/swagger';

export class CurrentUserDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  firstName?: string;

  @ApiProperty({ required: false })
  lastName?: string;

  @ApiProperty({ required: false })
  displayName?: string;

  @ApiProperty({ required: false })
  avatar?: string;

  @ApiProperty({ required: false })
  bio?: string;

  @ApiProperty({ required: false })
  website?: string;

  @ApiProperty({ required: false })
  location?: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  postCount: number;

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  followingCount: number;

  @ApiProperty()
  isProfilePublic: boolean;

  @ApiProperty()
  isEmailNotificationEnabled: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  lastLoginAt?: Date;

  @ApiProperty()
  fullName: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: CurrentUserDto })
  user: CurrentUserDto;

  @ApiProperty()
  expiresIn: number;
}
