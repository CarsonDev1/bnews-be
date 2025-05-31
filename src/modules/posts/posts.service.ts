import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
const slug = require('slug');
import {
  Post,
  PostDocument,
  PostStatus,
  RelatedProduct,
} from '../../schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import { CategoriesService } from '../categories/categories.service';
import { TagsService } from '../tags/tags.service';
import { UsersService } from '../users/users.service';
import { ProductsService } from 'src/modules/products/products.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private categoriesService: CategoriesService,
    private tagsService: TagsService,
    private usersService: UsersService,
    private productsService: ProductsService,
  ) {}

  async create(createPostDto: CreatePostDto, authorId: string): Promise<Post> {
    const postSlug = slug(createPostDto.title, { lower: true });

    // Check if slug already exists
    let finalSlug = postSlug;
    let counter = 1;
    while (await this.postModel.findOne({ slug: finalSlug })) {
      finalSlug = `${postSlug}-${counter}`;
      counter++;
    }

    // Validate category exists
    await this.categoriesService.findOne(createPostDto.categoryId);

    // Validate tags exist
    if (createPostDto.tagIds && createPostDto.tagIds.length > 0) {
      for (const tagId of createPostDto.tagIds) {
        await this.tagsService.findOne(tagId);
      }
    }
    //Process and validate related products
    let processedRelatedProducts: RelatedProduct[] = [];
    if (
      createPostDto.relatedProducts &&
      createPostDto.relatedProducts.length > 0
    ) {
      processedRelatedProducts = await this.processRelatedProducts(
        createPostDto.relatedProducts,
      );
    }

    const postData = {
      ...createPostDto,
      slug: finalSlug,
      authorId: new Types.ObjectId(authorId), // Set author from JWT
      publishedAt: createPostDto.publishedAt
        ? new Date(createPostDto.publishedAt)
        : createPostDto.status === PostStatus.PUBLISHED
          ? new Date()
          : undefined,
      categoryId: new Types.ObjectId(createPostDto.categoryId),
      tagIds: createPostDto.tagIds?.map((id) => new Types.ObjectId(id)) || [],
      relatedProducts: processedRelatedProducts,
    };

    const post = new this.postModel(postData);
    const savedPost = await post.save();

    // Update category post count
    await this.categoriesService.incrementPostCount(createPostDto.categoryId);
    if (createPostDto.tagIds && createPostDto.tagIds.length > 0) {
      for (const tagId of createPostDto.tagIds) {
        await this.tagsService.incrementPostCount(tagId);
      }
    }
    await this.usersService.incrementPostCount(authorId);

    return savedPost.populate([
      { path: 'categoryId', select: 'name slug' },
      { path: 'tagIds', select: 'name slug color' },
      { path: 'authorId', select: 'username displayName avatar' },
    ]);
  }

  private async processRelatedProducts(
    relatedProductsDto: any[],
  ): Promise<RelatedProduct[]> {
    console.log('🔍 Processing related products:', relatedProductsDto.length);

    const processedProducts: RelatedProduct[] = [];

    for (const productDto of relatedProductsDto) {
      try {
        console.log('🔍 Processing product:', productDto.url_key);

        // If productDto doesn't have url_key, skip validation
        if (!productDto.url_key) {
          console.warn('⚠️ Product missing url_key, skipping:', productDto);
          continue;
        }

        let relatedProduct: RelatedProduct;

        try {
          // Try to validate product exists by searching external API
          const validatedProducts =
            await this.productsService.validateProductSelection([
              productDto.url_key,
            ]);

          if (validatedProducts.length > 0) {
            const validatedProduct = validatedProducts[0];
            console.log('✅ Product validated:', validatedProduct.name);

            // Map external product data to our schema
            relatedProduct = {
              name: validatedProduct.name,
              url_key: validatedProduct.url_key,
              image_url:
                validatedProduct.image?.url || productDto.image_url || '',
              price:
                validatedProduct.price_range?.minimum_price?.final_price
                  ?.value ||
                productDto.price ||
                0,
              currency:
                validatedProduct.price_range?.minimum_price?.final_price
                  ?.currency ||
                productDto.currency ||
                'VND',
              sale_price:
                validatedProduct.daily_sale?.sale_price ||
                productDto.sale_price,
              product_url:
                productDto.product_url ||
                `https://bachlongmobile.com/products/${validatedProduct.url_key}`,
            };
          } else {
            throw new Error('Product not found in external API');
          }
        } catch (validationError) {
          console.warn(
            `⚠️ Product validation failed for ${productDto.url_key}:`,
            validationError.message,
          );
          console.log('📝 Using provided data as-is');

          // Use provided data if validation fails
          relatedProduct = {
            name: productDto.name || 'Unknown Product',
            url_key: productDto.url_key,
            image_url: productDto.image_url || '',
            price: productDto.price || 0,
            currency: productDto.currency || 'VND',
            sale_price: productDto.sale_price,
            product_url:
              productDto.product_url ||
              `https://bachlongmobile.com/products/${productDto.url_key}`,
          };
        }

        processedProducts.push(relatedProduct);
        console.log('✅ Product processed successfully:', relatedProduct.name);
      } catch (error) {
        console.error(
          `❌ Error processing product ${productDto.url_key}:`,
          error,
        );
        // Continue with other products, don't fail the entire operation
      }
    }

    console.log(
      `✅ Processed ${processedProducts.length} products successfully`,
    );
    return processedProducts;
  }

  async getPostsWithProducts(query: QueryPostDto & { hasProducts?: boolean }) {
    const baseQuery = await this.findAll(query);

    if (query.hasProducts) {
      baseQuery.data = baseQuery.data.filter(
        (post) => post.relatedProducts && post.relatedProducts.length > 0,
      );
      baseQuery.pagination.total = baseQuery.data.length;
    }

    return baseQuery;
  }

  async getPostsByProduct(
    productUrlKey: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel
        .find({
          'relatedProducts.url_key': productUrlKey,
          status: PostStatus.PUBLISHED,
        })
        .populate('categoryId', 'name slug')
        .populate('tagIds', 'name slug color')
        .populate('authorId', 'username displayName avatar')
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.postModel.countDocuments({
        'relatedProducts.url_key': productUrlKey,
        status: PostStatus.PUBLISHED,
      }),
    ]);

    return {
      data: posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPopularProductsInPosts(limit: number = 10) {
    const pipeline: any = [
      { $match: { status: PostStatus.PUBLISHED } },
      { $unwind: '$relatedProducts' },
      {
        $group: {
          _id: '$relatedProducts.url_key',
          count: { $sum: 1 },
          product: { $first: '$relatedProducts' },
          posts: { $push: { _id: '$_id', title: '$title', slug: '$slug' } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ];

    return this.postModel.aggregate(pipeline).exec();
  }

  async findAll(query: QueryPostDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      tagId,
      status = PostStatus.PUBLISHED,
      isFeatured,
      isSticky,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
      authorId,
    } = query;

    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { status };

    if (search) {
      filter.$text = { $search: search };
    }

    if (categoryId) {
      filter.categoryId = new Types.ObjectId(categoryId);
    }

    if (tagId) {
      filter.tagIds = new Types.ObjectId(tagId);
    }

    if (authorId) {
      filter.authorId = new Types.ObjectId(authorId);
    }

    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured;
    }

    if (isSticky !== undefined) {
      filter.isSticky = isSticky;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    if (sortBy !== 'isSticky') {
      sort.isSticky = -1;
    }

    const [data, total] = await Promise.all([
      this.postModel
        .find(filter)
        .populate({
          path: 'categoryId',
          select: 'name slug description icon',
        })
        .populate({
          path: 'tagIds',
          select: 'name slug color description',
          match: { isActive: true },
        })
        .populate({
          path: 'authorId',
          select: 'username displayName avatar',
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(false)
        .exec(),
      this.postModel.countDocuments(filter),
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

  async findOne(id: string): Promise<Post> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel
      .findById(id)
      .populate({
        path: 'categoryId',
        select: 'name slug description icon',
      })
      .populate({
        path: 'tagIds',
        select: 'name slug color description',
        match: { isActive: true },
      })
      .populate({
        path: 'authorId',
        select: 'username displayName avatar bio website location',
      })
      .lean(false)
      .exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async findBySlug(slug: string): Promise<Post> {
    console.log('🔍 Finding post by slug:', slug);

    const post = await this.postModel
      .findOne({ slug, status: PostStatus.PUBLISHED })
      .populate({
        path: 'categoryId',
        select: 'name slug description icon',
      })
      .populate({
        path: 'tagIds',
        select: 'name slug color description',
        match: { isActive: true },
      })
      .populate({
        path: 'authorId',
        select: 'username displayName avatar bio website location',
      })
      .lean(false)
      .exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Increment view count
    await this.postModel.findByIdAndUpdate(post._id, {
      $inc: { viewCount: 1 },
    });

    return post;
  }

  async update(
    id: string,
    updatePostDto: UpdatePostDto,
    userId: string,
  ): Promise<Post> {
    try {
      console.log('🔍 Updating post:', id);
      console.log('🔍 Update data:', JSON.stringify(updatePostDto, null, 2));

      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid post ID');
      }

      const existingPost = await this.postModel.findById(id);
      if (!existingPost) {
        throw new NotFoundException('Post not found');
      }

      console.log('🔍 Existing post found, author check...');
      if (existingPost.authorId.toString() !== userId) {
        throw new ForbiddenException('You can only edit your own posts');
      }

      const updateData: any = { ...updatePostDto };

      // Generate new slug if title is being updated
      if (updatePostDto.title) {
        console.log('🔍 Updating title, generating new slug...');
        const newSlug = slug(updatePostDto.title, { lower: true });
        let finalSlug = newSlug;
        let counter = 1;

        while (
          await this.postModel.findOne({ slug: finalSlug, _id: { $ne: id } })
        ) {
          finalSlug = `${newSlug}-${counter}`;
          counter++;
        }

        updateData.slug = finalSlug;
        console.log('🔍 New slug:', finalSlug);
      }

      // Handle category change
      if (
        updatePostDto.categoryId &&
        updatePostDto.categoryId !== existingPost.categoryId.toString()
      ) {
        console.log('🔍 Updating category...');
        await this.categoriesService.findOne(updatePostDto.categoryId);
        await this.categoriesService.decrementPostCount(
          existingPost.categoryId.toString(),
        );
        await this.categoriesService.incrementPostCount(
          updatePostDto.categoryId,
        );
        updateData.categoryId = new Types.ObjectId(updatePostDto.categoryId);
      }

      // Handle tags change
      if (updatePostDto.tagIds !== undefined) {
        console.log('🔍 Updating tags...');

        // Validate new tags exist
        if (updatePostDto.tagIds && updatePostDto.tagIds.length > 0) {
          for (const tagId of updatePostDto.tagIds) {
            await this.tagsService.findOne(tagId);
          }
        }

        const oldTagIds = existingPost.tagIds.map((id) => id.toString());
        const newTagIds = updatePostDto.tagIds || [];

        // Decrement old tags
        for (const tagId of oldTagIds) {
          if (!newTagIds.includes(tagId)) {
            await this.tagsService.decrementPostCount(tagId);
          }
        }

        // Increment new tags
        for (const tagId of newTagIds) {
          if (!oldTagIds.includes(tagId)) {
            await this.tagsService.incrementPostCount(tagId);
          }
        }

        updateData.tagIds = newTagIds.map((id) => new Types.ObjectId(id));
        console.log('🔍 Tags updated:', updateData.tagIds);
      }

      // FIXED: Handle related products update properly
      if (updatePostDto.relatedProducts !== undefined) {
        console.log('🔍 Updating related products...');
        console.log(
          '🔍 Current related products:',
          existingPost.relatedProducts?.length || 0,
        );
        console.log(
          '🔍 New related products data:',
          updatePostDto.relatedProducts?.length || 0,
        );

        if (
          updatePostDto.relatedProducts === null ||
          (Array.isArray(updatePostDto.relatedProducts) &&
            updatePostDto.relatedProducts.length === 0)
        ) {
          // Clear related products
          updateData.relatedProducts = [];
          console.log('🔍 Clearing related products');
        } else if (
          Array.isArray(updatePostDto.relatedProducts) &&
          updatePostDto.relatedProducts.length > 0
        ) {
          // Process and validate new related products
          console.log('🔍 Processing new related products...');

          try {
            // FIXED: Always process the products, even if validation fails
            updateData.relatedProducts = await this.processRelatedProducts(
              updatePostDto.relatedProducts,
            );
            console.log(
              '✅ Processed related products:',
              updateData.relatedProducts.length,
            );
          } catch (error) {
            console.error('❌ Error processing related products:', error);

            // FIXED: Fallback to using provided data directly
            console.log('📝 Using provided data as fallback...');
            updateData.relatedProducts = updatePostDto.relatedProducts.map(
              (productDto) => ({
                name: productDto.name || 'Unknown Product',
                url_key: productDto.url_key || '',
                image_url: productDto.image_url || '',
                price: productDto.price || 0,
                currency: productDto.currency || 'VND',
                sale_price: productDto.sale_price,
                product_url:
                  productDto.product_url ||
                  `https://bachlongmobile.com/products/${productDto.url_key}`,
              }),
            );
            console.log(
              '✅ Using fallback data for related products:',
              updateData.relatedProducts.length,
            );
          }
        }
      }

      // Handle publish date
      if (
        updatePostDto.status === PostStatus.PUBLISHED &&
        !existingPost.publishedAt
      ) {
        updateData.publishedAt = new Date();
        console.log('🔍 Setting publish date for newly published post');
      }

      if (updatePostDto.publishedAt) {
        updateData.publishedAt = new Date(updatePostDto.publishedAt);
        console.log('🔍 Updating publish date:', updateData.publishedAt);
      }

      console.log('🔍 Final update data keys:', Object.keys(updateData));
      console.log(
        '🔍 Related products in update:',
        updateData.relatedProducts?.length || 0,
      );

      // FIXED: Use $set to ensure the update works properly
      const updateOperation = {
        $set: updateData,
      };

      // Perform the update
      const updatedPost = await this.postModel
        .findByIdAndUpdate(id, updateOperation, { new: true })
        .populate({
          path: 'categoryId',
          select: 'name slug description icon',
        })
        .populate({
          path: 'tagIds',
          select: 'name slug color description',
          match: { isActive: true },
        })
        .populate({
          path: 'authorId',
          select: 'username displayName avatar',
        })
        .exec();

      if (!updatedPost) {
        throw new NotFoundException('Post not found after update');
      }

      console.log('✅ Post updated successfully');
      console.log(
        '🔍 Updated post related products:',
        updatedPost.relatedProducts?.length || 0,
      );

      return updatedPost;
    } catch (error) {
      console.error('❌ Error updating post:', error);
      throw error;
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel.findById(id);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if user is the author (or admin)
    if (post.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Update category post count
    await this.categoriesService.decrementPostCount(post.categoryId.toString());

    // Update tag post counts
    for (const tagId of post.tagIds) {
      await this.tagsService.decrementPostCount(tagId.toString());
    }

    // Update user post count
    await this.usersService.decrementPostCount(post.authorId.toString());

    await this.postModel.findByIdAndDelete(id);
  }

  async getFeatured(limit: number = 5): Promise<Post[]> {
    return this.postModel
      .find({
        status: PostStatus.PUBLISHED,
        isFeatured: true,
      })
      .populate({
        path: 'categoryId',
        select: 'name slug',
      })
      .populate({
        path: 'tagIds',
        select: 'name slug color',
        match: { isActive: true },
      })
      .populate({
        path: 'authorId',
        select: 'username displayName avatar',
      })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean(false)
      .exec();
  }

  async getPopular(limit: number = 5): Promise<Post[]> {
    return this.postModel
      .find({ status: PostStatus.PUBLISHED })
      .populate({
        path: 'categoryId',
        select: 'name slug',
      })
      .populate({
        path: 'tagIds',
        select: 'name slug color',
        match: { isActive: true },
      })
      .populate({
        path: 'authorId',
        select: 'username displayName avatar',
      })
      .sort({ viewCount: -1, publishedAt: -1 })
      .limit(limit)
      .lean(false)
      .exec();
  }

  async getLatest(limit: number = 5): Promise<Post[]> {
    return this.postModel
      .find({ status: PostStatus.PUBLISHED })
      .populate({
        path: 'categoryId',
        select: 'name slug',
      })
      .populate({
        path: 'tagIds',
        select: 'name slug color',
        match: { isActive: true },
      })
      .populate({
        path: 'authorId',
        select: 'username displayName avatar',
      })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean(false)
      .exec();
  }

  async getRelated(postId: string, limit: number = 5): Promise<Post[]> {
    const post = await this.postModel.findById(postId);
    if (!post) {
      return [];
    }

    return this.postModel
      .find({
        _id: { $ne: postId },
        status: PostStatus.PUBLISHED,
        $or: [
          { categoryId: post.categoryId },
          { tagIds: { $in: post.tagIds } },
        ],
      })
      .populate({
        path: 'categoryId',
        select: 'name slug',
      })
      .populate({
        path: 'tagIds',
        select: 'name slug color',
        match: { isActive: true },
      })
      .populate({
        path: 'authorId',
        select: 'username displayName avatar',
      })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean(false)
      .exec();
  }
}
