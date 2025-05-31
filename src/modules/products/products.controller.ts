import { Controller, Get, Query, UseGuards, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductsService, ProductSearchParams } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SearchProductsDto,
  ValidateProductsDto,
} from 'src/modules/products/dto/products.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search products' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({
    name: 'categoryUid',
    required: false,
    description: 'Category UID',
  })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Page size' })
  @ApiQuery({
    name: 'currentPage',
    required: false,
    description: 'Current page',
  })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async searchProducts(@Query() query: SearchProductsDto) {
    const params: ProductSearchParams = {
      search: query.search,
      categoryUid: query.categoryUid,
      pageSize: query.pageSize ? parseInt(query.pageSize.toString()) : 20,
      currentPage: query.currentPage
        ? parseInt(query.currentPage.toString())
        : 1,
    };

    const products = await this.productsService.searchProducts(params);

    return {
      data: products,
      total: products.length,
      pageSize: params.pageSize,
      currentPage: params.currentPage,
    };
  }

  @Get('technology-news')
  @ApiOperation({ summary: 'Get technology news products' })
  @ApiResponse({
    status: 200,
    description: 'Combo products retrieved successfully',
  })
  async getProductTechnologyNews() {
    const products = await this.productsService.getProductTechnologyNews();
    return {
      data: products,
      total: products.length,
    };
  }

  @Get('bgames')
  @ApiOperation({ summary: 'Get bgames products' })
  @ApiResponse({
    status: 200,
    description: 'Combo products retrieved successfully',
  })
  async getProductBgames() {
    const products = await this.productsService.getProductBgames();
    return {
      data: products,
      total: products.length,
    };
  }

  @Get('advise')
  @ApiOperation({ summary: 'Get advise products' })
  @ApiResponse({
    status: 200,
    description: 'Combo products retrieved successfully',
  })
  async getProducAdvise() {
    const products = await this.productsService.getProducAdvise();
    return {
      data: products,
      total: products.length,
    };
  }
  @Get('onhand')
  @ApiOperation({ summary: 'Get onhand products' })
  @ApiResponse({
    status: 200,
    description: 'Combo products retrieved successfully',
  })
  async getProducOnHand() {
    const products = await this.productsService.getProducOnHand();
    return {
      data: products,
      total: products.length,
    };
  }
  @Get('evaluate')
  @ApiOperation({ summary: 'Get evaluate products' })
  @ApiResponse({
    status: 200,
    description: 'Combo products retrieved successfully',
  })
  async getProducEvaluate() {
    const products = await this.productsService.getProducEvaluate();
    return {
      data: products,
      total: products.length,
    };
  }
  @Get('trick')
  @ApiOperation({ summary: 'Get trick products' })
  @ApiResponse({
    status: 200,
    description: 'Combo products retrieved successfully',
  })
  async getProducTrick() {
    const products = await this.productsService.getProducTrick();
    return {
      data: products,
      total: products.length,
    };
  }
  @Get('promotion')
  @ApiOperation({ summary: 'Get promotion products' })
  @ApiResponse({
    status: 200,
    description: 'Combo products retrieved successfully',
  })
  async getProducPromotion() {
    const products = await this.productsService.getProducPromotion();
    return {
      data: products,
      total: products.length,
    };
  }

  @Get('phones')
  @ApiOperation({ summary: 'Get phone products' })
  @ApiResponse({
    status: 200,
    description: 'Phone products retrieved successfully',
  })
  async getPhoneProducts() {
    const products = await this.productsService.getPhoneProducts();
    return {
      data: products,
      total: products.length,
    };
  }

  @Get('laptops')
  @ApiOperation({ summary: 'Get laptop products' })
  @ApiResponse({
    status: 200,
    description: 'Laptop products retrieved successfully',
  })
  async getLaptopProducts() {
    const products = await this.productsService.getLaptopProducts();
    return {
      data: products,
      total: products.length,
    };
  }

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate product selection for posts' })
  @ApiResponse({ status: 200, description: 'Products validated successfully' })
  async validateProducts(@Body() validateDto: ValidateProductsDto) {
    const validatedProducts =
      await this.productsService.validateProductSelection(
        validateDto.productKeys,
      );

    return {
      data: validatedProducts,
      validCount: validatedProducts.length,
      requestedCount: validateDto.productKeys.length,
      invalidKeys: validateDto.productKeys.filter(
        (key) => !validatedProducts.some((p) => p.url_key === key),
      ),
    };
  }
}
