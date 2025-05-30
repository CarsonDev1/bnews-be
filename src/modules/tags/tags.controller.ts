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
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { QueryTagDto } from './dto/query-tag.dto';
import { TagPostsQueryDto } from 'src/modules/tags/dto/tag-posts-query.dto';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({ status: 201, description: 'Tag created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Tags retrieved successfully' })
  findAll(@Query() query: QueryTagDto) {
    return this.tagsService.findAll(query);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular tags' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of tags to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Popular tags retrieved successfully',
  })
  getPopular(@Query('limit') limit?: number) {
    return this.tagsService.getPopularTags(
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get('popular-with-posts')
  @ApiOperation({ summary: 'Get popular tags with their posts' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of tags to return',
  })
  @ApiQuery({
    name: 'postsLimit',
    required: false,
    description: 'Number of posts per tag',
  })
  @ApiResponse({
    status: 200,
    description: 'Popular tags with posts retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          color: { type: 'string' },
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
          postsTotal: { type: 'number' },
        },
      },
    },
  })
  getPopularWithPosts(
    @Query('limit') limit?: number,
    @Query('postsLimit') postsLimit?: number,
  ) {
    return this.tagsService.getPopularTagsWithPosts(
      limit ? parseInt(limit.toString()) : 10,
      postsLimit ? parseInt(postsLimit.toString()) : 5,
    );
  }

  @Get('with-post-counts')
  @ApiOperation({ summary: 'Get all tags with real-time post counts' })
  @ApiResponse({
    status: 200,
    description: 'Tags with post counts retrieved successfully',
  })
  getWithPostCounts() {
    return this.tagsService.getAllTagsWithPostCounts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tag by ID' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  findOne(@Param('id') id: string) {
    return this.tagsService.findOne(id);
  }

  @Get(':id/with-posts')
  @ApiOperation({ summary: 'Get tag with its posts' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({
    status: 200,
    description: 'Tag with posts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        description: { type: 'string' },
        color: { type: 'string' },
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
              categoryId: { type: 'object' },
              tagIds: { type: 'array' },
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
  findOneWithPosts(@Param('id') id: string, @Query() query: TagPostsQueryDto) {
    return this.tagsService.findOneWithPosts(id, query);
  }

  @Get(':id/posts')
  @ApiOperation({ summary: 'Get all posts for a specific tag' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag posts retrieved successfully' })
  getTagPosts(@Param('id') id: string, @Query() query: TagPostsQueryDto) {
    return this.tagsService.getTagPosts(id, query);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a tag by slug' })
  @ApiParam({ name: 'slug', description: 'Tag slug' })
  @ApiResponse({ status: 200, description: 'Tag retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.tagsService.findBySlug(slug);
  }

  @Get('slug/:slug/with-posts')
  @ApiOperation({ summary: 'Get tag by slug with its posts' })
  @ApiParam({ name: 'slug', description: 'Tag slug' })
  @ApiResponse({
    status: 200,
    description: 'Tag with posts retrieved successfully',
  })
  findBySlugWithPosts(
    @Param('slug') slug: string,
    @Query() query: TagPostsQueryDto,
  ) {
    return this.tagsService.findBySlugWithPosts(slug, query);
  }

  @Get('slug/:slug/posts')
  @ApiOperation({ summary: 'Get posts for tag by slug' })
  @ApiParam({ name: 'slug', description: 'Tag slug' })
  @ApiResponse({ status: 200, description: 'Tag posts retrieved successfully' })
  getTagPostsBySlug(
    @Param('slug') slug: string,
    @Query() query: TagPostsQueryDto,
  ) {
    return this.tagsService.getTagPostsBySlug(slug, query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag updated successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 204, description: 'Tag deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }
}
