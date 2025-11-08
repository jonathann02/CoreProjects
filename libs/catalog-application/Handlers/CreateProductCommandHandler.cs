using Catalog.Application.Commands;
using Catalog.Application.DTOs;
using Catalog.Domain;
using MediatR;

namespace Catalog.Application.Handlers;

public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, ProductDto>
{
    private readonly IProductRepository _productRepository;

    public CreateProductCommandHandler(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public async Task<ProductDto> Handle(CreateProductCommand request, CancellationToken cancellationToken)
    {
        var product = Product.Create(
            request.Sku,
            request.Name,
            request.Description,
            request.Price,
            request.Currency,
            request.StockQty);

        await _productRepository.AddAsync(product, cancellationToken);
        await _productRepository.SaveChangesAsync(cancellationToken);

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
