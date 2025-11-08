using Catalog.Application.DTOs;
using Catalog.Application.Queries;
using Catalog.Domain;

namespace Catalog.Application.Handlers;

public class GetProductsQueryHandler
{
    private readonly IProductRepository _productRepository;

    public GetProductsQueryHandler(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public async Task<PagedResult<ProductDto>> HandleAsync(GetProductsQuery query, CancellationToken cancellationToken = default)
    {
        // Validate and sanitize sort parameters
        var allowedSortFields = new[] { "Name", "Sku", "Price", "CreatedAt", "UpdatedAt" };
        var sortBy = allowedSortFields.Contains(query.SortBy ?? "Name", StringComparer.OrdinalIgnoreCase)
            ? query.SortBy
            : "Name";

        var sortOrder = (query.SortOrder ?? "asc").ToLowerInvariant() == "desc" ? "desc" : "asc";

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var products = await _productRepository.GetPagedAsync(
            page,
            pageSize,
            query.Search,
            sortBy,
            sortOrder,
            cancellationToken);

        var totalCount = await _productRepository.GetTotalCountAsync(query.Search, cancellationToken);
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

        var productDtos = products.Select(p => new ProductDto(
            p.Id,
            p.Sku,
            p.Name,
            p.Description,
            p.Price,
            p.Currency,
            p.StockQty,
            p.IsActive,
            p.CreatedAt,
            p.UpdatedAt));

        return new PagedResult<ProductDto>(
            productDtos,
            page,
            pageSize,
            totalCount,
            totalPages);
    }
}
