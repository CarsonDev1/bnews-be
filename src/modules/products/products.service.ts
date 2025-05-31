import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface ProductInterface {
  name: string;
  url_key: string;
  image: {
    url: string;
  };
  price_range: {
    minimum_price: {
      final_price: {
        currency: string;
        value: number;
      };
    };
  };
  daily_sale?: {
    end_date: string;
    entity_id: string;
    sale_price: number;
    sale_qty: number;
    saleable_qty: number;
    sold_qty: number;
    start_date: string;
    __typename: string;
  };
}

export interface ProductSearchParams {
  search?: string;
  categoryUid?: string;
  pageSize?: number;
  currentPage?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly graphqlEndpoint: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.graphqlEndpoint =
      this.configService.get<string>('PRODUCTS_API_URL') ||
      'https://beta-api.bachlongmobile.com/graphql';
  }

  async searchProducts(
    params: ProductSearchParams,
  ): Promise<ProductInterface[]> {
    const query = `
      query getProducts(
        $search: String
        $filter: ProductAttributeFilterInput
        $sort: ProductAttributeSortInput
        $pageSize: Int
        $currentPage: Int
      ) {
        products(
          search: $search
          filter: $filter
          sort: $sort
          pageSize: $pageSize
          currentPage: $currentPage
        ) {
          items {
            ...ProductInterfaceField
          }
          sort_fields {
            default
            options {
              label
              value
            }
          }
        }
      }
      
      fragment ProductInterfaceField on ProductInterface {
        name
        url_key
        image {
          url
        }
        price_range {
          ...PriceRangeField
        }
        ...CustomField
      }
      
      fragment CustomField on ProductInterface {
        daily_sale {
          end_date
          entity_id
          sale_price
          sale_qty
          saleable_qty
          sold_qty
          start_date
          __typename
        }
      }
      
      fragment PriceRangeField on PriceRange {
        minimum_price {
          ...ProductPriceField
        }
      }
      
      fragment ProductPriceField on ProductPrice {
        final_price {
          currency
          value
        }
      }
    `;

    const variables = {
      search: params.search,
      filter: params.categoryUid
        ? {
            category_uid: {
              eq: params.categoryUid,
            },
          }
        : {},
      sort: params.sortBy
        ? {
            [params.sortBy]: params.sortDirection || 'ASC',
          }
        : {},
      pageSize: params.pageSize || 20,
      currentPage: params.currentPage || 1,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.graphqlEndpoint,
          {
            query,
            variables,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (response.data.errors) {
        this.logger.error('GraphQL errors:', response.data.errors);
        throw new BadRequestException('Failed to fetch products');
      }

      return response.data?.data?.products?.items || [];
    } catch (error) {
      this.logger.error('Failed to fetch products:', error.message);
      throw new BadRequestException('Failed to fetch products');
    }
  }

  async getProductsByCategory(
    categoryUid: string,
    limit: number = 200,
  ): Promise<ProductInterface[]> {
    return this.searchProducts({
      categoryUid,
      pageSize: limit,
      currentPage: 1,
    });
  }

  async searchProductsByName(
    searchTerm: string,
    limit: number = 20,
  ): Promise<ProductInterface[]> {
    return this.searchProducts({
      search: searchTerm,
      pageSize: limit,
      currentPage: 1,
    });
  }

  // Popular categories for quick access
  async getProductTechnologyNews(): Promise<ProductInterface[]> {
    return this.getProductsByCategory('NzUz', 60);
  }

  async getProductBgames(): Promise<ProductInterface[]> {
    return this.getProductsByCategory('NzU0', 60);
  }
  async getProducAdvise(): Promise<ProductInterface[]> {
    return this.getProductsByCategory('NzU1', 60);
  }
  async getProducOnHand(): Promise<ProductInterface[]> {
    return this.getProductsByCategory('NzU2', 60);
  }
  async getProducEvaluate(): Promise<ProductInterface[]> {
    return this.getProductsByCategory('NzU3', 60);
  }
  async getProducTrick(): Promise<ProductInterface[]> {
    return this.getProductsByCategory('NzU4', 60);
  }
  async getProducPromotion(): Promise<ProductInterface[]> {
    return this.getProductsByCategory('NzU5', 60);
  }

  async getPhoneProducts(): Promise<ProductInterface[]> {
    return this.searchProducts({
      search: 'iphone samsung',
      pageSize: 200,
    });
  }

  async getLaptopProducts(): Promise<ProductInterface[]> {
    return this.searchProducts({
      search: 'laptop macbook',
      pageSize: 50,
    });
  }

  // Validate product selection for posts
  async validateProductSelection(
    productKeys: string[],
  ): Promise<ProductInterface[]> {
    if (!productKeys || productKeys.length === 0) {
      return [];
    }

    const allProducts: ProductInterface[] = [];

    // Search for each product by url_key
    for (const urlKey of productKeys) {
      try {
        const products = await this.searchProducts({
          search: urlKey,
          pageSize: 5,
        });

        // Find exact match by url_key
        const exactMatch = products.find((p) => p.url_key === urlKey);
        if (exactMatch) {
          allProducts.push(exactMatch);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to validate product: ${urlKey}`,
          error.message,
        );
      }
    }

    return allProducts;
  }
}
