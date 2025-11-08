using Catalog.Application.Commands;
using Catalog.Domain;

namespace Catalog.Application.Handlers;

public class UpdateProductCommandHandler
{
    private readonly IProductRepository _productRepository;

    public UpdateProductCommandHandler(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public async Task<Product> HandleAsync(UpdateProductCommand command, CancellationToken cancellationToken = default)
    {
        var product = await _productRepository.GetByIdAsync(command.Id, cancellationToken);
        if (product is null)
        {
            throw new InvalidOperationException($"Product with ID {command.Id} not found");
        }

        product.Update(
            command.Name,
            command.Description,
            command.Price,
            command.Currency,
            command.StockQty);

        await _productRepository.UpdateAsync(product, cancellationToken);
        await _productRepository.SaveChangesAsync(cancellationToken);

        return product;
    }
}
