// API Types matching the backend
export interface ProductDto {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stockQty: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  stockQty: number;
}

export interface UpdateProductRequest {
  name: string;
  description?: string;
  price: number;
  currency: string;
  stockQty: number;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  [key: string]: any;
}
