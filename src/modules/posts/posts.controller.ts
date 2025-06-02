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
  Request,
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
import { CommentsService } from 'src/modules/comments/services/comments.service';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createPostDto: CreatePostDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.postsService.create(createPostDto, userId);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all posts with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Posts retrieved successfully' })
  findAll(@Query() query: QueryPostDto) {
    return this.postsService.findAll(query);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Post comments retrieved successfully',
  })
  getPostComments(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.commentsService.getCommentsByPost(
      id,
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 10,
    );
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
    // Override authorId in query to current user
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
  @ApiOperation({ summary: 'Get a post by slug' })
  @ApiParam({ name: 'slug', description: 'Post slug' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  findBySlug(@Param('slug') slug: string) {
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
  @ApiOperation({ summary: 'Update a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
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
