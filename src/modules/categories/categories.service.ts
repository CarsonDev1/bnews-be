// src/modules/categories/categories.service.ts - COMPLETE FIXED VERSION
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
    console.log('🔍 Creating category with slug:', categorySlug);

    // Check if slug already exists
    const existingCategory = await this.categoryModel.findOne({
      slug: categorySlug,
    });
    
    if (existingCategory) {
      console.log('❌ Duplicate slug error for:', categorySlug);
      throw new BadRequestException('Category with this name already exists');
    }

    // CRITICAL: Validate and convert parentId properly
    let processedParentId: Types.ObjectId | null = null;
    
    if (createCategoryDto.parentId) {
      console.log('🔍 Processing parentId:', createCategoryDto.parentId);
      
      // Validate parentId format
      if (!Types.ObjectId.isValid(createCategoryDto.parentId)) {
        throw new BadRequestException('Invalid parent category ID format');
      }

      // Convert to ObjectId
      processedParentId = new Types.ObjectId(createCategoryDto.parentId);
      console.log('✅ Converted parentId:', processedParentId);

      // Validate parent category exists
      const parentCategory = await this.categoryModel.findById(processedParentId);
      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }
      
      console.log('✅ Parent category found:', parentCategory.name);

      // Prevent creating circular relationships
      if (parentCategory.parentId?.toString() === processedParentId.toString()) {
        throw new BadRequestException('Cannot create circular category relationship');
      }
    }

    // Create category with properly typed parentId
    const categoryData = {
      ...createCategoryDto,
      slug: categorySlug,
      parentId: processedParentId, // This will be ObjectId or null
    };

    console.log('📝 Category data to save:', {
      name: categoryData.name,
      slug: categoryData.slug,
      parentId: categoryData.parentId,
      parentIdType: typeof categoryData.parentId,
    });

    const category = new this.categoryModel(categoryData);
    const savedCategory = await category.save();

    // FIX: Properly type the savedCategory._id
    const savedCategoryId = (savedCategory._id as Types.ObjectId).toString();

    console.log('✅ Category saved successfully:', {
      id: savedCategoryId,
      name: savedCategory.name,
      parentId: savedCategory.parentId,
      parentIdType: typeof savedCategory.parentId,
    });

    // IMPORTANT: Return with populated children for immediate verification
    return this.findOne(savedCategoryId);
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

    console.log('🔍 FindAll query:', { parentId, includeChildren });

    // Build filter
    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // CRITICAL: Handle parentId filtering properly
    if (parentId !== undefined) {
      if (parentId === 'null' || parentId === '' || parentId === null) {
        filter.parentId = null;
        console.log('🔍 Filtering for root categories (parentId = null)');
      } else {
        if (!Types.ObjectId.isValid(parentId)) {
          throw new BadRequestException('Invalid parentId format');
        }
        filter.parentId = new Types.ObjectId(parentId);
        console.log('🔍 Filtering for children of:', parentId);
      }
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    console.log('🔍 Final filter:', filter);

    // Build query with proper population
    let queryBuilder = this.categoryModel
      .find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // CRITICAL: Always populate children when requested
    if (includeChildren) {
      console.log('🔍 Including children in query');
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

    console.log(`✅ Found ${categories.length} categories`);

    // FIX: TypeScript safe debug logging
    categories.forEach((category) => {
      console.log(`📁 Category: ${category.name} (ID: ${category._id})`);
      console.log(`   Parent: ${category.parentId || 'None'}`);
      console.log(`   Children: ${category.children?.length || 0}`);
      if (category.children && category.children.length > 0) {
        category.children.forEach((child: any) => {
          console.log(`     - ${child.name} (ID: ${child._id})`);
        });
      }
    });

    // Handle posts inclusion
    let categoriesWithPosts: any = categories;
    if (includePosts) {
      categoriesWithPosts = await Promise.all(
        categories.map(async (category) => {
          const categoryId = (category._id as Types.ObjectId).toString();

          const posts = await this.getCategoryPosts(categoryId, {
            page: 1,
            limit: includePosts === true ? 10 : includePosts,
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

    console.log('🔍 Finding category by ID:', id);

    // CRITICAL: Always populate children for single category lookup
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

    console.log('✅ Category found:', {
      id: category._id,
      name: category.name,
      parentId: category.parentId,
      childrenCount: category.children?.length || 0,
    });

    return category;
  }

  // NEW: Find one category with posts
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

  // NEW: Find category by slug with posts
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

  // NEW: Method to manually refresh parent-child relationships
  async refreshCategoryRelationships(): Promise<void> {
    console.log('🔄 Refreshing category relationships...');
    
    const allCategories = await this.categoryModel.find({}).exec();
    
    for (const category of allCategories) {
      console.log(`📁 Category: ${category.name}`);
      console.log(`   ID: ${category._id}`);
      console.log(`   ParentId: ${category.parentId}`);
      console.log(`   ParentId Type: ${typeof category.parentId}`);
      
      if (category.parentId) {
        const parent = await this.categoryModel.findById(category.parentId);
        console.log(`   Parent exists: ${!!parent}`);
        if (parent) {
          console.log(`   Parent name: ${parent.name}`);
        }
      }
      
      const children = await this.categoryModel.find({ parentId: category._id });
      console.log(`   Children count: ${children.length}`);
      children.forEach(child => {
        console.log(`     - ${child.name} (${child._id})`);
      });
      console.log('---');
    }
  }

  // NEW: Debug method to check specific parent-child relationship
  async debugParentChild(parentId: string): Promise<any> {
    console.log('🔍 Debug parent-child relationship for:', parentId);
    
    const parent = await this.categoryModel.findById(parentId).populate('children');
    console.log('Parent category:', parent?.name);
    console.log('Parent children from virtual:', parent?.children?.length || 0);
    
    const directChildren = await this.categoryModel.find({ parentId: new Types.ObjectId(parentId) });
    console.log('Direct children from query:', directChildren.length);
    
    return {
      parent: parent?.name,
      virtualChildren: parent?.children?.length || 0,
      directChildren: directChildren.length,
      childrenNames: directChildren.map(c => c.name)
    };
  }

  async getTree(): Promise<Category[]> {
    console.log('🌳 Building category tree...');

    // Get all active categories with children populated
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

    // Debug tree structure
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

  // NEW: Get tree with posts count
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

  async findBySlug(slug: string): Promise<Category> {
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

    // Handle parentId update
    if (updateCategoryDto.parentId !== undefined) {
      if (updateCategoryDto.parentId) {
        if (!Types.ObjectId.isValid(updateCategoryDto.parentId)) {
          throw new BadRequestException('Invalid parent category ID format');
        }

        const parentCategory = await this.categoryModel.findById(updateCategoryDto.parentId);
        if (!parentCategory) {
          throw new NotFoundException('Parent category not found');
        }

        // Prevent circular reference
        if (updateCategoryDto.parentId === id) {
          throw new BadRequestException('Category cannot be its own parent');
        }

        updateData.parentId = new Types.ObjectId(updateCategoryDto.parentId);
      } else {
        updateData.parentId = null;
      }
    }

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

    let categoryFilter: any = { categoryId: new Types.ObjectId(categoryId) };

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

    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

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