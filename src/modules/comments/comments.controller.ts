import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Headers,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { QueryCommentDto } from './dto/query-comment.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // For admin moderation
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CommentsService } from 'src/modules/comments/services/comments.service';
import { ExternalUserGuard } from 'src/modules/comments/guards/external-user.guard';
import { OptionalExternalUserGuard } from 'src/modules/comments/guards/optional-external-user.guard';

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(ExternalUserGuard)
  @ApiOperation({ summary: 'Create a new comment' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token from GraphQL user service',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Invalid external user token' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  create(
    @Body() createCommentDto: CreateCommentDto,
    @Headers('authorization') authorization: string,
    @Request() req,
  ) {
    const token = authorization?.replace('Bearer ', '');
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.commentsService.create(
      createCommentDto,
      token,
      ipAddress,
      userAgent,
    );
  }

  @Get()
  @UseGuards(OptionalExternalUserGuard)
  @ApiOperation({ summary: 'Get comments with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  findAll(@Query() query: QueryCommentDto) {
    return this.commentsService.findAll(query);
  }

  @Get('post/:postId')
  @ApiOperation({ summary: 'Get comments for a specific post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Post comments retrieved successfully',
  })
  getPostComments(
    @Param('postId') postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.commentsService.getCommentsByPost(
      postId,
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get('user/:externalUserId')
  @ApiOperation({ summary: 'Get comments by external user ID' })
  @ApiParam({ name: 'externalUserId', description: 'External User ID (email)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'User comments retrieved successfully',
  })
  getUserComments(
    @Param('externalUserId') externalUserId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.commentsService.getUserComments(
      externalUserId,
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a comment by ID' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ExternalUserGuard)
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token from GraphQL user service',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not the comment author',
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace('Bearer ', '');
    return this.commentsService.update(id, updateCommentDto, token);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ExternalUserGuard)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token from GraphQL user service',
    required: true,
  })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not the comment author',
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  remove(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace('Bearer ', '');
    return this.commentsService.remove(id, token);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment liked successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  likeComment(@Param('id') id: string) {
    return this.commentsService.likeComment(id);
  }

  // Admin/Moderator endpoints
  @Patch(':id/moderate')
  @UseGuards(JwtAuthGuard) // Use internal admin authentication
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moderate a comment (Admin/Moderator only)' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment moderated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  moderateComment(
    @Param('id') id: string,
    @Body() moderateCommentDto: ModerateCommentDto,
    @CurrentUser('id') moderatorId: string,
  ) {
    return this.commentsService.moderate(id, moderateCommentDto, moderatorId);
  }

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending comments for moderation (Admin only)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Pending comments retrieved successfully',
  })
  getPendingComments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.commentsService.findAll({
      status: 'pending',
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
    });
  }
}
