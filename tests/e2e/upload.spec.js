import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Helper: mock all authenticated APIs that the upload page calls on load
async function mockAuthenticatedApis(page) {
  // Intercept login to bypass auth
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'mock-jwt-token', name: 'Test User', email: 'test@example.com' })
    });
  });

  // Mock upload history (called on mount — must be mocked or 401 will redirect)
  await page.route('**/api/reconciliation/uploads**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ uploads: [] })
    });
  });

  // Mock upload API
  await page.route('**/api/reconciliation/upload', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          uploads: [
            {
              type: 'gstr2b',
              filename: 'dummy_gstr2b.json',
              records: 1,
              size: 100,
              status: 'success',
              s3_url: 'mock-url'
            }
          ]
        })
      });
    } else {
      await route.continue();
    }
  });

  // Mock reconciliation run
  await page.route('**/api/reconciliation/run', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Mock reconciliation complete' })
    });
  });

  // Mock reconciliation summary (called after run)
  await page.route('**/api/reconciliation/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ exact: 10, partial: 2, missing: 1, duplicate: 0 })
    });
  });
}

test.describe('File Upload flow', () => {
  test('should upload GSTR-2B file and mock reconciliation results', async ({ page }) => {
    // Register catch-all FIRST (lowest priority — last-registered-wins in Playwright)
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });

    await mockAuthenticatedApis(page);

    // Login first
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('valid@example.com');
    await page.locator('input[type="password"]').fill('CorrectPassword123');
    await page.locator('button[type="submit"]').click({ force: true });
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

    // Go to upload page
    await page.goto('/dashboard/upload');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Data Upload")')).toBeVisible({ timeout: 15000 });

    // Create a dummy GSTR-2B file
    const randomSuffix = Math.random().toString(36).substring(7);
    const dummyFilePath = path.join(process.cwd(), `dummy_gstr2b_${randomSuffix}.json`);
    fs.writeFileSync(dummyFilePath, JSON.stringify([{ gstin: '29ABCDE1234F1Z5', invoice_no: 'INV-001' }]));

    // Upload GSTR-2B file (only one input now — PR section was removed)
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(dummyFilePath);

    // Wait for upload success UI
    await expect(page.locator(`text=${path.basename(dummyFilePath)}`)).toBeVisible({ timeout: 15000 });

    // Click Verify Compliance
    await page.click('button:has-text("Verify Compliance")', { force: true });

    // Wait for reconciliation success modal
    await expect(page.locator('text=Reconciliation successful')).toBeVisible({ timeout: 20000 });

    // Cleanup
    fs.unlinkSync(dummyFilePath);
  });
});
