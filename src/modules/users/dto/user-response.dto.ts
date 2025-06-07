// src/modules/users/dto/user-response.dto.ts - COMPLETELY FIXED VERSION

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../../schemas/user.schema';

// Original UserResponseDto
export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional({ description: 'User website URL' })
  website?: string;

  @ApiPropertyOptional({ description: 'User location' })
  location?: string;

  @ApiPropertyOptional({ description: 'User date of birth' })
  dateOfBirth?: Date;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @ApiProperty()
  postCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  followingCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiPropertyOptional()
  lastLoginAt?: Date;

  @ApiProperty()
  isEmailNotificationEnabled: boolean;

  @ApiProperty()
  isProfilePublic: boolean;

  @ApiPropertyOptional()
  emailVerifiedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// Account Age DTO
export class AccountAgeDto {
  @ApiProperty({ description: 'Account age in days' })
  days: number;

  @ApiProperty({ description: 'Account age in months' })
  months: number;

  @ApiProperty({ description: 'Account age in years' })
  years: number;
}

// Post Statistics DTO
export class PostStatsDto {
  @ApiProperty({ description: 'Total number of posts' })
  total: number;

  @ApiProperty({ description: 'Number of published posts' })
  published: number;

  @ApiProperty({ description: 'Number of draft posts' })
  draft: number;

  @ApiProperty({ description: 'Percentage of published posts' })
  publishRate: number;
}

// Engagement Statistics DTO
export class EngagementStatsDto {
  @ApiProperty({ description: 'Total views across all posts' })
  totalViews: number;

  @ApiProperty({ description: 'Total likes across all posts' })
  totalLikes: number;

  @ApiProperty({ description: 'Average views per published post' })
  averageViewsPerPost: number;

  @ApiProperty({ description: 'Average likes per published post' })
  averageLikesPerPost: number;
}

// Social Statistics DTO
export class SocialStatsDto {
  @ApiProperty({ description: 'Number of followers' })
  followers: number;

  @ApiProperty({ description: 'Number of following' })
  following: number;

  @ApiProperty({ description: 'Number of comments made' })
  comments: number;

  @ApiProperty({ description: 'Number of likes given' })
  likes: number;

  @ApiProperty({ description: 'Followers to following ratio' })
  followersToFollowingRatio: number;
}

// Activity Statistics DTO
export class ActivityStatsDto {
  @ApiPropertyOptional({ description: 'Last login timestamp' })
  lastLoginAt?: Date;

  @ApiPropertyOptional({ description: 'Days since last login' })
  daysSinceLastLogin?: number;

  @ApiProperty({ description: 'Whether user is considered active (logged in within 30 days)' })
  isActiveUser: boolean;

  @ApiProperty({ description: 'Total number of recent activities' })
  totalActivities: number;
}

// Profile Completion DTO
export class ProfileCompletionDto {
  @ApiProperty({ description: 'Profile completion percentage (0-100)' })
  percentage: number;

  @ApiProperty({
    type: [String],
    description: 'List of missing profile fields',
    example: ['Website', 'Location', 'Date of Birth']
  })
  missingFields: string[];
}

// User Stats Metadata DTO
export class UserStatsMetadataDto {
  @ApiProperty({ description: 'Profile URL path' })
  profileUrl: string;

  @ApiProperty({ description: 'Posts URL path' })
  postsUrl: string;

  @ApiProperty({ description: 'Whether email is verified' })
  isVerified: boolean;

  @ApiProperty({ description: 'Whether current user can edit this profile' })
  canEdit: boolean;

  @ApiProperty({ description: 'Timestamp when stats were generated' })
  lastUpdated: string;
}

// Complete Statistics DTO
export class UserStatsDto {
  @ApiProperty({ type: PostStatsDto })
  posts: PostStatsDto;

  @ApiProperty({ type: EngagementStatsDto })
  engagement: EngagementStatsDto;

  @ApiProperty({ type: SocialStatsDto })
  social: SocialStatsDto;

  @ApiProperty({ type: ActivityStatsDto })
  activity: ActivityStatsDto;

  @ApiProperty({ type: ProfileCompletionDto })
  profileCompletion: ProfileCompletionDto;
}

// Enhanced User DTO for Stats
export class UserStatsUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional({ description: 'User website URL - NOW INCLUDED!' })
  website?: string;

  @ApiPropertyOptional({ description: 'User location' })
  location?: string;

  @ApiPropertyOptional({ description: 'User date of birth' })
  dateOfBirth?: Date;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @ApiProperty()
  postCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  followingCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  isProfilePublic: boolean;

  @ApiProperty()
  isEmailNotificationEnabled: boolean;

  @ApiPropertyOptional()
  emailVerifiedAt?: Date;

  @ApiPropertyOptional()
  lastLoginAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ description: 'Full name computed from first + last name' })
  fullName: string;

  @ApiProperty({ description: 'Member since date' })
  memberSince: Date;

  @ApiProperty({ type: AccountAgeDto })
  accountAge: AccountAgeDto;
}

// Main User Stats Response DTO
export class UserStatsResponseDto {
  @ApiProperty({ type: UserStatsUserDto })
  user: UserStatsUserDto;

  @ApiProperty({ type: UserStatsDto })
  stats: UserStatsDto;

  @ApiProperty({
    type: [Object],
    description: 'Recent user activities'
  })
  recentActivities: any[];

  @ApiProperty({ type: UserStatsMetadataDto })
  metadata: UserStatsMetadataDto;
}