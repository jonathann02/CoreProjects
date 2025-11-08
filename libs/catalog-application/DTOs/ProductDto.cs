namespace Catalog.Application.DTOs;

public record ProductDto(
    Guid Id,
    string Sku,
    string Name,
    string Description,
    decimal Price,
    string Currency,
    int StockQty,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);
