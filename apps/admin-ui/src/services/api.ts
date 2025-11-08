import {
  ProductDto,
  PagedResult,
  CreateProductRequest,
  UpdateProductRequest,
  ProblemDetails
} from '../types/api';

const API_BASE_URL = 'http://localhost:8080';

class ApiError extends Error {
  public status: number;
  public problemDetails?: ProblemDetails;

  constructor(status: number, message: string, problemDetails?: ProblemDetails) {
    super(message);
    this.status = status;
    this.problemDetails = problemDetails;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let problemDetails: ProblemDetails | undefined;
    try {
      problemDetails = await response.json();
    } catch {
      // If we can't parse as JSON, just use the status text
    }

    throw new ApiError(
      response.status,
      problemDetails?.detail || problemDetails?.title || response.statusText,
      problemDetails
    );
  }

  return response.json();
}

export const api = {
  // Get products with pagination
  async getProducts(search?: string, page = 1, pageSize = 20): Promise<PagedResult<ProductDto>> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (search) {
      params.append('search', search);
    }

    const response = await fetch(`${API_BASE_URL}/v1/products?${params}`);
    return handleResponse<PagedResult<ProductDto>>(response);
  },

  // Get single product
  async getProduct(id: string): Promise<ProductDto> {
    const response = await fetch(`${API_BASE_URL}/v1/products/${id}`);
    return handleResponse<ProductDto>(response);
  },

  // Create product (requires authentication)
  async createProduct(product: CreateProductRequest, token?: string): Promise<ProductDto> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/v1/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(product),
    });

    return handleResponse<ProductDto>(response);
  },

  // Update product (requires authentication)
  async updateProduct(id: string, product: UpdateProductRequest, token?: string): Promise<ProductDto> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/v1/products/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(product),
    });

    return handleResponse<ProductDto>(response);
  },

  // Delete product (requires authentication)
  async deleteProduct(id: string, token?: string): Promise<void> {
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/v1/products/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      await handleResponse(response);
    }
  },
};
