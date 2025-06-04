// src/modules/tags/tags.service.ts - UPDATED WITH IMAGE SUPPORT
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tag, TagDocument } from '../../schemas/tag.schema';
import { CreateTagDto } from './dto/create-tag.dto';
import { Post, PostDocument } from '../../schemas/post.schema';
import { UpdateTagDto } from './dto/update-tag.dto';
import { QueryTagDto } from './dto/query-tag.dto';
import { PostStatus } from 'src/schemas/post.schema';
import { UploadService } from '../upload/upload.service'; // NEW
const slug = require('slug');


@Injectable()
export class TagsService {
  constructor(
    @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private uploadService: UploadService, // NEW
  ) { }

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const tagSlug = slug(createTagDto.name, { lower: true });

    // Check if slug already exists
    const existingTag = await this.tagModel.findOne({ slug: tagSlug });
    if (existingTag) {
      throw new BadRequestException('Tag with this name already exists');
    }

    const tag = new this.tagModel({
      ...createTagDto,
      slug: tagSlug,
    });

    return tag.save();
  }

  // NEW: Update tag with image
  async updateTagImage(tagId: string, imageBuffer: Buffer): Promise<Tag> {
    if (!Types.ObjectId.isValid(tagId)) {
      throw new BadRequestException('Invalid tag ID');
    }

    const tag = await this.tagModel.findById(tagId);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Delete old image if exists
    if (tag.image && tag.image.includes('/uploads/')) {
      try {
        await this.uploadService.deleteImageByUrl(tag.image);
      } catch (error) {
        console.warn('Failed to delete old tag image:', error.message);
      }
    }

    // Upload new image
    const uploadResult = await this.uploadService.uploadTagImage(imageBuffer);

    // Update tag with new image URL and filename
    const updatedTag = await this.tagModel
      .findByIdAndUpdate(
        tagId,
        {
          image: uploadResult.url,
          imagePublicId: uploadResult.filename,
        },
        { new: true },
      )
      .exec();

    return updatedTag as Tag;
  }

  // NEW: Remove tag image
  async removeTagImage(tagId: string): Promise<Tag> {
    if (!Types.ObjectId.isValid(tagId)) {
      throw new BadRequestException('Invalid tag ID');
    }

    const tag = await this.tagModel.findById(tagId);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Delete image file if exists
    if (tag.image && tag.image.includes('/uploads/')) {
      try {
        await this.uploadService.deleteImageByUrl(tag.image);
      } catch (error) {
        console.warn('Failed to delete tag image:', error.message);
      }
    }

    // Remove image from tag
    const updatedTag = await this.tagModel
      .findByIdAndUpdate(
        tagId,
        {
          $unset: { image: 1, imagePublicId: 1 },
        },
        { new: true },
      )
      .exec();

    return updatedTag as Tag;
  }

  async findAll(query: QueryTagDto) {
    const { page = 1, limit = 10, search, isActive, includePosts } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const [tags, total] = await Promise.all([
      this.tagModel
        .find(filter)
        .sort({ postCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.tagModel.countDocuments(filter),
    ]);

    let tagsWithPosts: any = tags;
    if (includePosts) {
      tagsWithPosts = await Promise.all(
        tags.map(async (tag) => {
          const tagId = (tag._id as Types.ObjectId).toString();

          const posts = await this.getTagPosts(tagId, {
            page: 1,
            limit: typeof includePosts === 'number' ? includePosts : 10,
            status: PostStatus.PUBLISHED,
          });

          return {
            ...tag.toObject(),
            posts: posts.data,
            postsTotal: posts.pagination.total,
            postsPagination: posts.pagination,
          };
        }),
      );
    }

    return {
      data: tagsWithPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Tag> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid tag ID');
    }

    const tag = await this.tagModel.findById(id).exec();

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  async findOneWithPosts(
    id: string,
    query: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = query;

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid tag ID');
    }

    // Get tag
    const tag = await this.tagModel.findById(id).exec();
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Get posts for this tag
    const posts = await this.getTagPosts(id, {
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return {
      ...tag.toObject(),
      posts: posts.data,
      postsPagination: posts.pagination,
    };
  }

  async findBySlug(slug: string): Promise<Tag> {
    const tag = await this.tagModel.findOne({ slug, isActive: true }).exec();

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  async findBySlugWithPosts(
    slugParam: string,
    query: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = query;

    // Get tag by slug
    const tag = await this.tagModel
      .findOne({ slug: slugParam, isActive: true })
      .exec();
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    const tagId = (tag._id as Types.ObjectId).toString();

    // Get posts for this tag
    const posts = await this.getTagPosts(tagId, {
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return {
      ...tag.toObject(),
      posts: posts.data,
      postsPagination: posts.pagination,
    };
  }

  async getTagPosts(
    tagId: string,
    query: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      status?: PostStatus;
    } = {},
  ) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
      status = PostStatus.PUBLISHED,
    } = query;

    const skip = (page - 1) * limit;

    // Build filter - posts that contain this tag
    const filter: any = {
      tagIds: new Types.ObjectId(tagId),
      status,
    };

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Add sticky posts to top
    if (sortBy !== 'isSticky') {
      sort.isSticky = -1;
    }

    const [posts, total] = await Promise.all([
      this.postModel
        .find(filter)
        .populate('categoryId', 'name slug')
        .populate('tagIds', 'name slug color image') // NEW: Include image
        .populate('authorId', 'username displayName avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.postModel.countDocuments(filter),
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

  async getTagPostsBySlug(
    slugParam: string,
    query: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      status?: PostStatus;
    } = {},
  ): Promise<any> {
    // Find tag by slug first
    const tag = await this.tagModel
      .findOne({ slug: slugParam, isActive: true })
      .exec();

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Use the tag's ObjectId directly
    return this.getTagPosts((tag._id as Types.ObjectId).toString(), query);
  }

  async update(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid tag ID');
    }

    const updateData: any = { ...updateTagDto };

    // Generate new slug if name is being updated
    if (updateTagDto.name) {
      const newSlug = slug(updateTagDto.name, { lower: true });
      const existingTag = await this.tagModel.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });

      if (existingTag) {
        throw new BadRequestException('Tag with this name already exists');
      }

      updateData.slug = newSlug;
    }

    const tag = await this.tagModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid tag ID');
    }

    const tag = await this.tagModel.findById(id);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Check if tag has posts
    const hasPosts = await this.postModel.findOne({ tagIds: id });
    if (hasPosts) {
      throw new BadRequestException(
        'Cannot delete tag with posts. Remove tag from posts first.',
      );
    }

    // Delete tag image if exists
    if (tag.image && tag.image.includes('/uploads/')) {
      try {
        await this.uploadService.deleteImageByUrl(tag.image);
      } catch (error) {
        console.warn('Failed to delete tag image during removal:', error.message);
      }
    }

    await this.tagModel.findByIdAndDelete(id);
  }

  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    return this.tagModel
      .find({ isActive: true, postCount: { $gt: 0 } })
      .sort({ postCount: -1 })
      .limit(limit)
      .exec();
  }

  async getPopularTagsWithPosts(
    limit: number = 10,
    postsLimit: number = 5,
  ): Promise<any[]> {
    const popularTags = await this.tagModel
      .find({ isActive: true, postCount: { $gt: 0 } })
      .sort({ postCount: -1 })
      .limit(limit)
      .exec();

    // Get posts for each popular tag
    const tagsWithPosts = await Promise.all(
      popularTags.map(async (tag) => {
        const tagId = (tag._id as Types.ObjectId).toString();

        const posts = await this.getTagPosts(tagId, {
          page: 1,
          limit: postsLimit,
          status: PostStatus.PUBLISHED,
        });

        return {
          ...tag.toObject(),
          posts: posts.data,
          postsTotal: posts.pagination.total,
        };
      }),
    );

    return tagsWithPosts;
  }

  async getAllTagsWithPostCounts(): Promise<any[]> {
    const tags = await this.tagModel
      .find({ isActive: true })
      .sort({ postCount: -1, createdAt: -1 })
      .exec();

    // Get real-time posts count for each tag
    const tagsWithRealCounts = await Promise.all(
      tags.map(async (tag) => {
        const realPostCount = await this.postModel.countDocuments({
          tagIds: tag._id,
          status: PostStatus.PUBLISHED,
        });

        return {
          ...tag.toObject(),
          actualPostCount: realPostCount, // Real-time count
          storedPostCount: tag.postCount, // Stored count for comparison
        };
      }),
    );

    return tagsWithRealCounts;
  }

  async incrementPostCount(tagId: string): Promise<void> {
    await this.tagModel.findByIdAndUpdate(tagId, { $inc: { postCount: 1 } });
  }

  async decrementPostCount(tagId: string): Promise<void> {
    await this.tagModel.findByIdAndUpdate(tagId, { $inc: { postCount: -1 } });
  }
} 