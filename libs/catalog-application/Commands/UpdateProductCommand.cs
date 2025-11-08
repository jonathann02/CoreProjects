using Catalog.Application.DTOs;
using MediatR;

namespace Catalog.Application.Commands;

public record UpdateProductCommand(
    Guid Id,
    string Name,
    string Description,
    decimal Price,
    string Currency,
    int StockQty) : IRequest<ProductDto>;
