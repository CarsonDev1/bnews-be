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

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(UserActivity.name)
    private userActivityModel: Model<UserActivityDocument>,
  ) {}

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

    const user = await this.userModel.findById(userId);
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

    return {
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar,
        bio: user.bio,
        postCount: user.postCount,
        followerCount: user.followerCount,
        followingCount: user.followingCount,
        createdAt: user.createdAt,
      },
      stats: {
        posts: {
          total: totalPosts,
          published: publishedPosts,
          draft: draftPosts,
        },
        engagement: {
          totalViews: totalViews[0]?.totalViews || 0,
          totalLikes: totalLikes[0]?.totalLikes || 0,
        },
      },
      recentActivities,
    };
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

    // In production, you might want to soft delete or anonymize instead
    // For now, we'll just delete the user
    await this.userModel.findByIdAndDelete(id);
  }
}
