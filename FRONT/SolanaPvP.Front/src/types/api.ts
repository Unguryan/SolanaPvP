// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Paging {
  page: number;
  pageSize: number;
}

export interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}
