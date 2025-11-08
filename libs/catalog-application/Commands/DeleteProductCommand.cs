using MediatR;

namespace Catalog.Application.Commands;

public record DeleteProductCommand(Guid Id) : IRequest;
