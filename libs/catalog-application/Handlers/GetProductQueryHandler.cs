using Catalog.Application.DTOs;
using Catalog.Application.Queries;
using Catalog.Domain;
using MediatR;

namespace Catalog.Application.Handlers;

public class GetProductQueryHandler : IRequestHandler<GetProductQuery, ProductDto?>
{
    private readonly IProductRepository _productRepository;

    public GetProductQueryHandler(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public async Task<ProductDto?> Handle(GetProductQuery request, CancellationToken cancellationToken)
    {
        var product = await _productRepository.GetByIdAsync(request.Id, cancellationToken);
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
