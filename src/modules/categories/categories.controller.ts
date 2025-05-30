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
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  findAll(@Query() query: QueryCategoryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get category tree structure' })
  @ApiResponse({
    status: 200,
    description: 'Category tree retrieved successfully',
  })
  getTree() {
    return this.categoriesService.getTree();
  }

  @Get('tree-with-posts')
  @ApiOperation({ summary: 'Get category tree with real-time posts count' })
  @ApiResponse({
    status: 200,
    description: 'Category tree with posts count retrieved successfully',
  })
  getTreeWithPosts() {
    return this.categoriesService.getTreeWithPosts();
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
    return this.categoriesService.findOneWithPosts(id, query);
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
    return this.categoriesService.findBySlugWithPosts(slug, query);
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
