export interface ExternalUser {
  customer: {
    email: string;
    firstname: string;
    lastname: string;
    middlename?: string;
    mobile_number?: string;
    picture?: string;
    ranking?: Array<{
      ranking: string;
      ranking_next: string;
      total_points: string;
      uneven_points: string;
    }>;
  };
}
