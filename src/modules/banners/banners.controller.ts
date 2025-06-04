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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BannersService } from 'src/modules/banners/banners.service';
import { CreateBannerDto, QueryBannerDto } from 'src/modules/banners/dto/create-banner.dto';
import { UpdateBannerDto } from 'src/modules/banners/dto/update-banner.dto';


@ApiTags('banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new banner' })
  @ApiResponse({ status: 201, description: 'Banner created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createBannerDto: CreateBannerDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.bannersService.create(createBannerDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all banners with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Banners retrieved successfully' })
  findAll(@Query() query: QueryBannerDto) {
    return this.bannersService.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active banners for display' })
  @ApiQuery({ name: 'type', required: false, description: 'Banner type' })
  @ApiQuery({ name: 'category', required: false, description: 'Category filter' })
  @ApiQuery({ name: 'tag', required: false, description: 'Tag filter' })
  @ApiResponse({ status: 200, description: 'Active banners retrieved successfully' })
  getActiveBanners(
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
  ) {
    return this.bannersService.getActiveBanners({ type, category, tag });
  }

  @Get('types')
  @ApiOperation({ summary: 'Get banner types' })
  @ApiResponse({ status: 200, description: 'Banner types retrieved successfully' })
  getBannerTypes() {
    return this.bannersService.getBannerTypes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a banner by ID' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: 'Banner retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a banner by slug' })
  @ApiParam({ name: 'slug', description: 'Banner slug' })
  @ApiResponse({ status: 200, description: 'Banner retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.bannersService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: 'Banner updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.bannersService.update(id, updateBannerDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 204, description: 'Banner deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.bannersService.remove(id, userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update banner status' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: 'Banner status updated successfully' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.bannersService.updateStatus(id, body.status as any, userId);
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment banner view count' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: 'View count incremented' })
  incrementView(@Param('id') id: string) {
    return this.bannersService.incrementViewCount(id);
  }

  @Post(':id/click')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment banner click count' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: 'Click count incremented' })
  incrementClick(@Param('id') id: string) {
    return this.bannersService.incrementClickCount(id);
  }
}