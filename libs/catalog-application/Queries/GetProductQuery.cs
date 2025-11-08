using Catalog.Application.DTOs;
using MediatR;

namespace Catalog.Application.Queries;

public record GetProductQuery(Guid Id) : IRequest<ProductDto?>;
