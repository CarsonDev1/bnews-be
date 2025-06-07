// src/modules/users/users.service.ts - UPDATED FOR LOCAL STORAGE
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Post, PostDocument, PostStatus } from '../../schemas/post.schema';
import {
  UserActivity,
  UserActivityDocument,
} from '../../schemas/user-activity.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UploadService } from 'src/modules/upload/upload.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(UserActivity.name)
    private userActivityModel: Model<UserActivityDocument>,
    private uploadService: UploadService,
  ) { }

  async findAll(query: QueryUserDto) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      status,
      isPublic,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    if (search) {
      filter.$text = { $search: search };
    }

    if (role) {
      filter.role = role;
    }

    if (status) {
      filter.status = status;
    }

    if (isPublic !== undefined) {
      filter.isProfilePublic = isPublic;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-password -emailVerificationToken -passwordResetToken')
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<User> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel
      .findById(id)
      .select('-password -emailVerificationToken -passwordResetToken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.userModel
      .findOne({ username, isProfilePublic: true, status: 'active' })
      .select('-password -emailVerificationToken -passwordResetToken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const updateData: any = { ...updateProfileDto };

    if (updateProfileDto.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateProfileDto.dateOfBirth);
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-password -emailVerificationToken -passwordResetToken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateAvatar(userId: string, avatarFile: Buffer): Promise<User> {
    // Get current user to check for existing avatar
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old avatar if exists
    if (user.avatar && user.avatar.includes('/uploads/')) {
      try {
        await this.uploadService.deleteImageByUrl(user.avatar);
      } catch (error) {
        console.warn('Failed to delete old avatar:', error.message);
        // Continue with upload even if deletion fails
      }
    }

    // Upload new avatar
    const uploadResult = await this.uploadService.uploadAvatar(avatarFile);

    // Update user with new avatar URL and file path
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          avatar: uploadResult.url,
          avatarPublicId: uploadResult.filename, // Store filename for future deletion
        },
        { new: true },
      )
      .select('-password -emailVerificationToken -passwordResetToken')
      .exec();

    return updatedUser as User;
  }

  // Updated method to extract filename from local URL
  private extractFilenameFromUrl(url: string): string | null {
    try {
      // For local URLs like: http://localhost:5000/uploads/avatars/filename.webp
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1];
      return filename || null;
    } catch {
      return null;
    }
  }

  async getUserPosts(userId: string, page: number = 1, limit: number = 10) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel
        .find({
          authorId: new Types.ObjectId(userId),
          status: PostStatus.PUBLISHED,
        })
        .populate('categoryId', 'name slug')
        .populate('tagIds', 'name slug color')
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.postModel.countDocuments({
        authorId: new Types.ObjectId(userId),
        status: PostStatus.PUBLISHED,
      }),
    ]);

    return {
      data: posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserActivity(userId: string, page: number = 1, limit: number = 20) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.userActivityModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userActivityModel.countDocuments({
        userId: new Types.ObjectId(userId),
      }),
    ]);

    return {
      data: activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserStats(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user: any = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      totalViews,
      totalLikes,
      recentActivities,
    ] = await Promise.all([
      this.postModel.countDocuments({ authorId: new Types.ObjectId(userId) }),
      this.postModel.countDocuments({
        authorId: new Types.ObjectId(userId),
        status: PostStatus.PUBLISHED,
      }),
      this.postModel.countDocuments({
        authorId: new Types.ObjectId(userId),
        status: PostStatus.DRAFT,
      }),
      this.postModel.aggregate([
        { $match: { authorId: new Types.ObjectId(userId) } },
        { $group: { _id: null, totalViews: { $sum: '$viewCount' } } },
      ]),
      this.postModel.aggregate([
        { $match: { authorId: new Types.ObjectId(userId) } },
        { $group: { _id: null, totalLikes: { $sum: '$likeCount' } } },
      ]),
      this.userActivityModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(5)
        .exec(),
    ]);

    // Calculate account age
    const accountCreatedAt = new Date(user.createdAt);
    const now = new Date();
    const ageInMs = now.getTime() - accountCreatedAt.getTime();
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    const ageInMonths = Math.floor(ageInDays / 30);
    const ageInYears = Math.floor(ageInDays / 365);

    // Calculate days since last login
    const daysSinceLastLogin = user.lastLoginAt
      ? Math.floor((now.getTime() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Check if user is active (logged in within 30 days)
    const isActiveUser = user.lastLoginAt
      ? (now.getTime() - new Date(user.lastLoginAt).getTime()) < (30 * 24 * 60 * 60 * 1000)
      : false;

    // Calculate profile completion
    const profileCompletion = this.calculateProfileCompletion(user);
    const missingFields = this.getMissingProfileFields(user);

    // ENHANCED: Include all user profile information
    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName || user.username,
        avatar: user.avatar,
        bio: user.bio,
        website: user.website, // ← ADDED: Website field
        location: user.location, // ← ADDED: Location field
        dateOfBirth: user.dateOfBirth, // ← ADDED: Date of birth
        role: user.role, // ← ADDED: User role
        status: user.status, // ← ADDED: User status
        postCount: user.postCount,
        commentCount: user.commentCount, // ← ADDED: Comment count
        followerCount: user.followerCount,
        followingCount: user.followingCount,
        likeCount: user.likeCount, // ← ADDED: Like count
        isProfilePublic: user.isProfilePublic, // ← ADDED: Profile visibility
        isEmailNotificationEnabled: user.isEmailNotificationEnabled, // ← ADDED: Email settings
        emailVerifiedAt: user.emailVerifiedAt, // ← ADDED: Email verification status
        lastLoginAt: user.lastLoginAt, // ← ADDED: Last login
        createdAt: user.createdAt,
        updatedAt: user.updatedAt, // ← ADDED: Last update
        // Computed fields
        fullName: user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.displayName || user.username,
        memberSince: user.createdAt,
        accountAge: {
          days: ageInDays,
          months: ageInMonths,
          years: ageInYears,
        },
      },
      stats: {
        posts: {
          total: totalPosts,
          published: publishedPosts,
          draft: draftPosts,
          publishRate: totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0, // ← ADDED: Publish rate percentage
        },
        engagement: {
          totalViews: totalViews[0]?.totalViews || 0,
          totalLikes: totalLikes[0]?.totalLikes || 0,
          averageViewsPerPost: publishedPosts > 0 ? Math.round((totalViews[0]?.totalViews || 0) / publishedPosts) : 0, // ← ADDED: Average views
          averageLikesPerPost: publishedPosts > 0 ? Math.round((totalLikes[0]?.totalLikes || 0) / publishedPosts) : 0, // ← ADDED: Average likes
        },
        // NEW: Social stats
        social: {
          followers: user.followerCount,
          following: user.followingCount,
          comments: user.commentCount,
          likes: user.likeCount,
          followersToFollowingRatio: user.followingCount > 0 ? Math.round((user.followerCount / user.followingCount) * 100) / 100 : 0,
        },
        // NEW: Activity stats
        activity: {
          lastLoginAt: user.lastLoginAt,
          daysSinceLastLogin,
          isActiveUser,
          totalActivities: recentActivities.length,
        },
        // NEW: Profile completion
        profileCompletion: {
          percentage: profileCompletion,
          missingFields,
        },
      },
      recentActivities,
      // NEW: Additional metadata
      metadata: {
        profileUrl: `/users/username/${user.username}`,
        postsUrl: `/users/username/${user.username}/posts`,
        isVerified: !!user.emailVerifiedAt,
        canEdit: false, // Will be set to true if requesting user is the profile owner
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  // NEW: Helper method to calculate profile completion percentage
  private calculateProfileCompletion(user: any): number {
    const fields = [
      'firstName',
      'lastName',
      'displayName',
      'bio',
      'avatar',
      'website',
      'location',
      'dateOfBirth'
    ];

    const completedFields = fields.filter(field =>
      user[field] && user[field].toString().trim().length > 0
    ).length;

    return Math.round((completedFields / fields.length) * 100);
  }
  private getMissingProfileFields(user: any): string[] {
    const fields = [
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'displayName', label: 'Display Name' },
      { key: 'bio', label: 'Bio' },
      { key: 'avatar', label: 'Profile Picture' },
      { key: 'website', label: 'Website' },
      { key: 'location', label: 'Location' },
      { key: 'dateOfBirth', label: 'Date of Birth' }
    ];

    return fields
      .filter(field => !user[field.key] || user[field.key].toString().trim().length === 0)
      .map(field => field.label);
  }

  async getTopUsers(limit: number = 10) {
    return this.userModel
      .find({
        status: 'active',
        isProfilePublic: true,
        postCount: { $gt: 0 },
      })
      .select(
        'username displayName avatar bio postCount followerCount createdAt',
      )
      .sort({ postCount: -1, followerCount: -1 })
      .limit(limit)
      .exec();
  }

  async incrementPostCount(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { $inc: { postCount: 1 } });
  }

  async decrementPostCount(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { $inc: { postCount: -1 } });
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete user's avatar if exists
    if (user.avatar && user.avatar.includes('/uploads/')) {
      try {
        await this.uploadService.deleteImageByUrl(user.avatar);
      } catch (error) {
        console.warn('Failed to delete user avatar during removal:', error.message);
      }
    }

    // In production, you might want to soft delete or anonymize instead
    // For now, we'll just delete the user
    await this.userModel.findByIdAndDelete(id);
  }
}