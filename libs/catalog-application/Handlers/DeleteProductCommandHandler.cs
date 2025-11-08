using Catalog.Application.Commands;
using Catalog.Domain;
using MediatR;

namespace Catalog.Application.Handlers;

public class DeleteProductCommandHandler : IRequestHandler<DeleteProductCommand>
{
    private readonly IProductRepository _productRepository;

    public DeleteProductCommandHandler(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public async Task Handle(DeleteProductCommand request, CancellationToken cancellationToken)
    {
        var product = await _productRepository.GetByIdAsync(request.Id, cancellationToken);
        if (product is null)
        {
            throw new InvalidOperationException($"Product with ID {request.Id} not found");
        }

        product.Deactivate();

        await _productRepository.UpdateAsync(product, cancellationToken);
        await _productRepository.SaveChangesAsync(cancellationToken);
    }
}
