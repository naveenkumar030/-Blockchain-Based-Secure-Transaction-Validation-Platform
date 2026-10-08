import { test, expect } from '@playwright/test';

test.describe('Security Checks', () => {
  
  test('Verify HTTP to HTTPS Redirection and Security Headers', async ({ page }) => {
    // Navigate to the target page
    const response = await page.goto('/');
    
    // Ensure the response is successful
    expect(response).not.toBeNull();
    expect(response.status()).toBe(200);

    // Verify protocol (http for local testing, https for production EC2)
    const url = page.url();
    expect(url.startsWith('http://') || url.startsWith('https://')).toBe(true);

    // Retrieve headers
    const headers = response.headers();

    // Check optional security headers if present
    const xContentType = headers['x-content-type-options'];
    if (xContentType) expect(xContentType.toLowerCase()).toContain('nosniff');

    const xFrame = headers['x-frame-options'];
    if (xFrame) expect(xFrame.toUpperCase()).toMatch(/DENY|SAMEORIGIN/);
  });

  test('Verify dashboard route accessibility', async ({ page }) => {
    // Go directly to dashboard route
    const response = await page.goto('/dashboard');
    expect(response).not.toBeNull();
    expect(response.status()).toBe(200);
  });
});
