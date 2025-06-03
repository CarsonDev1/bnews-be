// src/modules/categories/categories.service.ts - FIXED VERSION
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Category, CategoryDocument } from '../../schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { Post, PostDocument, PostStatus } from 'src/schemas/post.schema';

const slug = require('slug');

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const categorySlug = slug(createCategoryDto.name, { lower: true });
    console.log('🔍 Generated slug:', categorySlug);

    // Check if slug already exists
    const existingCategory = await this.categoryModel.findOne({
      slug: categorySlug,
    });
    console.log(
      '🔍 Existing category check:',
      existingCategory ? 'FOUND DUPLICATE' : 'OK',
    );
    if (existingCategory) {
      console.log('❌ Duplicate slug error for:', categorySlug);
      throw new BadRequestException('Category with this name already exists');
    }

    // Validate parent category if provided
    if (createCategoryDto.parentId) {
      const parentCategory = await this.categoryModel.findById(
        createCategoryDto.parentId,
      );
      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const category = new this.categoryModel({
      ...createCategoryDto,
      slug: categorySlug,
    });

    return category.save();
  }

  async findAll(query: QueryCategoryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      parentId,
      isActive,
      includeChildren,
      includePosts,
    } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (parentId !== undefined) {
      filter.parentId =
        parentId === 'null' || parentId === ''
          ? null
          : new Types.ObjectId(parentId);
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    // FIXED: Properly populate children
    let queryBuilder = this.categoryModel
      .find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // FIXED: Always populate children with proper options
    if (includeChildren) {
      queryBuilder = queryBuilder.populate({
        path: 'children',
        match: { isActive: true },
        options: { sort: { order: 1, createdAt: 1 } },
        populate: {
          path: 'children', // Nested children (grandchildren)
          match: { isActive: true },
          options: { sort: { order: 1, createdAt: 1 } },
        },
      });
    }

    const [categories, total] = await Promise.all([
      queryBuilder.exec(),
      this.categoryModel.countDocuments(filter),
    ]);

    // NEW: If includePosts is true, get posts for each category
    let categoriesWithPosts: any = categories;
    if (includePosts) {
      categoriesWithPosts = await Promise.all(
        categories.map(async (category) => {
          const categoryId = (category._id as Types.ObjectId).toString();

          const posts = await this.getCategoryPosts(categoryId, {
            page: 1,
            limit: includePosts === true ? 10 : includePosts, // Allow custom limit
            status: PostStatus.PUBLISHED,
          });

          const categoryObject = category.toObject();
          return {
            ...categoryObject,
            posts: posts.data,
            postsTotal: posts.pagination.total,
            postsPagination: posts.pagination,
          };
        }),
      );
    }

    return {
      data: categoriesWithPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    // FIXED: Properly populate children
    const category = await this.categoryModel
      .findById(id)
      .populate({
        path: 'children',
        match: { isActive: true },
        options: { sort: { order: 1, createdAt: 1 } },
        populate: {
          path: 'children', // Nested children (grandchildren)
          match: { isActive: true },
          options: { sort: { order: 1, createdAt: 1 } },
        },
      })
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async findOneWithPosts(
    id: string,
    query: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      includeChildren?: boolean;
    } = {},
  ) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
      includeChildren = false,
    } = query;

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    // Get category with proper children population
    let categoryQuery = this.categoryModel.findById(id);
    if (includeChildren) {
      categoryQuery = categoryQuery.populate({
        path: 'children',
        match: { isActive: true },
        options: { sort: { order: 1, createdAt: 1 } },
        populate: {
          path: 'children',
          match: { isActive: true },
          options: { sort: { order: 1, createdAt: 1 } },
        },
      });
    }

    const category = await categoryQuery.exec();
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Get posts for this category
    const posts = await this.getCategoryPosts(id, {
      page,
      limit,
      sortBy,
      sortOrder,
    });

    const categoryObject = category.toObject();
    return {
      ...categoryObject,
      posts: posts.data,
      postsPagination: posts.pagination,
    };
  }

  async findBySlugWithPosts(
    slug: string,
    query: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      includeChildren?: boolean;
    } = {},
  ) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
      includeChildren = false,
    } = query;

    // Get category by slug with proper children population
    let categoryQuery = this.categoryModel.findOne({ slug, isActive: true });
    if (includeChildren) {
      categoryQuery = categoryQuery.populate({
        path: 'children',
        match: { isActive: true },
        options: { sort: { order: 1, createdAt: 1 } },
        populate: {
          path: 'children',
          match: { isActive: true },
          options: { sort: { order: 1, createdAt: 1 } },
        },
      });
    }

    const category = await categoryQuery.exec();
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const categoryId = (category._id as Types.ObjectId).toString();

    // Get posts for this category
    const posts = await this.getCategoryPosts(categoryId, {
      page,
      limit,
      sortBy,
      sortOrder,
    });

    const categoryObject = category.toObject();
    return {
      ...categoryObject,
      posts: posts.data,
      postsPagination: posts.pagination,
    };
  }

  async getCategoryPosts(
    categoryId: string,
    query: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      status?: PostStatus;
      includeSubcategories?: boolean;
    } = {},
  ) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
      status = PostStatus.PUBLISHED,
      includeSubcategories = false,
    } = query;

    const skip = (page - 1) * limit;

    // Build category filter
    let categoryFilter: any = { categoryId: new Types.ObjectId(categoryId) };

    // Include subcategories if requested
    if (includeSubcategories) {
      const subcategories = await this.categoryModel
        .find({ parentId: categoryId })
        .select('_id');
      const subcategoryIds = subcategories.map((cat) => cat._id);

      categoryFilter = {
        categoryId: {
          $in: [new Types.ObjectId(categoryId), ...subcategoryIds],
        },
      };
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Add sticky posts to top
    if (sortBy !== 'isSticky') {
      sort.isSticky = -1;
    }

    const [posts, total] = await Promise.all([
      this.postModel
        .find({ ...categoryFilter, status })
        .populate('categoryId', 'name slug')
        .populate('tagIds', 'name slug color')
        .populate('authorId', 'username displayName avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.postModel.countDocuments({ ...categoryFilter, status }),
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

  async findBySlug(slug: string): Promise<Category> {
    // FIXED: Properly populate children
    const category = await this.categoryModel
      .findOne({ slug, isActive: true })
      .populate({
        path: 'children',
        match: { isActive: true },
        options: { sort: { order: 1, createdAt: 1 } },
        populate: {
          path: 'children',
          match: { isActive: true },
          options: { sort: { order: 1, createdAt: 1 } },
        },
      })
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const updateData: any = { ...updateCategoryDto };

    // Generate new slug if name is being updated
    if (updateCategoryDto.name) {
      const newSlug = slug(updateCategoryDto.name, { lower: true });
      const existingCategory = await this.categoryModel.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });

      if (existingCategory) {
        throw new BadRequestException('Category with this name already exists');
      }

      updateData.slug = newSlug;
    }

    // Validate parent category if provided
    if (updateCategoryDto.parentId) {
      const parentCategory = await this.categoryModel.findById(
        updateCategoryDto.parentId,
      );
      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }

      // Prevent circular reference
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }
    }

    // FIXED: Properly populate children after update
    const category = await this.categoryModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate({
        path: 'children',
        match: { isActive: true },
        options: { sort: { order: 1, createdAt: 1 } },
        populate: {
          path: 'children',
          match: { isActive: true },
          options: { sort: { order: 1, createdAt: 1 } },
        },
      })
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    // Check if category has children
    const hasChildren = await this.categoryModel.findOne({ parentId: id });
    if (hasChildren) {
      throw new BadRequestException(
        'Cannot delete category with subcategories',
      );
    }

    // Check if category has posts
    const hasPosts = await this.postModel.findOne({ categoryId: id });
    if (hasPosts) {
      throw new BadRequestException('Cannot delete category with posts');
    }

    const result = await this.categoryModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Category not found');
    }
  }

  // FIXED: Build proper tree structure with children
  async getTree(): Promise<Category[]> {
    console.log('🌳 Building category tree...');

    // Get all categories and populate children
    const allCategories = await this.categoryModel
      .find({ isActive: true })
      .populate({
        path: 'children',
        match: { isActive: true },
        options: { sort: { order: 1, createdAt: 1 } },
        populate: {
          path: 'children',
          match: { isActive: true },
          options: { sort: { order: 1, createdAt: 1 } },
        },
      })
      .sort({ order: 1, createdAt: 1 })
      .exec();

    console.log(`📊 Found ${allCategories.length} categories total`);

    // Filter only root categories (those without parentId)
    const rootCategories = allCategories.filter((cat) => !cat.parentId);

    console.log(`🌿 Found ${rootCategories.length} root categories`);

    // Log tree structure for debugging
    rootCategories.forEach((rootCat: any) => {
      console.log(`📁 Root: ${rootCat.name} (${rootCat._id})`);
      if (rootCat.children && rootCat.children.length > 0) {
        rootCat.children.forEach((child: any) => {
          console.log(
            `  📂 Child: ${child.name} (${child._id}) -> Parent: ${child.parentId}`,
          );
          if (child.children && child.children.length > 0) {
            child.children.forEach((grandchild: any) => {
              console.log(
                `    📄 Grandchild: ${grandchild.name} (${grandchild._id}) -> Parent: ${grandchild.parentId}`,
              );
            });
          }
        });
      }
    });

    return rootCategories;
  }

  async getTreeWithPosts(): Promise<any[]> {
    console.log('🌳📄 Building category tree with posts...');

    // Get tree structure first
    const treeCategories = await this.getTree();

    // Add posts count for each category recursively
    const addPostCounts = async (categories: any[]): Promise<any[]> => {
      return Promise.all(
        categories.map(async (category) => {
          const postsCount = await this.postModel.countDocuments({
            categoryId: category._id,
            status: PostStatus.PUBLISHED,
          });

          const categoryObj = category.toObject();

          // Process children recursively
          if (categoryObj.children && categoryObj.children.length > 0) {
            categoryObj.children = await addPostCounts(categoryObj.children);
          }

          return {
            ...categoryObj,
            actualPostCount: postsCount, // Real-time count
          };
        }),
      );
    };

    const result = await addPostCounts(treeCategories);

    console.log(
      `✅ Tree with posts completed: ${result.length} root categories`,
    );
    return result;
  }

  async incrementPostCount(categoryId: string): Promise<void> {
    await this.categoryModel.findByIdAndUpdate(categoryId, {
      $inc: { postCount: 1 },
    });
  }

  async decrementPostCount(categoryId: string): Promise<void> {
    await this.categoryModel.findByIdAndUpdate(categoryId, {
      $inc: { postCount: -1 },
    });
  }
}
