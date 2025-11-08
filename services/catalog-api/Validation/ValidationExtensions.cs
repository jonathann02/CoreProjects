using System.ComponentModel.DataAnnotations;
using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Catalog.Api.Validation;

public static class ValidationExtensions
{
    public static RouteHandlerBuilder WithValidation<T>(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter(async (context, next) =>
        {
            var request = context.Arguments.FirstOrDefault(arg => arg?.GetType() == typeof(T));
            if (request is not null)
            {
                var validationResults = new List<ValidationResult>();
                var validationContext = new ValidationContext(request);

                if (!Validator.TryValidateObject(request, validationContext, validationResults, true))
                {
                    var errors = validationResults
                        .GroupBy(vr => GetPropertyName(request, vr.MemberNames.FirstOrDefault() ?? ""))
                        .ToDictionary(
                            g => g.Key,
                            g => g.Select(vr => vr.ErrorMessage ?? "Invalid value").ToArray());

                    return Results.ValidationProblem(
                        errors,
                        title: "One or more validation errors occurred",
                        type: "https://tools.ietf.org/html/rfc7231#section-6.5.1");
                }
            }

            return await next(context);
        });
    }

    private static string GetPropertyName(object obj, string memberName)
    {
        if (string.IsNullOrEmpty(memberName))
            return memberName;

        var property = obj.GetType().GetProperty(memberName);
        if (property is null)
            return memberName;

        var displayAttribute = property.GetCustomAttribute<DisplayAttribute>();
        return displayAttribute?.Name ?? memberName;
    }
}
