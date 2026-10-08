import { test, expect } from '@playwright/test';

// Mock all APIs graph pages call on load to prevent 401 → redirect loop
async function mockGraphApis(page) {
  // Generic catch-all for any unmatched API → empty success (prevents 401 redirects)
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({})
    });
  });
}

test.describe('Graph Pages smoke test', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept login to bypass auth
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-jwt-token', name: 'Test User', email: 'test@example.com' })
      });
    });

    // Login first
    await page.goto('/login');
    await page.locator('input[id="login-email"]').fill('valid@example.com');
    await page.locator('input[id="login-password"]').fill('CorrectPassword123');
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('should render Network Graph page and canvas', async ({ page }) => {
    // Register catch-all FIRST (lower priority — Playwright uses last-registered-wins)
    await mockGraphApis(page);

    // Register specific graph mock AFTER catch-all so it takes priority
    await page.route('**/api/graph/data**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          nodes: [{ id: 'GSTIN1', label: 'Company' }, { id: 'GSTIN2', label: 'Company' }],
          links: [{ source: 'GSTIN1', target: 'GSTIN2', type: 'CONNECTED_TO' }]
        })
      });
    });

    await page.goto('/dashboard/network-graph');
    await page.waitForLoadState('networkidle');

    // h2 is inside the left sidebar panel
    await expect(page.locator('h2:has-text("Network Graph")')).toBeVisible({ timeout: 20000 });

    // Canvas rendered by react-force-graph-2d — needs extra time on Safari
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30000 });
  });

  test('should render Fraud Graph page and canvas', async ({ page }) => {
    // Register catch-all FIRST (lower priority)
    await mockGraphApis(page);

    // Register specific fraud graph mock AFTER so it takes priority
    await page.route('**/api/graph/data**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          nodes: [
            { id: 'Fraud1', label: 'HighRisk', riskScore: 90 },
            { id: 'Inv1',   label: 'Invoice' }
          ],
          links: [
            { source: 'Fraud1', target: 'Inv1', type: 'ISSUED' }
          ]
        })
      });
    });

    await page.goto('/dashboard/fraud-graph');
    await page.waitForLoadState('networkidle');

    // The heading is a <span> in the dark top bar
    await expect(
      page.locator('span:has-text("Fraud Investigation Graph")')
    ).toBeVisible({ timeout: 20000 });

    // Canvas rendered by react-force-graph-2d — needs extra time on Safari
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30000 });
  });
});
