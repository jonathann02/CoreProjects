using Catalog.Application.DTOs;
using MediatR;

namespace Catalog.Application.Commands;

public record CreateProductCommand(
    string Sku,
    string Name,
    string Description,
    decimal Price,
    string Currency,
    int StockQty) : IRequest<ProductDto>;
