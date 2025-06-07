// src/modules/posts/posts.controller.ts - ENHANCED WITH SLUG VALIDATION
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
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post with manual slug' })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        slug: { type: 'string', example: 'my-awesome-post' },
        content: { type: 'string' },
        status: { type: 'string' },
        categoryId: { type: 'object' },
        authorId: { type: 'object' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid slug format or slug already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Slug already exists. Please choose a different slug.'
        },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createPostDto: CreatePostDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.postsService.create(createPostDto, userId);
  }

  // NEW: Endpoint to check if slug is available
  @Get('check-slug/:slug')
  @ApiOperation({
    summary: 'Check if slug is available',
    description: 'Check if a slug is available for use before creating/updating a post'
  })
  @ApiParam({
    name: 'slug',
    description: 'Slug to check availability',
    example: 'my-awesome-post'
  })
  @ApiResponse({
    status: 200,
    description: 'Slug availability status',
    schema: {
      type: 'object',
      properties: {
        slug: { type: 'string', example: 'my-awesome-post' },
        available: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Slug is available' },
        suggestions: {
          type: 'array',
          items: { type: 'string' },
          example: ['my-awesome-post-1', 'my-awesome-post-2024'],
          description: 'Alternative slug suggestions if not available'
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid slug format',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid slug format' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  async checkSlugAvailability(@Param('slug') slug: string) {
    return this.postsService.checkSlugAvailability(slug);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all posts with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Posts retrieved successfully' })
  findAll(@Query() query: QueryPostDto) {
    return this.postsService.findAll(query);
  }

  @Get('by-product/:productKey')
  @ApiOperation({ summary: 'Get posts mentioning a specific product' })
  @ApiParam({ name: 'productKey', description: 'Product URL key' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Posts with product retrieved successfully',
  })
  getPostsByProduct(
    @Param('productKey') productKey: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.postsService.getPostsByProduct(
      productKey,
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get('popular-products')
  @ApiOperation({ summary: 'Get popular products mentioned in posts' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of products to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Popular products retrieved successfully',
  })
  getPopularProducts(@Query('limit') limit?: number) {
    return this.postsService.getPopularProductsInPosts(
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user posts' })
  @ApiResponse({
    status: 200,
    description: 'User posts retrieved successfully',
  })
  getMyPosts(@Query() query: QueryPostDto, @CurrentUser('id') userId: string) {
    const userQuery = { ...query, authorId: userId };
    return this.postsService.findAll(userQuery);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured posts' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of posts to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Featured posts retrieved successfully',
  })
  getFeatured(@Query('limit') limit?: number) {
    return this.postsService.getFeatured(
      limit ? parseInt(limit.toString()) : 5,
    );
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular posts' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of posts to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Popular posts retrieved successfully',
  })
  getPopular(@Query('limit') limit?: number) {
    return this.postsService.getPopular(limit ? parseInt(limit.toString()) : 5);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest posts' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of posts to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Latest posts retrieved successfully',
  })
  getLatest(@Query('limit') limit?: number) {
    return this.postsService.getLatest(limit ? parseInt(limit.toString()) : 5);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Get('slug/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get a post by slug',
    description: 'Retrieve a post using its URL-friendly slug. Slug must be 3-100 characters long.'
  })
  @ApiParam({
    name: 'slug',
    description: 'Post slug (3-100 characters, lowercase letters, numbers, and hyphens only)',
    example: 'my-awesome-post'
  })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        slug: { type: 'string' },
        content: { type: 'string' },
        excerpt: { type: 'string' },
        featuredImage: { type: 'string' },
        viewCount: { type: 'number' },
        categoryId: { type: 'object' },
        authorId: { type: 'object' },
        tagIds: { type: 'array' },
        publishedAt: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid slug format or length',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid slug: too long (max 100 characters)' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Post with slug "very-long-slug" not found' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  findBySlug(@Param('slug') slug: string) {
    // Additional controller-level validation for better error messages
    if (!slug || slug.length < 3) {
      throw new BadRequestException('Slug must be at least 3 characters long');
    }

    if (slug.length > 100) {
      throw new BadRequestException('Slug is too long (maximum 100 characters allowed)');
    }

    // Check basic format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new BadRequestException('Slug can only contain lowercase letters, numbers, and hyphens');
    }

    return this.postsService.findBySlug(slug);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related posts' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of posts to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Related posts retrieved successfully',
  })
  getRelated(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.postsService.getRelated(
      id,
      limit ? parseInt(limit.toString()) : 5,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a post',
    description: 'Update a post including its slug. Slug must be unique and follow format rules.'
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        slug: { type: 'string' },
        content: { type: 'string' },
        updatedAt: { type: 'string' },
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid slug or slug already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Slug already exists. Please choose a different slug.'
        },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not the author' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.postsService.update(id, updatePostDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 204, description: 'Post deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not the author' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.postsService.remove(id, userId);
  }
}