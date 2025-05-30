import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as slug from 'slug';
import { Post, PostDocument, PostStatus } from '../../schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import { CategoriesService } from '../categories/categories.service';
import { TagsService } from '../tags/tags.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private categoriesService: CategoriesService,
    private tagsService: TagsService,
    private usersService: UsersService,
  ) {}

  async create(createPostDto: CreatePostDto, authorId: string): Promise<Post> {
    const postSlug = slug(createPostDto.title, { lower: true });

    // Check if slug already exists
    let finalSlug = postSlug;
    let counter = 1;
    while (await this.postModel.findOne({ slug: finalSlug })) {
      finalSlug = `${postSlug}-${counter}`;
      counter++;
    }

    // Validate category exists
    await this.categoriesService.findOne(createPostDto.categoryId);

    // Validate tags exist
    if (createPostDto.tagIds && createPostDto.tagIds.length > 0) {
      for (const tagId of createPostDto.tagIds) {
        await this.tagsService.findOne(tagId);
      }
    }

    const postData = {
      ...createPostDto,
      slug: finalSlug,
      authorId: new Types.ObjectId(authorId), // Set author from JWT
      publishedAt: createPostDto.publishedAt
        ? new Date(createPostDto.publishedAt)
        : createPostDto.status === PostStatus.PUBLISHED
          ? new Date()
          : undefined,
      categoryId: new Types.ObjectId(createPostDto.categoryId),
      tagIds: createPostDto.tagIds?.map((id) => new Types.ObjectId(id)) || [],
    };

    const post = new this.postModel(postData);
    const savedPost = await post.save();

    // Update category post count
    await this.categoriesService.incrementPostCount(createPostDto.categoryId);

    // Update tag post counts
    if (createPostDto.tagIds && createPostDto.tagIds.length > 0) {
      for (const tagId of createPostDto.tagIds) {
        await this.tagsService.incrementPostCount(tagId);
      }
    }

    // Update user post count
    await this.usersService.incrementPostCount(authorId);

    return savedPost.populate([
      { path: 'categoryId', select: 'name slug' },
      { path: 'tagIds', select: 'name slug color' },
      { path: 'authorId', select: 'username displayName avatar' },
    ]);
  }

  async findAll(query: QueryPostDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      tagId,
      status = PostStatus.PUBLISHED,
      isFeatured,
      isSticky,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
      authorId,
    } = query;

    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { status };

    if (search) {
      filter.$text = { $search: search };
    }

    if (categoryId) {
      filter.categoryId = new Types.ObjectId(categoryId);
    }

    if (tagId) {
      filter.tagIds = new Types.ObjectId(tagId);
    }

    if (authorId) {
      filter.authorId = new Types.ObjectId(authorId);
    }

    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured;
    }

    if (isSticky !== undefined) {
      filter.isSticky = isSticky;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Add sticky posts to top if not specifically sorting by sticky
    if (sortBy !== 'isSticky') {
      sort.isSticky = -1;
    }

    const [data, total] = await Promise.all([
      this.postModel
        .find(filter)
        .populate({
          path: 'categoryId',
          select: 'name slug description icon',
        })
        .populate({
          path: 'tagIds',
          select: 'name slug color description',
          match: { isActive: true },
        })
        .populate({
          path: 'authorId',
          select: 'username displayName avatar',
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(false)
        .exec(),
      this.postModel.countDocuments(filter),
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

  async findOne(id: string): Promise<Post> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel
      .findById(id)
      .populate({
        path: 'categoryId',
        select: 'name slug description icon',
      })
      .populate({
        path: 'tagIds',
        select: 'name slug color description',
        match: { isActive: true },
      })
      .populate({
        path: 'authorId',
        select: 'username displayName avatar bio website location',
      })
      .lean(false)
      .exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async findBySlug(slug: string): Promise<Post> {
    console.log('🔍 Finding post by slug:', slug);

    const post = await this.postModel
      .findOne({ slug, status: PostStatus.PUBLISHED })
      .populate({
        path: 'categoryId',
        select: 'name slug description icon',
      })
      .populate({
        path: 'tagIds',
        select: 'name slug color description', // FIX: Explicit field selection
        match: { isActive: true }, // Only populate active tags
      })
      .populate({
        path: 'authorId',
        select: 'username displayName avatar bio website location',
      })
      .lean(false) // Don't use lean to preserve populate
      .exec();

    console.log('🔍 Raw post query result:', post);
    console.log('🔍 Post tagIds after populate:', post?.tagIds);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Increment view count
    await this.postModel.findByIdAndUpdate(post._id, {
      $inc: { viewCount: 1 },
    });

    console.log('🔍 Final post object:', JSON.stringify(post, null, 2));

    return post;
  }

  async update(
    id: string,
    updatePostDto: UpdatePostDto,
    userId: string,
  ): Promise<Post> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const existingPost = await this.postModel.findById(id);
    if (!existingPost) {
      throw new NotFoundException('Post not found');
    }

    // Check if user is the author (or admin - you can add admin check later)
    if (existingPost.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    const updateData: any = { ...updatePostDto };

    // Generate new slug if title is being updated
    if (updatePostDto.title) {
      const newSlug = slug(updatePostDto.title, { lower: true });
      let finalSlug = newSlug;
      let counter = 1;

      while (
        await this.postModel.findOne({ slug: finalSlug, _id: { $ne: id } })
      ) {
        finalSlug = `${newSlug}-${counter}`;
        counter++;
      }

      updateData.slug = finalSlug;
    }

    // Handle category change
    if (
      updatePostDto.categoryId &&
      updatePostDto.categoryId !== existingPost.categoryId.toString()
    ) {
      await this.categoriesService.findOne(updatePostDto.categoryId);
      await this.categoriesService.decrementPostCount(
        existingPost.categoryId.toString(),
      );
      await this.categoriesService.incrementPostCount(updatePostDto.categoryId);
      updateData.categoryId = new Types.ObjectId(updatePostDto.categoryId);
    }

    // Handle tags change
    if (updatePostDto.tagIds) {
      // Validate new tags
      for (const tagId of updatePostDto.tagIds) {
        await this.tagsService.findOne(tagId);
      }

      // Update tag post counts
      const oldTagIds = existingPost.tagIds.map((id) => id.toString());
      const newTagIds = updatePostDto.tagIds;

      // Decrement old tags
      for (const tagId of oldTagIds) {
        if (!newTagIds.includes(tagId)) {
          await this.tagsService.decrementPostCount(tagId);
        }
      }

      // Increment new tags
      for (const tagId of newTagIds) {
        if (!oldTagIds.includes(tagId)) {
          await this.tagsService.incrementPostCount(tagId);
        }
      }

      updateData.tagIds = newTagIds.map((id) => new Types.ObjectId(id));
    }

    // Handle publish date
    if (
      updatePostDto.status === PostStatus.PUBLISHED &&
      !existingPost.publishedAt
    ) {
      updateData.publishedAt = new Date();
    }

    if (updatePostDto.publishedAt) {
      updateData.publishedAt = new Date(updatePostDto.publishedAt);
    }

    const post = await this.postModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('categoryId', 'name slug')
      .populate('tagIds', 'name slug color')
      .populate('authorId', 'username displayName avatar')
      .exec();

    return post as Post;
  }

  async remove(id: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel.findById(id);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if user is the author (or admin)
    if (post.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Update category post count
    await this.categoriesService.decrementPostCount(post.categoryId.toString());

    // Update tag post counts
    for (const tagId of post.tagIds) {
      await this.tagsService.decrementPostCount(tagId.toString());
    }

    // Update user post count
    await this.usersService.decrementPostCount(post.authorId.toString());

    await this.postModel.findByIdAndDelete(id);
  }

  async getFeatured(limit: number = 5): Promise<Post[]> {
    return this.postModel
      .find({
        status: PostStatus.PUBLISHED,
        isFeatured: true,
      })
      .populate({
        path: 'categoryId',
        select: 'name slug',
      })
      .populate({
        path: 'tagIds',
        select: 'name slug color',
        match: { isActive: true },
      })
      .populate({
        path: 'authorId',
        select: 'username displayName avatar',
      })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean(false)
      .exec();
  }

  async getPopular(limit: number = 5): Promise<Post[]> {
    return this.postModel
      .find({ status: PostStatus.PUBLISHED })
      .populate({
        path: 'categoryId',
        select: 'name slug',
      })
      .populate({
        path: 'tagIds',
        select: 'name slug color',
        match: { isActive: true },
      })
      .populate({
        path: 'authorId',
        select: 'username displayName avatar',
      })
      .sort({ viewCount: -1, publishedAt: -1 })
      .limit(limit)
      .lean(false)
      .exec();
  }

  async getLatest(limit: number = 5): Promise<Post[]> {
    return this.postModel
      .find({ status: PostStatus.PUBLISHED })
      .populate({
        path: 'categoryId',
        select: 'name slug',
      })
      .populate({
        path: 'tagIds',
        select: 'name slug color',
        match: { isActive: true },
      })
      .populate({
        path: 'authorId',
        select: 'username displayName avatar',
      })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean(false)
      .exec();
  }

  async getRelated(postId: string, limit: number = 5): Promise<Post[]> {
    const post = await this.postModel.findById(postId);
    if (!post) {
      return [];
    }

    return this.postModel
      .find({
        _id: { $ne: postId },
        status: PostStatus.PUBLISHED,
        $or: [
          { categoryId: post.categoryId },
          { tagIds: { $in: post.tagIds } },
        ],
      })
      .populate({
        path: 'categoryId',
        select: 'name slug',
      })
      .populate({
        path: 'tagIds',
        select: 'name slug color',
        match: { isActive: true },
      })
      .populate({
        path: 'authorId',
        select: 'username displayName avatar',
      })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean(false)
      .exec();
  }
}
