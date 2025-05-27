import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slug from 'slug';
import { Category, CategoryDocument } from '../../schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const categorySlug = slug(createCategoryDto.name, { lower: true });

    const existingCategory = await this.categoryModel.findOne({
      slug: categorySlug,
    });
    if (existingCategory) {
      throw new BadRequestException('Category with this name already exists');
    }

    if (createCategoryDto.parentId) {
      const parentCategory = await this.categoryModel.findById(
        createCategoryDto.parentId,
      );
      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const category = new this.categoryModel({
      ...createCategoryDto,
      slug: categorySlug,
    });

    return category.save();
  }

  async findAll(query: QueryCategoryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      parentId,
      isActive,
      includeChildren,
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (parentId !== undefined) {
      filter.parentId =
        parentId === 'null' || parentId === ''
          ? null
          : new Types.ObjectId(parentId);
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    let queryBuilder = this.categoryModel
      .find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (includeChildren) {
      queryBuilder = queryBuilder.populate('children');
    }

    const [data, total] = await Promise.all([
      queryBuilder.exec(),
      this.categoryModel.countDocuments(filter),
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

  async findOne(id: string): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const category = await this.categoryModel
      .findById(id)
      .populate('children')
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryModel
      .findOne({ slug, isActive: true })
      .populate('children')
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const updateData: any = { ...updateCategoryDto };

    if (updateCategoryDto.name) {
      const newSlug = slug(updateCategoryDto.name, { lower: true });
      const existingCategory = await this.categoryModel.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });

      if (existingCategory) {
        throw new BadRequestException('Category with this name already exists');
      }

      updateData.slug = newSlug;
    }

    if (updateCategoryDto.parentId) {
      const parentCategory = await this.categoryModel.findById(
        updateCategoryDto.parentId,
      );
      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }

      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }
    }

    const category = await this.categoryModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('children')
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const hasChildren = await this.categoryModel.findOne({ parentId: id });
    if (hasChildren) {
      throw new BadRequestException(
        'Cannot delete category with subcategories',
      );
    }

    const result = await this.categoryModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Category not found');
    }
  }

  async getTree(): Promise<Category[]> {
    const categories = await this.categoryModel
      .find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .populate('children')
      .exec();

    const rootCategories = categories.filter((cat) => !cat.parentId);
    return rootCategories;
  }

  async incrementPostCount(categoryId: string): Promise<void> {
    await this.categoryModel.findByIdAndUpdate(categoryId, {
      $inc: { postCount: 1 },
    });
  }

  async decrementPostCount(categoryId: string): Promise<void> {
    await this.categoryModel.findByIdAndUpdate(categoryId, {
      $inc: { postCount: -1 },
    });
  }
}
