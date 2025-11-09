#pragma warning disable CS8632, CS8604
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Catalog.Application.DTOs;
using Catalog.Application.Queries;
using Catalog.Infrastructure;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Testcontainers.MsSql;
using Xunit;

namespace Catalog.IntegrationTests;

public class CatalogApiIntegrationTests : IAsyncLifetime
{
    private readonly MsSqlContainer _dbContainer;
    private CustomWebApplicationFactory? _factory;
    private HttpClient? _client;

    public CatalogApiIntegrationTests()
    {
        _dbContainer = new MsSqlBuilder()
            .WithImage("mcr.microsoft.com/mssql/server:2022-latest")
            .WithPassword("YourStrong!Passw0rd")
            .Build();
    }

    public async Task InitializeAsync()
    {
        await _dbContainer.StartAsync();

        _factory = new CustomWebApplicationFactory(_dbContainer.GetConnectionString());

        // Create a scope to run migrations
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
        await dbContext.Database.MigrateAsync();

        _client = _factory!.CreateClient();
    }

    public async Task DisposeAsync()
    {
        await _dbContainer.StopAsync();
        await _dbContainer.DisposeAsync();
        _client?.Dispose();
        if (_factory is not null) await _factory.DisposeAsync();
    }

    private HttpClient GetClient()
    {
        return _client!;
    }

