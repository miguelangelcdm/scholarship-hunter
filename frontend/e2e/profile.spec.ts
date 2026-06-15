import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Profile Manager Performance & Visual Checks', () => {
  
  test.beforeAll(() => {
    // Ensure screenshot directory exists
    const screenshotsDir = path.resolve('./e2e-screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }
  });

  test('should load profile in under 500ms and allow step navigation', async ({ page }) => {
    // Register console and error listeners
    page.on('console', msg => console.log('  [BROWSER CONSOLE]', msg.type(), ':', msg.text()));
    page.on('pageerror', err => console.error('  [BROWSER ERROR]', err.message));

    // 1. Warm up the page (Vite compiles JSX/TSX modules on the fly on first load)
    await page.goto('/profile');
    await page.waitForSelector('text=Loading Profile...', { state: 'detached', timeout: 15000 });

    // 2. Measure actual reload and API response latency
    const startTime = Date.now();
    await page.reload();
    await page.waitForSelector('text=Loading Profile...', { state: 'detached', timeout: 10000 });
    
    const loadDuration = Date.now() - startTime;
    console.log(`[PERFORMANCE] Profile Page fully loaded in: ${loadDuration}ms`);
    
    // Performance assertion (snappy load times)
    expect(loadDuration).toBeLessThan(500);

    // 2. Capture Overview Landing screenshot
    await page.screenshot({ path: 'e2e-screenshots/profile-overview.png' });

    // 3. Test Navigation Steps (Clicking step 1: Academic Core in the progress line)
    // The button displays the text "Academic Core"
    const academicStep = page.locator('button:has-text("Academic Core")').first();
    await expect(academicStep).toBeVisible();
    await academicStep.click();

    // Verify it switched tabs (should show the Academic Core header)
    await expect(page.locator('h2:has-text("Academic Core & Profile Details")')).toBeVisible();
    
    // Capture Academic form screenshot
    await page.screenshot({ path: 'e2e-screenshots/profile-academic-tab.png' });

    // 4. Navigate back to Overview tab
    await page.locator('nav >> text=Profile Overview').click();
    await expect(page.locator('h2:has-text("Scholarship Preparedness")')).toBeVisible();
  });
});
