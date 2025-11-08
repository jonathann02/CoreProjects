namespace Catalog.Application.Commands;

public record CreateProductCommand(
    string Sku,
    string Name,
    string Description,
    decimal Price,
    string Currency,
    int StockQty);
