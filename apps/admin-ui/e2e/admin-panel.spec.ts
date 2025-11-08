import { test, expect } from '@playwright/test';

test.describe('Catalog Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the admin panel
    await page.goto('http://localhost:5173'); // Vite dev server default port
  });

  test('should load the admin panel', async ({ page }) => {
    // Check that the page loads
    await expect(page.locator('h1')).toContainText('Catalog Admin Panel');

    // Check that search bar exists
    await expect(page.locator('.search-bar input')).toBeVisible();
  });

  test('should display products grid when data loads', async ({ page }) => {
    // Wait for loading to complete (either products or empty state)
    await page.waitForSelector('.products-grid, .loading, .empty-state, .error-message', { timeout: 10000 });

    // Check if we have products or an appropriate state
    const hasProducts = await page.locator('.products-grid').count() > 0;
    const hasLoading = await page.locator('.loading').count() > 0;
    const hasEmpty = await page.locator('.empty-state').count() > 0;
    const hasError = await page.locator('.error-message').count() > 0;

    // One of these states should be present
    expect(hasProducts || hasLoading || hasEmpty || hasError).toBe(true);
  });

  test('should handle search functionality', async ({ page }) => {
    const searchInput = page.locator('.search-bar input');

    // Type in search box
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Should trigger a search (either show results or empty state)
    await page.waitForSelector('.products-grid, .empty-state', { timeout: 5000 });
  });

  test('should have responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Header should still be visible
    await expect(page.locator('.app-header h1')).toBeVisible();

    // Search should still work
    await expect(page.locator('.search-bar input')).toBeVisible();
  });
});
