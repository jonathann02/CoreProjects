namespace Catalog.Application.Queries;

public record GetProductsQuery(
    string? Search,
    int Page = 1,
    int PageSize = 20,
    string? SortBy = "Name",
    string? SortOrder = "asc");
