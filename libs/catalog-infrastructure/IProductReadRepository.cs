using Catalog.Domain;

namespace Catalog.Infrastructure;

public interface IProductReadRepository
{
    Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Product?> GetBySkuAsync(string sku, CancellationToken cancellationToken = default);
    Task<IEnumerable<Product>> GetPagedAsync(int page, int pageSize, string? search = null, string? sortBy = null, string? sortOrder = null, CancellationToken cancellationToken = default);
    Task<int> GetTotalCountAsync(string? search = null, CancellationToken cancellationToken = default);
}
