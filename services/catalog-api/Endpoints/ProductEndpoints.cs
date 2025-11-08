using System.ComponentModel.DataAnnotations;
using Catalog.Api.Validation;
using Catalog.Application.Commands;
using Catalog.Application.DTOs;
using Catalog.Application.Handlers;
using Catalog.Application.Queries;
using Microsoft.AspNetCore.Mvc;

namespace Catalog.Api.Endpoints;

public static class ProductEndpoints
{
    public static void MapProductEndpoints(this WebApplication app)
    {
        var products = app.MapGroup("/v1/products")
            .WithTags("Products")
            .WithOpenApi();

        // POST /v1/products - Create product
        products.MapPost("/", async (
            [FromBody] CreateProductRequest request,
            CreateProductCommandHandler handler,
            CancellationToken cancellationToken) =>
        {
            var command = new CreateProductCommand(
                request.Sku,
                request.Name,
                request.Description ?? "",
                request.Price,
                request.Currency,
                request.StockQty);

            var product = await handler.HandleAsync(command, cancellationToken);

            var response = new ProductDto(
                product.Id,
                product.Sku,
                product.Name,
                product.Description,
                product.Price,
                product.Currency,
                product.StockQty,
                product.IsActive,
                product.CreatedAt,
                product.UpdatedAt);

            return Results.Created($"/v1/products/{product.Id}", response);
        })
        .WithSummary("Create a new product")
        .RequireAuthorization("products:write")
        .WithValidation<CreateProductRequest>();

        // GET /v1/products/{id} - Get product by ID
        products.MapGet("/{id:guid}", async (
            Guid id,
            GetProductQueryHandler handler,
            CancellationToken cancellationToken) =>
        {
            var query = new GetProductQuery(id);
            var product = await handler.HandleAsync(query, cancellationToken);

            return product is not null
                ? Results.Ok(product)
                : Results.NotFound(new ProblemDetails
                {
                    Title = "Product not found",
                    Detail = $"No product found with ID {id}",
                    Status = StatusCodes.Status404NotFound,
                    Type = "https://tools.ietf.org/html/rfc7231#section-6.5.4"
                });
        })
        .WithSummary("Get a product by ID")
        .Produces<ProductDto>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status404NotFound);

        // GET /v1/products - Get products with pagination
        products.MapGet("/", async (
            [AsParameters] GetProductsRequest request,
            GetProductsQueryHandler handler,
            CancellationToken cancellationToken) =>
        {
            var query = new GetProductsQuery(
                request.Search,
                request.Page,
                request.PageSize,
                request.SortBy,
                request.SortOrder);

            var result = await handler.HandleAsync(query, cancellationToken);
            return Results.Ok(result);
        })
        .WithSummary("Get products with pagination and filtering")
        .Produces<PagedResult<ProductDto>>(StatusCodes.Status200OK)
        .WithValidation<GetProductsRequest>();

        // PUT /v1/products/{id} - Update product
        products.MapPut("/{id:guid}", async (
            Guid id,
            [FromBody] UpdateProductRequest request,
            UpdateProductCommandHandler handler,
            CancellationToken cancellationToken) =>
        {
            var command = new UpdateProductCommand(
                id,
                request.Name,
                request.Description ?? "",
                request.Price,
                request.Currency,
                request.StockQty);

            try
            {
                var product = await handler.HandleAsync(command, cancellationToken);

                var response = new ProductDto(
                    product.Id,
                    product.Sku,
                    product.Name,
                    product.Description,
                    product.Price,
                    product.Currency,
                    product.StockQty,
                    product.IsActive,
                    product.CreatedAt,
                    product.UpdatedAt);

                return Results.Ok(response);
            }
            catch (InvalidOperationException)
            {
                return Results.NotFound(new ProblemDetails
                {
                    Title = "Product not found",
                    Detail = $"No product found with ID {id}",
                    Status = StatusCodes.Status404NotFound,
                    Type = "https://tools.ietf.org/html/rfc7231#section-6.5.4"
                });
            }
        })
        .WithSummary("Update an existing product")
        .RequireAuthorization("products:write")
        .WithValidation<UpdateProductRequest>();

        // DELETE /v1/products/{id} - Soft delete product
        products.MapDelete("/{id:guid}", async (
            Guid id,
            DeleteProductCommandHandler handler,
            CancellationToken cancellationToken) =>
        {
            var command = new DeleteProductCommand(id);

            try
            {
                await handler.HandleAsync(command, cancellationToken);
                return Results.NoContent();
            }
            catch (InvalidOperationException)
            {
                return Results.NotFound(new ProblemDetails
                {
                    Title = "Product not found",
                    Detail = $"No product found with ID {id}",
                    Status = StatusCodes.Status404NotFound,
                    Type = "https://tools.ietf.org/html/rfc7231#section-6.5.4"
                });
            }
        })
        .WithSummary("Soft delete a product")
        .RequireAuthorization("products:write");
    }
}

// Request DTOs
public record CreateProductRequest(
    [Required]
    [StringLength(50, MinimumLength = 1)]
    [RegularExpression(@"^[A-Za-z0-9]+$", ErrorMessage = "SKU can only contain letters and digits")]
    string Sku,

    [Required]
    [StringLength(200, MinimumLength = 1)]
    string Name,

    [StringLength(1000)]
    string? Description,

    [Required]
    [Range(0.01, 999999.99)]
    decimal Price,

    [Required]
    [StringLength(3, MinimumLength = 3)]
    [RegularExpression(@"^[A-Z]{3}$", ErrorMessage = "Currency must be a valid 3-letter uppercase ISO code")]
    string Currency,

    [Required]
    [Range(0, 999999)]
    int StockQty);

public record UpdateProductRequest(
    [Required]
    [StringLength(200, MinimumLength = 1)]
    string Name,

    [StringLength(1000)]
    string? Description,

    [Required]
    [Range(0.01, 999999.99)]
    decimal Price,

    [Required]
    [StringLength(3, MinimumLength = 3)]
    [RegularExpression(@"^[A-Z]{3}$", ErrorMessage = "Currency must be a valid 3-letter uppercase ISO code")]
    string Currency,

    [Required]
    [Range(0, 999999)]
    int StockQty);

public record GetProductsRequest(
    string? Search = null,

    [Range(1, int.MaxValue)]
    int Page = 1,

    [Range(1, 100)]
    int PageSize = 20,

    string? SortBy = "Name",
    string? SortOrder = "asc");
