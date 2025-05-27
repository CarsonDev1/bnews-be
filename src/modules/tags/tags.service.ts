import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as slug from 'slug';
import { Tag, TagDocument } from '../../schemas/tag.schema';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { QueryTagDto } from './dto/query-tag.dto';

@Injectable()
export class TagsService {
  constructor(@InjectModel(Tag.name) private tagModel: Model<TagDocument>) {}

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const tagSlug = slug(createTagDto.name, { lower: true });

    // Check if slug already exists
    const existingTag = await this.tagModel.findOne({ slug: tagSlug });
    if (existingTag) {
      throw new BadRequestException('Tag with this name already exists');
    }

    const tag = new this.tagModel({
      ...createTagDto,
      slug: tagSlug,
    });

    return tag.save();
  }

  async findAll(query: QueryTagDto) {
    const { page = 1, limit = 10, search, isActive } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      this.tagModel
        .find(filter)
        .sort({ postCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.tagModel.countDocuments(filter),
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

  async findOne(id: string): Promise<Tag> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid tag ID');
    }

    const tag = await this.tagModel.findById(id).exec();

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  async findBySlug(slug: string): Promise<Tag> {
    const tag = await this.tagModel.findOne({ slug, isActive: true }).exec();

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  async update(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid tag ID');
    }

    const updateData: any = { ...updateTagDto };

    // Generate new slug if name is being updated
    if (updateTagDto.name) {
      const newSlug = slug(updateTagDto.name, { lower: true });
      const existingTag = await this.tagModel.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });

      if (existingTag) {
        throw new BadRequestException('Tag with this name already exists');
      }

      updateData.slug = newSlug;
    }

    const tag = await this.tagModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid tag ID');
    }

    const result = await this.tagModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Tag not found');
    }
  }

  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    return this.tagModel
      .find({ isActive: true, postCount: { $gt: 0 } })
      .sort({ postCount: -1 })
      .limit(limit)
      .exec();
  }

  async incrementPostCount(tagId: string): Promise<void> {
    await this.tagModel.findByIdAndUpdate(tagId, { $inc: { postCount: 1 } });
  }

  async decrementPostCount(tagId: string): Promise<void> {
    await this.tagModel.findByIdAndUpdate(tagId, { $inc: { postCount: -1 } });
  }
}
