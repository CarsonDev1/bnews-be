import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Banner, BannerDocument, BannerType, BannerStatus } from '../../schemas/banner.schema';

import { UploadService } from '../upload/upload.service';
import { CreateBannerDto, QueryBannerDto } from 'src/modules/banners/dto/create-banner.dto';
import { UpdateBannerDto } from 'src/modules/banners/dto/update-banner.dto';
const slug = require('slug');

@Injectable()
export class BannersService {
  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
    private uploadService: UploadService,
  ) { }

  async create(createBannerDto: CreateBannerDto, authorId: string): Promise<Banner> {
    const bannerSlug = slug(createBannerDto.title, { lower: true });

    // Check if slug already exists
    let finalSlug = bannerSlug;
    let counter = 1;
    while (await this.bannerModel.findOne({ slug: finalSlug })) {
      finalSlug = `${bannerSlug}-${counter}`;
      counter++;
    }

    const bannerData = {
      ...createBannerDto,
      slug: finalSlug,
      authorId: new Types.ObjectId(authorId),
      startDate: createBannerDto.startDate ? new Date(createBannerDto.startDate) : undefined,
      endDate: createBannerDto.endDate ? new Date(createBannerDto.endDate) : undefined,
    };

    const banner = new this.bannerModel(bannerData);
    return banner.save();
  }

  async findAll(query: QueryBannerDto) {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      status,
      authorId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (authorId) {
      filter.authorId = new Types.ObjectId(authorId);
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Add priority and order to sort
    if (sortBy !== 'priority') {
      sort.priority = -1;
    }
    if (sortBy !== 'order') {
      sort.order = 1;
    }

    const [data, total] = await Promise.all([
      this.bannerModel
        .find(filter)
        .populate('authorId', 'username displayName avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bannerModel.countDocuments(filter),
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

  async getActiveBanners(filters: {
    type?: string;
    category?: string;
    tag?: string;
  } = {}) {
    const now = new Date();
    const filter: any = {
      status: BannerStatus.ACTIVE,
      $or: [
        { startDate: { $exists: false } },
        { startDate: { $lte: now } },
      ],
      $and: [
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: { $gte: now } },
          ],
        },
      ],
    };

    if (filters.type) {
      filter.type = filters.type;
    }

    if (filters.category) {
      filter.$or = [
        { categories: { $in: [filters.category] } },
        { categories: { $exists: false } },
        { categories: { $size: 0 } },
      ];
    }

    if (filters.tag) {
      filter.$or = [
        { tags: { $in: [filters.tag] } },
        { tags: { $exists: false } },
        { tags: { $size: 0 } },
      ];
    }

    return this.bannerModel
      .find(filter)
      .sort({ priority: -1, order: 1, createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Banner> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid banner ID');
    }

    const banner = await this.bannerModel
      .findById(id)
      .populate('authorId', 'username displayName avatar')
      .exec();

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    return banner;
  }

  async findBySlug(slug: string): Promise<Banner> {
    const banner = await this.bannerModel
      .findOne({ slug })
      .populate('authorId', 'username displayName avatar')
      .exec();

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    return banner;
  }

  async update(id: string, updateBannerDto: UpdateBannerDto, userId: string): Promise<Banner> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid banner ID');
    }

    const existingBanner = await this.bannerModel.findById(id);
    if (!existingBanner) {
      throw new NotFoundException('Banner not found');
    }

    // Check if user is the author or admin
    if (existingBanner.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own banners');
    }

    const updateData: any = { ...updateBannerDto };

    // Generate new slug if title is being updated
    if (updateBannerDto.title) {
      const newSlug = slug(updateBannerDto.title, { lower: true });
      const existingSlug = await this.bannerModel.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });

      if (existingSlug) {
        let finalSlug = newSlug;
        let counter = 1;
        while (await this.bannerModel.findOne({ slug: finalSlug, _id: { $ne: id } })) {
          finalSlug = `${newSlug}-${counter}`;
          counter++;
        }
        updateData.slug = finalSlug;
      } else {
        updateData.slug = newSlug;
      }
    }

    // Handle date updates
    if (updateBannerDto.startDate) {
      updateData.startDate = new Date(updateBannerDto.startDate);
    }
    if (updateBannerDto.endDate) {
      updateData.endDate = new Date(updateBannerDto.endDate);
    }

    const banner = await this.bannerModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('authorId', 'username displayName avatar')
      .exec();

    return banner as Banner;
  }

  async updateStatus(id: string, status: BannerStatus, userId: string): Promise<Banner> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid banner ID');
    }

    const banner = await this.bannerModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .populate('authorId', 'username displayName avatar')
      .exec();

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    return banner;
  }

  async remove(id: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid banner ID');
    }

    const banner = await this.bannerModel.findById(id);
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    // Check if user is the author or admin
    if (banner.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own banners');
    }

    // Delete associated images
    if (banner.images && banner.images.length > 0) {
      const imageUrls = banner.images.map(img => img.url);
      await this.uploadService.deleteMultipleImages(imageUrls);
    }

    await this.bannerModel.findByIdAndDelete(id);
  }

  async incrementViewCount(id: string): Promise<{ viewCount: number }> {
    const banner = await this.bannerModel.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    return { viewCount: banner.viewCount };
  }

  async incrementClickCount(id: string): Promise<{ clickCount: number }> {
    const banner = await this.bannerModel.findByIdAndUpdate(
      id,
      { $inc: { clickCount: 1 } },
      { new: true }
    );

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    return { clickCount: banner.clickCount };
  }

  getBannerTypes() {
    return {
      types: Object.values(BannerType),
      statuses: Object.values(BannerStatus),
    };
  }
}