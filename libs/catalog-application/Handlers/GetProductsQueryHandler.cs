using Catalog.Application.DTOs;
using Catalog.Application.Queries;
using Catalog.Domain;
using MediatR;

namespace Catalog.Application.Handlers;

public class GetProductsQueryHandler : IRequestHandler<GetProductsQuery, PagedResult<ProductDto>>
{
    private readonly IProductRepository _productRepository;

    public GetProductsQueryHandler(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public async Task<PagedResult<ProductDto>> Handle(GetProductsQuery request, CancellationToken cancellationToken)
    {
        // Validate and sanitize sort parameters
        var allowedSortFields = new[] { "Name", "Sku", "Price", "CreatedAt", "UpdatedAt" };
        var sortBy = allowedSortFields.Contains(request.SortBy ?? "Name", StringComparer.OrdinalIgnoreCase)
            ? request.SortBy
            : "Name";

        var sortOrder = (request.SortOrder ?? "asc").ToLowerInvariant() == "desc" ? "desc" : "asc";

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var products = await _productRepository.GetPagedAsync(
            page,
            pageSize,
            request.Search,
            sortBy,
            sortOrder,
            cancellationToken);

        var totalCount = await _productRepository.GetTotalCountAsync(request.Search, cancellationToken);
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
