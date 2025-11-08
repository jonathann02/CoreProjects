using System.Text.Json.Serialization;
using AspNetCoreRateLimit;
using Catalog.Api.Endpoints;
using Catalog.Application.Handlers;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

namespace Catalog.Api;

public class TestStartup
{
    public TestStartup(IConfiguration configuration)
    {
        Configuration = configuration;
    }

    public IConfiguration Configuration { get; }

    public void ConfigureServices(IServiceCollection services)
    {
        // Configure JSON options
        services.Configure<JsonOptions>(options =>
        {
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
            options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        });

        // Add services to the container
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();

        // Database - will be overridden in tests
        services.AddDbContext<CatalogDbContext>(options =>
        {
            var connectionString = Configuration.GetConnectionString("CatalogDatabase")
                ?? throw new InvalidOperationException("Database connection string is required");
            options.UseSqlServer(connectionString);
        });

        // Repositories
        services.AddScoped<IProductRepository, ProductRepository>();

        // Application handlers
        services.AddScoped<CreateProductCommandHandler>();
        services.AddScoped<UpdateProductCommandHandler>();
        services.AddScoped<DeleteProductCommandHandler>();
        services.AddScoped<GetProductQueryHandler>();
        services.AddScoped<GetProductsQueryHandler>();

        // Simplified auth for testing (no JWT validation)
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = "https://test-authority";
                options.Audience = "catalog-api";
                options.RequireHttpsMetadata = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = false,
                    ValidateIssuerSigningKey = false,
                    ClockSkew = TimeSpan.Zero
                };
            });

        // Authorization policies
        services.AddAuthorizationBuilder()
            .AddPolicy("products:write", policy =>
                policy.RequireAuthenticatedUser());

        // Health checks
        services.AddHealthChecks()
            .AddDbContextCheck<CatalogDbContext>("database", HealthStatus.Unhealthy, ["readiness"])
            .AddCheck("self", () => HealthCheckResult.Healthy(), ["liveness"]);

        // Rate limiting (disabled for tests)
        services.AddMemoryCache();
        services.Configure<IpRateLimitOptions>(Configuration.GetSection("IpRateLimiting"));
        services.AddSingleton<IIpPolicyStore, MemoryCacheIpPolicyStore>();
        services.AddSingleton<IRateLimitCounterStore, MemoryCacheRateLimitCounterStore>();
        services.AddSingleton<IProcessingStrategy, AsyncKeyLockProcessingStrategy>();
        services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
        services.AddInMemoryRateLimiting();

        // CORS
        services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            });
        });

        // OpenTelemetry (simplified for tests)
        services.AddOpenTelemetry()
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation()
                .AddEntityFrameworkCoreInstrumentation())
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation());
    }

    public void Configure(WebApplication app)
    {
        // Configure the HTTP request pipeline
        if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        // Security headers (simplified for tests)
        app.Use(async (context, next) =>
        {
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            await next();
        });

        app.UseCors();
        app.UseAuthentication();
        app.UseAuthorization();

        // Rate limiting disabled for tests
        // app.UseIpRateLimiting();

        // Health checks
        app.MapHealthChecks("/health/live", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains("liveness"),
            ResponseWriter = async (context, report) =>
            {
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"status\":\"Healthy\"}");
            }
        });

        app.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains("readiness"),
            ResponseWriter = async (context, report) =>
            {
                context.Response.ContentType = "application/json";
                var status = report.Status == HealthStatus.Healthy ? "Healthy" : "Unhealthy";
                await context.Response.WriteAsync($"{{\"status\":\"{status}\"}}");
            }
        });

        // Map API endpoints
        app.MapProductEndpoints();

        app.Run();
    }
}
