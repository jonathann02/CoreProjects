using Catalog.Application.DTOs;
using Catalog.Application.Queries;
using Catalog.Domain;

namespace Catalog.Application.Handlers;

public class GetProductQueryHandler
{
    private readonly IProductRepository _productRepository;

    public GetProductQueryHandler(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public async Task<ProductDto?> HandleAsync(GetProductQuery query, CancellationToken cancellationToken = default)
    {
        var product = await _productRepository.GetByIdAsync(query.Id, cancellationToken);
        if (product is null)
        {
            return null;
        }

        return new ProductDto(
            product.Id,
            product.Sku,
            product.Name,
            product.Description,
            product.Price,
            product.Currency,
            product.StockQty,
            product.IsActive,
            product.CreatedAt,
            product.UpdatedAt);
    }
}
