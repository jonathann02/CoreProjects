using System.Data;
using Catalog.Domain;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Catalog.Infrastructure;

public class ProductRepository : IProductRepository
{
    private readonly CatalogDbContext _dbContext;
    private readonly IDbConnection _dbConnection;
    private readonly ILogger<ProductRepository> _logger;

    public ProductRepository(CatalogDbContext dbContext, IDbConnection dbConnection, ILogger<ProductRepository> logger)
    {
        _dbContext = dbContext;
        _dbConnection = dbConnection;
        _logger = logger;
    }

    // Write operations using EF Core
    public async Task AddAsync(Product product, CancellationToken cancellationToken = default)
    {
        var entity = MapToEntity(product);
        await _dbContext.Products.AddAsync(entity, cancellationToken);
    }

    public Task UpdateAsync(Product product, CancellationToken cancellationToken = default)
    {
        var entity = MapToEntity(product);
        _dbContext.Products.Update(entity);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    // Read operations using Dapper
    public async Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            SELECT Id, Sku, Name, Description, Price, Currency, StockQty, IsActive, CreatedAt, UpdatedAt
            FROM Products
            WHERE Id = @Id AND IsActive = 1";

        var readModel = await _dbConnection.QuerySingleOrDefaultAsync<ProductReadModel>(sql, new { Id = id });
        return readModel is null ? null : MapToDomain(readModel);
    }

    public async Task<Product?> GetBySkuAsync(string sku, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            SELECT Id, Sku, Name, Description, Price, Currency, StockQty, IsActive, CreatedAt, UpdatedAt
            FROM Products
            WHERE Sku = @Sku AND IsActive = 1";

        var readModel = await _dbConnection.QuerySingleOrDefaultAsync<ProductReadModel>(sql, new { Sku = sku });
        return readModel is null ? null : MapToDomain(readModel);
    }

    public async Task<IEnumerable<Product>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        const string sql = @"
            SELECT Id, Sku, Name, Description, Price, Currency, StockQty, IsActive, CreatedAt, UpdatedAt
            FROM Products
            WHERE IsActive = 1
            ORDER BY Name";

        var readModels = await _dbConnection.QueryAsync<ProductReadModel>(sql);
        return readModels.Select(MapToDomain);
    }

    public async Task<IEnumerable<Product>> GetPagedAsync(int page, int pageSize, string? search = null, string? sortBy = null, string? sortOrder = null, CancellationToken cancellationToken = default)
    {
        var offset = (page - 1) * pageSize;

        // Build WHERE clause for search
        var whereClause = "WHERE IsActive = 1";
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(search))
        {
            whereClause += " AND (Name LIKE @Search OR Sku LIKE @Search OR Description LIKE @Search)";
            parameters.Add("@Search", $"%{search}%");
        }

        // Build ORDER BY clause
        var orderBy = sortBy?.ToLower() switch
        {
            "sku" => "Sku",
            "price" => "Price",
            "createdat" => "CreatedAt",
            "updatedat" => "UpdatedAt",
            _ => "Name"
        };

        var sortDirection = sortOrder?.ToLower() == "desc" ? "DESC" : "ASC";
        var orderByClause = $"ORDER BY {orderBy} {sortDirection}";

        var sql = $@"
            SELECT Id, Sku, Name, Description, Price, Currency, StockQty, IsActive, CreatedAt, UpdatedAt
            FROM Products
            {whereClause}
            {orderByClause}
            OFFSET @Offset ROWS
            FETCH NEXT @PageSize ROWS ONLY";

        // Log query structure for debugging (without parameters to avoid sensitive data)
        _logger.LogDebug("Executing paged query with search: {HasSearch}, sort: {SortBy}", !string.IsNullOrWhiteSpace(search), sortBy);

        parameters.Add("@Offset", offset);
        parameters.Add("@PageSize", pageSize);

        var readModels = await _dbConnection.QueryAsync<ProductReadModel>(sql, parameters);
        return readModels.Select(MapToDomain);
    }

    public async Task<int> GetTotalCountAsync(string? search = null, CancellationToken cancellationToken = default)
    {
        var whereClause = "WHERE IsActive = 1";
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(search))
        {
            whereClause += " AND (Name LIKE @Search OR Sku LIKE @Search OR Description LIKE @Search)";
            parameters.Add("@Search", $"%{search}%");
        }

        var sql = $"SELECT COUNT(*) FROM Products {whereClause}";
        return await _dbConnection.ExecuteScalarAsync<int>(sql, parameters);
    }

    private static Product MapToDomain(ProductReadModel readModel)
    {
        // Create product using factory method that accepts existing data
        var product = Product.FromExisting(
            readModel.Id,
            readModel.Sku,
            readModel.Name,
            readModel.Description,
            readModel.Price,
            readModel.Currency,
            readModel.StockQty,
            readModel.IsActive,
            readModel.CreatedAt,
            readModel.UpdatedAt);

        return product;
    }

    private static ProductEntity MapToEntity(Product product)
    {
        return new ProductEntity
        {
            Id = product.Id,
            Sku = product.Sku,
            Name = product.Name,
            Description = product.Description,
            Price = product.Price,
            Currency = product.Currency,
            StockQty = product.StockQty,
            IsActive = product.IsActive,
            CreatedAt = product.CreatedAt,
            UpdatedAt = product.UpdatedAt
        };
    }
}
