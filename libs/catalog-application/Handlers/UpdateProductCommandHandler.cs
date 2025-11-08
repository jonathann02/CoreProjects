using Catalog.Application.Commands;
using Catalog.Application.DTOs;
using Catalog.Domain;
using MediatR;

namespace Catalog.Application.Handlers;

public class UpdateProductCommandHandler : IRequestHandler<UpdateProductCommand, ProductDto>
{
    private readonly IProductRepository _productRepository;

    public UpdateProductCommandHandler(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public async Task<ProductDto> Handle(UpdateProductCommand request, CancellationToken cancellationToken)
    {
        var product = await _productRepository.GetByIdAsync(request.Id, cancellationToken);
        if (product is null)
        {
            throw new InvalidOperationException($"Product with ID {request.Id} not found");
        }

        product.Update(
            request.Name,
            request.Description,
            request.Price,
            request.Currency,
            request.StockQty);

        await _productRepository.UpdateAsync(product, cancellationToken);
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
