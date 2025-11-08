using Catalog.Application.Commands;
using Catalog.Domain;

namespace Catalog.Application.Handlers;

public class CreateProductCommandHandler
{
    private readonly IProductRepository _productRepository;

    public CreateProductCommandHandler(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public async Task<Product> HandleAsync(CreateProductCommand command, CancellationToken cancellationToken = default)
    {
        var product = Product.Create(
            command.Sku,
            command.Name,
            command.Description,
            command.Price,
            command.Currency,
            command.StockQty);

        await _productRepository.AddAsync(product, cancellationToken);
        await _productRepository.SaveChangesAsync(cancellationToken);

        return product;
    }
}
