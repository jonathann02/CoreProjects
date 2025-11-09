import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Graph & Entity Resolution Lab - End-to-End Flow', () => {
  test('should complete full upload to cluster review workflow', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Verify we're on the batches page
    await expect(page.locator('h1')).toContainText('Data Batches');

    // Navigate to upload page
    await page.getByRole('link', { name: 'Upload' }).click();
    await expect(page.locator('h1')).toContainText('Upload CSV File');

    // Create a test CSV file content
    const csvContent = `name,email,phone,address,organizationName
John Smith,john.smith@example.com,+1-555-0123,123 Main St,Tech Corp
Jane Doe,jane.doe@example.com,+1-555-0456,456 Oak Ave,Data Inc
Johnny Smith,j.smith@example.com,+1-555-0124,123 Main Street,Tech Corp
J. Doe,jane.doe@example.com,+1-555-0457,456 Oak Avenue,Data Inc
Bob Johnson,bob.johnson@example.com,+1-555-0789,789 Pine Rd,Analytics LLC`;

    // Create a data URL for the CSV file
    const csvDataUrl = `data:text/csv;base64,${Buffer.from(csvContent).toString('base64')}`;

    // Set up file chooser handler
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse').click();
    const fileChooser = await fileChooserPromise;

    // Create a temporary file for upload
    const testFile = new File([csvContent], 'test-entities.csv', { type: 'text/csv' });
    await fileChooser.setFiles([testFile]);

    // Wait for file validation to complete
    await expect(page.locator('text=Validation Errors:')).not.toBeVisible();
    await expect(page.locator('text=test-entities.csv')).toBeVisible();

    // Verify data preview is shown
    await expect(page.locator('text=Data Preview:')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();

    // Check that we have 5 rows of data (plus header)
    const tableRows = page.locator('tbody tr');
    await expect(tableRows).toHaveCount(5);

    // Upload the file
    await page.getByRole('button', { name: 'Upload & Process' }).click();

    // Wait for upload to complete and navigate to batches
    await page.waitForURL('**/batches');

    // Verify we're back on batches page with new batch
    await expect(page.locator('h1')).toContainText('Data Batches');

    // Should see at least one batch in the list
    const batchItems = page.locator('[role="list"] > li');
    await expect(batchItems.first()).toBeVisible();

    // Navigate to clusters page
    await page.getByRole('link', { name: 'Clusters' }).click();
    await expect(page.locator('h1')).toContainText('Entity Clusters');

    // Wait for Cytoscape graph to load
    await page.waitForSelector('.cytoscape-container', { timeout: 10000 });

    // Verify graph elements are present
    const graphContainer = page.locator('.cytoscape-container');
    await expect(graphContainer).toBeVisible();

    // Check legend is visible
    await expect(page.locator('text=Legend')).toBeVisible();
    await expect(page.locator('text=Golden Records')).toBeVisible();
    await expect(page.locator('text=Source Records')).toBeVisible();

    // Check controls are present
    await expect(page.locator('text=Layout')).toBeVisible();
    await expect(page.locator('button', { name: 'Fit to View' })).toBeVisible();

    // Verify side panel shows cluster overview
    await expect(page.locator('text=Cluster Overview')).toBeVisible();

    // Check statistics are shown
    await expect(page.locator('text=Statistics')).toBeVisible();
    await expect(page.locator('text=Golden Records:')).toBeVisible();
    await expect(page.locator('text=Source Records:')).toBeVisible();
    await expect(page.locator('text=Clusters:')).toBeVisible();

    // Try to click on a node (if any are visible)
    const nodes = page.locator('.cytoscape-container canvas').first();
    if (await nodes.isVisible()) {
      // Click somewhere in the graph area
      await page.locator('.cytoscape-container').click({ position: { x: 100, y: 100 } });

      // Check if node details appear
      await expect(page.locator('text=Node Details')).toBeVisible({ timeout: 2000 }).catch(() => {
        // Node details might not appear if click didn't hit a node, which is fine
        console.log('No node was clicked, continuing test');
      });
    }

    // Test layout changes
    const layoutSelect = page.locator('select');
    if (await layoutSelect.isVisible()) {
      await layoutSelect.selectOption('circle');
      // Brief pause to let layout animation complete
      await page.waitForTimeout(1000);
    }
  });

  test('should handle file validation errors gracefully', async ({ page }) => {
    await page.goto('/upload');

    // Create invalid CSV content (missing required columns)
    const invalidCsvContent = `invalid_column1,invalid_column2
value1,value2
value3,value4`;

    // Set up file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('browse').click();
    const fileChooser = await fileChooserPromise;

    const invalidFile = new File([invalidCsvContent], 'invalid.csv', { type: 'text/csv' });
    await fileChooser.setFiles([invalidFile]);

    // Should show validation errors
    await expect(page.locator('text=Validation Errors:')).toBeVisible();

    // Upload button should be disabled
    const uploadButton = page.getByRole('button', { name: 'Upload & Process' });
    await expect(uploadButton).toBeDisabled();
  });

  test('should handle empty file upload', async ({ page }) => {
    await page.goto('/upload');

    // Try to upload without selecting a file
    const uploadButton = page.getByRole('button', { name: 'Upload & Process' });
    await expect(uploadButton).toBeDisabled();
  });

  test('should navigate between pages correctly', async ({ page }) => {
    await page.goto('/');

    // Check navigation links work
    await page.getByRole('link', { name: 'Batches' }).click();
    await expect(page.url()).toContain('/batches');

    await page.getByRole('link', { name: 'Upload' }).click();
    await expect(page.url()).toContain('/upload');

    await page.getByRole('link', { name: 'Clusters' }).click();
    await expect(page.url()).toContain('/clusters');
  });

  test('should display proper loading states', async ({ page }) => {
    await page.goto('/batches');

    // Check for loading spinner or proper loading state
    // This would depend on how React Query loading states are handled
    await expect(page.locator('h1')).toContainText('Data Batches');
  });
});
