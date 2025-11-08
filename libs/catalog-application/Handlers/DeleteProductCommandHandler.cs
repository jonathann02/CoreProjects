using Catalog.Application.Commands;
using Catalog.Domain;

namespace Catalog.Application.Handlers;

public class DeleteProductCommandHandler
{
    private readonly IProductRepository _productRepository;

    public DeleteProductCommandHandler(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public async Task HandleAsync(DeleteProductCommand command, CancellationToken cancellationToken = default)
    {
        var product = await _productRepository.GetByIdAsync(command.Id, cancellationToken);
        if (product is null)
        {
            throw new InvalidOperationException($"Product with ID {command.Id} not found");
        }

        product.Deactivate();

        await _productRepository.UpdateAsync(product, cancellationToken);
        await _productRepository.SaveChangesAsync(cancellationToken);
    }
}
