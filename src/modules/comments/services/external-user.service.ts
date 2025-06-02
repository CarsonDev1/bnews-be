import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalUser } from '../interfaces/external-user.interface';

@Injectable()
export class ExternalUserService {
  constructor(private configService: ConfigService) {}

  async getUserFromGraphQL(token: string): Promise<ExternalUser> {
    try {
      // Replace with your actual GraphQL endpoint
      const graphqlEndpoint =
        this.configService.get<string>('GRAPHQL_USER_ENDPOINT') ||
        'https://your-api.com/graphql';

      const query = `
        query GetCustomer {
          customer {
            email
            firstname
            lastname
            middlename
            mobile_number
            picture
            ranking {
              ranking
              ranking_next
              total_points
              uneven_points
            }
          }
        }
      `;

      const response = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // or whatever auth header format you use
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new UnauthorizedException(
          'Failed to authenticate with external user service',
        );
      }

      const data = await response.json();

      if (!data.data?.customer) {
        throw new UnauthorizedException(
          'Invalid user data from external service',
        );
      }

      return data;
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch user data from external service',
      );
    }
  }

  extractUserInfo(externalUser: ExternalUser) {
    const { customer } = externalUser;

    return {
      externalUserId: customer.email, // Use email as unique identifier
      authorName: `${customer.firstname} ${customer.lastname}`.trim(),
      authorEmail: customer.email,
      authorAvatar: customer.picture || '',
      authorMobile: customer.mobile_number,
      authorRanking: customer.ranking?.[0]?.ranking || '',
    };
  }
}
