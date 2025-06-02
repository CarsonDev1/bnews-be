import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCommentDto } from 'src/modules/comments/dto/create-comment.dto';
import { ModerateCommentDto } from 'src/modules/comments/dto/moderate-comment.dto';
import { QueryCommentDto } from 'src/modules/comments/dto/query-comment.dto';
import { UpdateCommentDto } from 'src/modules/comments/dto/update-comment.dto';
import { ExternalUserService } from 'src/modules/comments/services/external-user.service';
import { CommentDocument, CommentStatus } from 'src/schemas/comment.schema';
import { Post, PostDocument } from 'src/schemas/post.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private externalUserService: ExternalUserService,
  ) {}

  async create(
    createCommentDto: CreateCommentDto,
    userToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Comment> {
    // Get user info from external GraphQL API
    const externalUser =
      await this.externalUserService.getUserFromGraphQL(userToken);
    const userInfo = this.externalUserService.extractUserInfo(externalUser);

    // Validate post exists
    const post = await this.postModel.findById(createCommentDto.postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Validate parent comment if provided
    if (createCommentDto.parentId) {
      const parentComment = await this.commentModel.findById(
        createCommentDto.parentId,
      );
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
      if (parentComment.postId.toString() !== createCommentDto.postId) {
        throw new BadRequestException('Parent comment is not on the same post');
      }
    }

    // Create comment with external user info
    const commentData = {
      content: createCommentDto.content,
      postId: new Types.ObjectId(createCommentDto.postId),
      parentId: createCommentDto.parentId
        ? new Types.ObjectId(createCommentDto.parentId)
        : null,
      ...userInfo,
      ipAddress,
      userAgent,
      status: CommentStatus.PENDING, // Default to pending for moderation
    };

    const comment = new this.commentModel(commentData);
    const savedComment = await comment.save();

    // Update post comment count
    await this.postModel.findByIdAndUpdate(createCommentDto.postId, {
      $inc: { commentCount: 1 },
    });

    // Update parent comment reply count if it's a reply
    if (createCommentDto.parentId) {
      await this.commentModel.findByIdAndUpdate(createCommentDto.parentId, {
        $inc: { replyCount: 1 },
      });
    }

    return savedComment.populate('postId', 'title slug');
  }

  async findAll(query: QueryCommentDto) {
    const {
      page = 1,
      limit = 10,
      postId,
      parentId,
      externalUserId,
      status = CommentStatus.APPROVED,
      includeReplies,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { status };

    if (postId) {
      filter.postId = new Types.ObjectId(postId);
    }

    if (parentId !== undefined) {
      filter.parentId =
        parentId === 'null' || parentId === ''
          ? null
          : new Types.ObjectId(parentId);
    }

    if (externalUserId) {
      filter.externalUserId = externalUserId;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    let queryBuilder = this.commentModel
      .find(filter)
      .populate('postId', 'title slug')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    if (includeReplies) {
      queryBuilder = queryBuilder.populate({
        path: 'replies',
        match: { status: CommentStatus.APPROVED },
        options: { sort: { createdAt: 1 }, limit: 5 },
      });
    }

    const [data, total] = await Promise.all([
      queryBuilder.exec(),
      this.commentModel.countDocuments(filter),
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

  async findOne(id: string): Promise<Comment> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comment ID');
    }

    const comment = await this.commentModel
      .findById(id)
      .populate('postId', 'title slug')
      .populate({
        path: 'replies',
        match: { status: CommentStatus.APPROVED },
        options: { sort: { createdAt: 1 } },
      })
      .exec();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment as any;
  }

  async update(
    id: string,
    updateCommentDto: UpdateCommentDto,
    userToken: string,
  ): Promise<Comment> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comment ID');
    }

    // Get user info to verify ownership
    const externalUser =
      await this.externalUserService.getUserFromGraphQL(userToken);
    const userInfo = this.externalUserService.extractUserInfo(externalUser);

    const comment = await this.commentModel.findById(id);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user owns the comment
    if (comment.externalUserId !== userInfo.externalUserId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Update comment
    const updatedComment = await this.commentModel
      .findByIdAndUpdate(
        id,
        {
          content: updateCommentDto.content,
          isEdited: true,
          editedAt: new Date(),
        },
        { new: true },
      )
      .populate('postId', 'title slug')
      .exec();

    return updatedComment as any;
  }

  async remove(id: string, userToken: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comment ID');
    }

    // Get user info to verify ownership
    const externalUser =
      await this.externalUserService.getUserFromGraphQL(userToken);
    const userInfo = this.externalUserService.extractUserInfo(externalUser);

    const comment = await this.commentModel.findById(id);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user owns the comment
    if (comment.externalUserId !== userInfo.externalUserId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Update post comment count
    await this.postModel.findByIdAndUpdate(comment.postId, {
      $dec: { commentCount: 1 },
    });

    // Update parent comment reply count if it's a reply
    if (comment.parentId) {
      await this.commentModel.findByIdAndUpdate(comment.parentId, {
        $dec: { replyCount: 1 },
      });
    }

    // Delete the comment and all its replies
    await this.commentModel.deleteMany({
      $or: [{ _id: id }, { parentId: id }],
    });
  }

  async moderate(
    id: string,
    moderateCommentDto: ModerateCommentDto,
    moderatorId: string,
  ): Promise<Comment> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comment ID');
    }

    const comment = await this.commentModel
      .findByIdAndUpdate(
        id,
        {
          status: moderateCommentDto.status,
          moderatedBy: moderatorId,
          moderatedAt: new Date(),
          moderationReason: moderateCommentDto.reason,
        },
        { new: true },
      )
      .populate('postId', 'title slug')
      .exec();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment as any;
  }

  async getCommentsByPost(
    postId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.findAll({
      postId,
      parentId: 'null', // Only root comments
      status: CommentStatus.APPROVED,
      includeReplies: true,
      page,
      limit,
    });
  }

  async getUserComments(
    externalUserId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.findAll({
      externalUserId,
      status: CommentStatus.APPROVED,
      page,
      limit,
    });
  }

  async likeComment(id: string): Promise<Comment> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comment ID');
    }

    const comment = await this.commentModel
      .findByIdAndUpdate(id, { $inc: { likeCount: 1 } }, { new: true })
      .exec();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment as any;
  }
}
