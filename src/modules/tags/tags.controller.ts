// src/modules/tags/tags.controller.ts - COMPLETE VERSION
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
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { QueryTagDto } from './dto/query-tag.dto';
import { TagPostsQueryDto } from 'src/modules/tags/dto/tag-posts-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FastifyRequest } from 'fastify';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new tag (Admin only)' })
  @ApiResponse({ status: 201, description: 'Tag created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  // NEW: Upload tag image
  @Post(':id/image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload tag image (Admin only)' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Tag image file (max 10MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tag image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        tag: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            image: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async uploadTagImage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() request: FastifyRequest,
  ) {
    try {
      const data = await (request as any).file();
      if (!data) {
        throw new BadRequestException('No file uploaded');
      }

      const buffer = await data.toBuffer();

      // Basic validation
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(data.mimetype)) {
        throw new BadRequestException(
          `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
        );
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (buffer.length > maxSize) {
        throw new BadRequestException('File too large. Maximum size: 10MB');
      }

      const updatedTag = await this.tagsService.updateTagImage(id, buffer);

      return {
        message: 'Tag image uploaded successfully',
        tag: {
          id: updatedTag._id,
          name: updatedTag.name,
          slug: updatedTag.slug,
          image: updatedTag.image,
        },
      };
    } catch (error) {
      console.error('Tag image upload error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  // NEW: Remove tag image
  @Delete(':id/image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove tag image (Admin only)' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({
    status: 200,
    description: 'Tag image removed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        tag: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            image: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async removeTagImage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const updatedTag = await this.tagsService.removeTagImage(id);

    return {
      message: 'Tag image removed successfully',
      tag: {
        id: updatedTag._id,
        name: updatedTag.name,
        slug: updatedTag.slug,
        image: updatedTag.image || null,
      },
    };
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
    example: 10,
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
    example: 10,
  })
  @ApiQuery({
    name: 'postsLimit',
    required: false,
    description: 'Number of posts per tag',
    example: 5,
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
          image: { type: 'string' },
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
        image: { type: 'string' },
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
  @ApiParam({ name: 'slug', description: 'Tag slug', example: 'javascript' })
  @ApiResponse({ status: 200, description: 'Tag retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.tagsService.findBySlug(slug);
  }

  @Get('slug/:slug/with-posts')
  @ApiOperation({ summary: 'Get tag by slug with its posts' })
  @ApiParam({ name: 'slug', description: 'Tag slug', example: 'javascript' })
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
  @ApiParam({ name: 'slug', description: 'Tag slug', example: 'javascript' })
  @ApiResponse({ status: 200, description: 'Tag posts retrieved successfully' })
  getTagPostsBySlug(
    @Param('slug') slug: string,
    @Query() query: TagPostsQueryDto,
  ) {
    return this.tagsService.getTagPostsBySlug(slug, query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a tag (Admin only)' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a tag (Admin only)' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 204, description: 'Tag deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Cannot delete tag with posts' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }
}