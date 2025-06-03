// src/modules/categories/categories.controller.ts - FIXED VERSION
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { CategoryPostsQueryDto } from 'src/modules/auth/dto/category-posts-query.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories with optional posts' })
  @ApiQuery({
    name: 'includePosts',
    required: false,
    description: 'Include posts (true for 10 posts, number for custom limit)',
    example: 'true or 5',
  })
  @ApiQuery({
    name: 'includeChildren',
    required: false,
    description: 'Include children categories',
    example: 'true',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  findAll(@Query() query: QueryCategoryDto) {
    // FIXED: Ensure includeChildren is properly passed
    return this.categoriesService.findAll({
      ...query,
      includeChildren: query.includeChildren || false,
    });
  }

  @Get('tree')
  @ApiOperation({
    summary: 'Get category tree structure',
    description: 'Returns hierarchical category tree with children populated',
  })
  @ApiResponse({
    status: 200,
    description: 'Category tree retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          icon: { type: 'string' },
          parentId: { type: 'string', nullable: true },
          order: { type: 'number' },
          isActive: { type: 'boolean' },
          postCount: { type: 'number' },
          children: {
            type: 'array',
            items: { $ref: '#/components/schemas/Category' },
            description: 'Child categories',
          },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' },
        },
      },
    },
  })
  async getTree() {
    console.log('🌳 Controller: Getting category tree...');
    const tree = await this.categoriesService.getTree();
    console.log(
      `✅ Controller: Retrieved tree with ${tree.length} root categories`,
    );
    return tree;
  }

  @Get('tree-with-posts')
  @ApiOperation({
    summary: 'Get category tree with real-time posts count',
    description: 'Returns hierarchical category tree with actual post counts',
  })
  @ApiResponse({
    status: 200,
    description: 'Category tree with posts count retrieved successfully',
  })
  async getTreeWithPosts() {
    console.log('🌳📄 Controller: Getting category tree with posts...');
    const tree = await this.categoriesService.getTreeWithPosts();
    console.log(
      `✅ Controller: Retrieved tree with posts for ${tree.length} root categories`,
    );
    return tree;
  }

  @Get('root')
  @ApiOperation({
    summary: 'Get only root categories (no parent)',
    description: 'Returns only top-level categories without children populated',
  })
  @ApiResponse({
    status: 200,
    description: 'Root categories retrieved successfully',
  })
  async getRootCategories() {
    return this.categoriesService.findAll({
      parentId: 'null', // Only root categories
      includeChildren: true, // Include their children
      page: 1,
      limit: 100, // Get all root categories
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a category by slug' })
  @ApiParam({ name: 'slug', description: 'Category slug' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Get(':id/with-posts')
  @ApiOperation({ summary: 'Get category with its posts' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category with posts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        description: { type: 'string' },
        postCount: { type: 'number' },
        children: {
          type: 'array',
          items: { $ref: '#/components/schemas/Category' },
        },
        posts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              slug: { type: 'string' },
              excerpt: { type: 'string' },
              featuredImage: { type: 'string' },
              authorId: { type: 'object' },
              viewCount: { type: 'number' },
              publishedAt: { type: 'string' },
            },
          },
        },
        postsPagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            pages: { type: 'number' },
          },
        },
      },
    },
  })
  findOneWithPosts(
    @Param('id') id: string,
    @Query() query: CategoryPostsQueryDto,
  ) {
    return this.categoriesService.findOneWithPosts(id, {
      ...query,
      includeChildren: true, // Always include children for this endpoint
    });
  }

  @Get(':id/posts')
  @ApiOperation({ summary: 'Get all posts for a specific category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category posts retrieved successfully',
  })
  getCategoryPosts(
    @Param('id') id: string,
    @Query() query: CategoryPostsQueryDto,
  ) {
    return this.categoriesService.getCategoryPosts(id, query);
  }

  @Get('slug/:slug/with-posts')
  @ApiOperation({ summary: 'Get category by slug with its posts' })
  @ApiParam({ name: 'slug', description: 'Category slug' })
  @ApiResponse({
    status: 200,
    description: 'Category with posts retrieved successfully',
  })
  findBySlugWithPosts(
    @Param('slug') slug: string,
    @Query() query: CategoryPostsQueryDto,
  ) {
    return this.categoriesService.findBySlugWithPosts(slug, {
      ...query,
      includeChildren: true, // Always include children for this endpoint
    });
  }

  // NEW: Get category posts by slug
  @Get('slug/:slug/posts')
  @ApiOperation({ summary: 'Get posts for category by slug' })
  @ApiParam({ name: 'slug', description: 'Category slug' })
  @ApiResponse({
    status: 200,
    description: 'Category posts retrieved successfully',
  })
  async getCategoryPostsBySlug(
    @Param('slug') slug: string,
    @Query() query: CategoryPostsQueryDto,
  ) {
    const category = await this.categoriesService.findBySlug(slug);

    const categoryId =
      (category as any).id || (category as any)._id?.toString();
    return this.categoriesService.getCategoryPosts(categoryId, query);
  }

  @Get(':id/children')
  @ApiOperation({
    summary: 'Get direct children of a category',
    description: 'Returns only direct child categories of the specified parent',
  })
  @ApiParam({ name: 'id', description: 'Parent Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Child categories retrieved successfully',
  })
  async getCategoryChildren(@Param('id') id: string) {
    return this.categoriesService.findAll({
      parentId: id,
      includeChildren: true, // Include grandchildren too
      page: 1,
      limit: 100,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
