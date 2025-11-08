using Catalog.Domain;

namespace Catalog.UnitTests;

public class ProductTests
{
    [Fact]
    public void Create_ValidParameters_CreatesProduct()
    {
        // Arrange
        var sku = "TEST123";
        var name = "Test Product";
        var description = "A test product";
        var price = 99.99m;
        var currency = "USD";
        var stockQty = 10;

        // Act
        var product = Product.Create(sku, name, description, price, currency, stockQty);

        // Assert
        Assert.NotEqual(Guid.Empty, product.Id);
        Assert.Equal(sku, product.Sku);
        Assert.Equal(name, product.Name);
        Assert.Equal(description, product.Description);
        Assert.Equal(price, product.Price);
        Assert.Equal(currency, product.Currency);
        Assert.Equal(stockQty, product.StockQty);
        Assert.True(product.IsActive);
        Assert.True(product.CreatedAt <= DateTime.UtcNow);
        Assert.True(product.UpdatedAt <= DateTime.UtcNow);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_InvalidSku_ThrowsArgumentException(string invalidSku)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Product.Create(invalidSku, "Name", "Description", 10.0m, "USD", 5));
        Assert.Contains("SKU", exception.Message);
    }

    [Fact]
    public void Create_SkuWithSpecialCharacters_ThrowsArgumentException()
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Product.Create("TEST-123", "Name", "Description", 10.0m, "USD", 5));
        Assert.Contains("SKU can only contain letters and digits", exception.Message);
    }

    [Fact]
    public void Create_SkuTooLong_ThrowsArgumentException()
    {
        // Arrange
        var longSku = new string('A', 51);

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Product.Create(longSku, "Name", "Description", 10.0m, "USD", 5));
        Assert.Contains("SKU cannot exceed 50 characters", exception.Message);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_InvalidName_ThrowsArgumentException(string invalidName)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Product.Create("SKU123", invalidName, "Description", 10.0m, "USD", 5));
        Assert.Contains("Name", exception.Message);
    }

    [Fact]
    public void Create_NameTooLong_ThrowsArgumentException()
    {
        // Arrange
        var longName = new string('A', 201);

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Product.Create("SKU123", longName, "Description", 10.0m, "USD", 5));
        Assert.Contains("Name cannot exceed 200 characters", exception.Message);
    }

    [Fact]
    public void Create_DescriptionTooLong_ThrowsArgumentException()
    {
        // Arrange
        var longDescription = new string('A', 1001);

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Product.Create("SKU123", "Name", longDescription, 10.0m, "USD", 5));
        Assert.Contains("Description cannot exceed 1000 characters", exception.Message);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(-0.01)]
    public void Create_NegativePrice_ThrowsArgumentException(decimal invalidPrice)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Product.Create("SKU123", "Name", "Description", invalidPrice, "USD", 5));
        Assert.Contains("Price cannot be negative", exception.Message);
    }

    [Fact]
    public void Create_PriceTooHigh_ThrowsArgumentException()
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Product.Create("SKU123", "Name", "Description", 1000000m, "USD", 5));
        Assert.Contains("Price cannot exceed", exception.Message);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("US")]
    [InlineData("USD1")]
    [InlineData("usd")]
    public void Create_InvalidCurrency_ThrowsArgumentException(string invalidCurrency)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Product.Create("SKU123", "Name", "Description", 10.0m, invalidCurrency, 5));
        Assert.Contains("Currency", exception.Message);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(-10)]
    public void Create_NegativeStockQty_ThrowsArgumentException(int invalidStockQty)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Product.Create("SKU123", "Name", "Description", 10.0m, "USD", invalidStockQty));
        Assert.Contains("Stock quantity cannot be negative", exception.Message);
    }

    [Fact]
    public void Create_StockQtyTooHigh_ThrowsArgumentException()
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Product.Create("SKU123", "Name", "Description", 10.0m, "USD", 1000000));
        Assert.Contains("Stock quantity cannot exceed", exception.Message);
    }

    [Fact]
    public void Update_ValidParameters_UpdatesProduct()
    {
        // Arrange
        var product = Product.Create("SKU123", "Original Name", "Original Description", 10.0m, "USD", 5);
        var newName = "Updated Name";
        var newDescription = "Updated Description";
        var newPrice = 20.0m;
        var newCurrency = "EUR";
        var newStockQty = 15;

        // Act
        product.Update(newName, newDescription, newPrice, newCurrency, newStockQty);

        // Assert
        Assert.Equal(newName, product.Name);
        Assert.Equal(newDescription, product.Description);
        Assert.Equal(newPrice, product.Price);
        Assert.Equal(newCurrency, product.Currency);
        Assert.Equal(newStockQty, product.StockQty);
        Assert.True(product.UpdatedAt > product.CreatedAt);
    }

    [Fact]
    public void Deactivate_SetsIsActiveToFalse()
    {
        // Arrange
        var product = Product.Create("SKU123", "Name", "Description", 10.0m, "USD", 5);

        // Act
        product.Deactivate();

        // Assert
        Assert.False(product.IsActive);
        Assert.True(product.UpdatedAt > product.CreatedAt);
    }

    [Fact]
    public void Reactivate_SetsIsActiveToTrue()
    {
        // Arrange
        var product = Product.Create("SKU123", "Name", "Description", 10.0m, "USD", 5);
        product.Deactivate();

        // Act
        product.Reactivate();

        // Assert
        Assert.True(product.IsActive);
        Assert.True(product.UpdatedAt > product.CreatedAt);
    }

    [Fact]
    public void Equals_DifferentId_ReturnsFalse()
    {
        // Arrange
        var product1 = Product.Create("SKU1", "Name1", "Desc1", 10.0m, "USD", 5);
        var product2 = Product.Create("SKU2", "Name2", "Desc2", 20.0m, "EUR", 10);

        // Act & Assert
        Assert.False(product1.Equals(product2));
        Assert.True(product1 != product2);
    }

    [Fact]
    public void Equals_Null_ReturnsFalse()
    {
        // Arrange
        var product = Product.Create("SKU123", "Name", "Description", 10.0m, "USD", 5);

        // Act & Assert
        Assert.False(product.Equals(null));
    }

    [Fact]
    public void Equals_SameReference_ReturnsTrue()
    {
        // Arrange
        var product = Product.Create("SKU123", "Name", "Description", 10.0m, "USD", 5);

        // Act & Assert
#pragma warning disable CS1718 // Comparison made to same variable
        Assert.True(product.Equals(product));
#pragma warning restore CS1718
    }
}