    private string GenerateJwtToken(string userId = "test-user", string[] roles = null)
    {
        roles ??= new[] { "ADMIN" };

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Name, "test@example.com"),
            new Claim("username", "testuser"),
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim(JwtRegisteredClaimNames.Email, "test@example.com")
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
            claims.Add(new Claim("roles", role)); // Custom claim for our app
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("test-secret-key-for-integration-tests-only"));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: "test-issuer",
            audience: "catalog-api",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private HttpClient GetAuthenticatedClient(string userId = "test-user", string[] roles = null)
    {
        var client = _factory!.CreateClient();
        var token = GenerateJwtToken(userId, roles);
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task CreateProduct_WithAuthentication_ShouldReturnCreatedProduct()
    {
        // Arrange
        var request = new
        {
            Sku = "TEST123",
            Name = "Test Product",
            Description = "A test product description",
            Price = 99.99m,
            Currency = "USD",
            StockQty = 10
        };

        // Act
        var response = await GetAuthenticatedClient().PostAsJsonAsync("/v1/products", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var product = await response.Content.ReadFromJsonAsync<ProductDto>();
        product.Should().NotBeNull();
        product!.Sku.Should().Be(request.Sku);
        product.Name.Should().Be(request.Name);
        product.Description.Should().Be(request.Description);
        product.Price.Should().Be(request.Price);
        product.Currency.Should().Be(request.Currency);
        product.StockQty.Should().Be(request.StockQty);
        product.IsActive.Should().BeTrue();
        product.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(10));
    }

    [Fact]
    public async Task CreateProduct_WithoutAuthentication_ShouldReturnUnauthorized()
    {
        // Arrange
        var request = new
        {
            Sku = "UNAUTHCREATE",
            Name = "Unauthorized Create Product",
            Description = "Product created without auth",
            Price = 19.99m,
            Currency = "USD",
            StockQty = 5
        };

        // Act
        var response = await GetClient().PostAsJsonAsync("/v1/products", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetProduct_WithAuthentication_ShouldReturnExistingProduct()
    {
        // Arrange
        var createRequest = new
        {
            Sku = "GETTEST",
            Name = "Get Test Product",
            Description = "Product for get test",
            Price = 49.99m,
            Currency = "EUR",
            StockQty = 5
        };

        var createResponse = await GetAuthenticatedClient().PostAsJsonAsync("/v1/products", createRequest);
        var createdProduct = await createResponse.Content.ReadFromJsonAsync<ProductDto>();

        // Act
        var response = await GetAuthenticatedClient().GetAsync($"/v1/products/{createdProduct!.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var product = await response.Content.ReadFromJsonAsync<ProductDto>();
        product.Should().NotBeNull();
        product!.Id.Should().Be(createdProduct.Id);
        product.Sku.Should().Be(createRequest.Sku);
        product.Name.Should().Be(createRequest.Name);
    }

    [Fact]
    public async Task GetProduct_WithoutAuthentication_ShouldReturnUnauthorized()
    {
        // Arrange
        var createRequest = new
        {
            Sku = "UNAUTHGETTEST",
            Name = "Unauthorized Get Test Product",
            Description = "Product for unauthorized get test",
            Price = 29.99m,
            Currency = "USD",
            StockQty = 10
        };

        var createResponse = await GetAuthenticatedClient().PostAsJsonAsync("/v1/products", createRequest);
        var createdProduct = await createResponse.Content.ReadFromJsonAsync<ProductDto>();

        // Act - Try to get product without authentication
        var response = await GetClient().GetAsync($"/v1/products/{createdProduct!.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetProduct_WithInvalidId_ShouldReturnNotFound()
    {
        // Act
        var response = await GetClient().GetAsync("/v1/products/00000000-0000-0000-0000-000000000000");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetProducts_ShouldReturnPagedResults()
    {
        // Arrange - Create multiple products
        var products = new[]
        {
            new { Sku = "PROD001", Name = "Product One", Price = 10.99m, Currency = "USD", StockQty = 100 },
            new { Sku = "PROD002", Name = "Product Two", Price = 20.99m, Currency = "USD", StockQty = 50 },
            new { Sku = "PROD003", Name = "Product Three", Price = 30.99m, Currency = "USD", StockQty = 25 }
        };

        foreach (var product in products)
        {
            await GetAuthenticatedClient().PostAsJsonAsync("/v1/products", product);
        }

        // Act
        var response = await GetClient().GetAsync("/v1/products?page=1&pageSize=2");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<PagedResult<ProductDto>>();
        result.Should().NotBeNull();
        result!.Items.Should().HaveCount(2);
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(2);
        result.TotalCount.Should().BeGreaterThanOrEqualTo(3);
        result.HasNextPage.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateProduct_ShouldModifyExistingProduct()
    {
        // Arrange
        var createRequest = new
        {
            Sku = "UPDATETEST",
            Name = "Update Test Product",
            Description = "Original description",
            Price = 19.99m,
            Currency = "USD",
            StockQty = 15
        };

        var createResponse = await GetAuthenticatedClient().PostAsJsonAsync("/v1/products", createRequest);
        var createdProduct = await createResponse.Content.ReadFromJsonAsync<ProductDto>();

        var updateRequest = new
        {
            Name = "Updated Product Name",
            Description = "Updated description",
            Price = 29.99m,
            Currency = "EUR",
            StockQty = 20
        };

        // Act
        var response = await GetClient().PutAsJsonAsync($"/v1/products/{createdProduct!.Id}", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var updatedProduct = await response.Content.ReadFromJsonAsync<ProductDto>();
        updatedProduct.Should().NotBeNull();
        updatedProduct!.Id.Should().Be(createdProduct.Id);
        updatedProduct.Sku.Should().Be(createdProduct.Sku); // SKU should not change
        updatedProduct.Name.Should().Be(updateRequest.Name);
        updatedProduct.Description.Should().Be(updateRequest.Description);
        updatedProduct.Price.Should().Be(updateRequest.Price);
        updatedProduct.Currency.Should().Be(updateRequest.Currency);
        updatedProduct.StockQty.Should().Be(updateRequest.StockQty);
        updatedProduct.UpdatedAt.Should().BeAfter(updatedProduct.CreatedAt);
    }

    [Fact]
    public async Task UpdateProduct_WithInvalidId_ShouldReturnNotFound()
    {
        // Arrange
        var updateRequest = new
        {
            Name = "Non-existent Product",
            Description = "This should fail",
            Price = 9.99m,
            Currency = "USD",
            StockQty = 1
        };

        // Act
        var response = await GetClient().PutAsJsonAsync("/v1/products/00000000-0000-0000-0000-000000000000", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteProduct_ShouldSoftDeleteProduct()
    {
        // Arrange
        var createRequest = new
        {
            Sku = "DELETETEST",
            Name = "Delete Test Product",
            Description = "To be deleted",
            Price = 5.99m,
            Currency = "USD",
            StockQty = 1
        };

        var createResponse = await GetAuthenticatedClient().PostAsJsonAsync("/v1/products", createRequest);
        var createdProduct = await createResponse.Content.ReadFromJsonAsync<ProductDto>();

        // Act - Delete
        var deleteResponse = await GetAuthenticatedClient().DeleteAsync($"/v1/products/{createdProduct!.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Assert - Should not be found when getting by ID
        var getResponse = await _client.GetAsync($"/v1/products/{createdProduct.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteProduct_WithInvalidId_ShouldReturnNotFound()
    {
        // Act
        var response = await GetClient().DeleteAsync("/v1/products/00000000-0000-0000-0000-000000000000");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("", "Name", "Description", 10.0, "USD", 1)] // Empty SKU
    [InlineData("SKU", "", "Description", 10.0, "USD", 1)] // Empty name
    [InlineData("SKU", "Name", "Description", 0, "USD", 1)] // Zero price
    [InlineData("SKU", "Name", "Description", 10.0, "US", 1)] // Invalid currency
    [InlineData("SKU", "Name", "Description", 10.0, "USD", -1)] // Negative stock
    public async Task CreateProduct_WithInvalidData_ShouldReturnValidationError(
        string sku, string name, string description, decimal price, string currency, int stockQty)
    {
        // Arrange
        var request = new
        {
            Sku = sku,
            Name = name,
            Description = description,
            Price = price,
            Currency = currency,
            StockQty = stockQty
        };

        // Act
        var response = await GetClient().PostAsJsonAsync("/v1/products", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task FullCrudWorkflow_ShouldWorkCorrectly()
    {
        // Create
        var createRequest = new
        {
            Sku = "FULLCRUD",
            Name = "Full CRUD Test",
            Description = "Testing complete workflow",
            Price = 15.99m,
            Currency = "USD",
            StockQty = 10
        };

        var createResponse = await GetAuthenticatedClient().PostAsJsonAsync("/v1/products", createRequest);
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var product = await createResponse.Content.ReadFromJsonAsync<ProductDto>();
        product.Should().NotBeNull();

        // Read
        var getResponse = await GetAuthenticatedClient().GetAsync($"/v1/products/{product!.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var retrievedProduct = await getResponse.Content.ReadFromJsonAsync<ProductDto>();
        retrievedProduct.Should().BeEquivalentTo(product);

        // Update
        var updateRequest = new
        {
            Name = "Updated Full CRUD Test",
            Description = "Updated description",
            Price = 25.99m,
            Currency = "EUR",
            StockQty = 15
        };

        var updateResponse = await GetAuthenticatedClient().PutAsJsonAsync($"/v1/products/{product.Id}", updateRequest);
        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var updatedProduct = await updateResponse.Content.ReadFromJsonAsync<ProductDto>();
        updatedProduct!.Name.Should().Be(updateRequest.Name);
        updatedProduct.Price.Should().Be(updateRequest.Price);

        // Delete
        var deleteResponse = await GetAuthenticatedClient().DeleteAsync($"/v1/products/{product.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify deletion
        var finalGetResponse = await GetAuthenticatedClient().GetAsync($"/v1/products/{product.Id}");
        finalGetResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateProduct_WithInsufficientRole_ShouldReturnForbidden()
    {
        // Arrange - Create user with VIEWER role (not ADMIN)
        var request = new
        {
            Sku = "NOROLECREATE",
            Name = "No Role Create Product",
            Description = "Product created with insufficient role",
            Price = 9.99m,
            Currency = "USD",
            StockQty = 1
        };

        // Act - Try to create with VIEWER role only
        var response = await GetAuthenticatedClient("viewer-user", new[] { "VIEWER" }).PostAsJsonAsync("/v1/products", request);

        // Assert - Should be forbidden due to missing role
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

// Custom WebApplicationFactory for integration tests
public class CustomWebApplicationFactory : WebApplicationFactory<Catalog.Api.TestStartup>
{
    private readonly string _connectionString;

    public CustomWebApplicationFactory(string connectionString)
    {
        _connectionString = connectionString;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove the existing DbContext registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<CatalogDbContext>));
            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            // Add DbContext using TestContainer connection string
            services.AddDbContext<CatalogDbContext>(options =>
            {
                options.UseSqlServer(_connectionString);
            });
        });

        // Configure test-specific settings
        builder.UseEnvironment("Testing");
    }
}
