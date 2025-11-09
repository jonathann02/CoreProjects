namespace Catalog.Domain;

public class Product : IEquatable<Product>
{
    public Guid Id { get; private set; }
    public string Sku { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public decimal Price { get; private set; }
    public string Currency { get; private set; } = string.Empty;
    public int StockQty { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private Product() { } // EF Core constructor

    private Product(Guid id, string sku, string name, string description, decimal price, string currency, int stockQty)
    {
        Id = id;
        Sku = sku;
        Name = name;
        Description = description;
        Price = price;
        Currency = currency;
        StockQty = stockQty;
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public static Product Create(string sku, string name, string description, decimal price, string currency, int stockQty)
    {
        ValidateSku(sku);
        ValidateName(name);
        ValidateDescription(description);
        ValidatePrice(price);
        ValidateCurrency(currency);
        ValidateStockQty(stockQty);

        return new Product(Guid.NewGuid(), sku, name, description, price, currency, stockQty);
    }

    public static Product FromExisting(Guid id, string sku, string name, string description, decimal price, string currency, int stockQty, bool isActive, DateTime createdAt, DateTime updatedAt)
    {
        // For existing entities, we trust the data from the database
        // and don't re-validate to avoid issues with legacy data
        return new Product
        {
            Id = id,
            Sku = sku,
            Name = name,
            Description = description,
            Price = price,
            Currency = currency,
            StockQty = stockQty,
            IsActive = isActive,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt
        };
    }

    public void Update(string name, string description, decimal price, string currency, int stockQty)
    {
        ValidateName(name);
        ValidateDescription(description);
        ValidatePrice(price);
        ValidateCurrency(currency);
        ValidateStockQty(stockQty);

        Name = name;
        Description = description;
        Price = price;
        Currency = currency;
        StockQty = stockQty;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reactivate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }

    private static void ValidateSku(string sku)
    {
        if (string.IsNullOrWhiteSpace(sku))
            throw new ArgumentException("SKU cannot be empty", nameof(sku));

        if (sku.Length > 50)
            throw new ArgumentException("SKU cannot exceed 50 characters", nameof(sku));

        if (!sku.All(char.IsLetterOrDigit))
            throw new ArgumentException("SKU can only contain letters and digits", nameof(sku));
    }

    private static void ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name cannot be empty", nameof(name));

        if (name.Length > 200)
            throw new ArgumentException("Name cannot exceed 200 characters", nameof(name));
    }

    private static void ValidateDescription(string description)
    {
        if (description.Length > 1000)
            throw new ArgumentException("Description cannot exceed 1000 characters", nameof(description));
    }

    private static void ValidatePrice(decimal price)
    {
        if (price < 0)
            throw new ArgumentException("Price cannot be negative", nameof(price));

        if (price > 999999.99m)
            throw new ArgumentException("Price cannot exceed 999,999.99", nameof(price));
    }

    private static void ValidateCurrency(string currency)
    {
        if (string.IsNullOrWhiteSpace(currency))
            throw new ArgumentException("Currency cannot be empty", nameof(currency));

        if (currency.Length != 3 || !currency.All(char.IsUpper))
            throw new ArgumentException("Currency must be a valid 3-letter uppercase ISO code", nameof(currency));
    }

    private static void ValidateStockQty(int stockQty)
    {
        if (stockQty < 0)
            throw new ArgumentException("Stock quantity cannot be negative", nameof(stockQty));

        if (stockQty > 999999)
            throw new ArgumentException("Stock quantity cannot exceed 999,999", nameof(stockQty));
    }

    public bool Equals(Product? other)
    {
        if (other is null) return false;
        if (ReferenceEquals(this, other)) return true;
        return Id.Equals(other.Id);
    }

    public override bool Equals(object? obj)
    {
        if (obj is null) return false;
        if (obj.GetType() != typeof(Product)) return false;
        return Equals((Product)obj);
    }

    public override int GetHashCode()
    {
        return Id.GetHashCode();
    }
}
