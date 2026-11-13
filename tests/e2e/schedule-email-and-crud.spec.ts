import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3003';
const QA_EMAIL = process.env.E2E_LANDLORD_EMAIL || 'qa_tester_20261111@propertyledge.local';
const QA_PASSWORD = process.env.E2E_LANDLORD_PASSWORD || 'TestPassword123!';

test.describe('Schedule Email & Invoices Complete E2E Suite', () => {
  test('End-to-End Invoice Creation, Recurring Schedule Wizard, Drawer & Email Dispatch', async ({ page }) => {
    test.setTimeout(90000);

    const agGridWarnings: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      } else if (msg.type() === 'warning') {
        if (text.includes('AG Grid')) {
          agGridWarnings.push(text);
        }
      }
    });

    // 1. Log in
    console.log(`[E2E] Navigating to ${BASE_URL}/login`);
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('#login-email');
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(QA_EMAIL);

    const passwordInput = page.locator('#login-password');
    await passwordInput.fill(QA_PASSWORD);

    await page.locator('button[type="submit"]').click();

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 25000 });
    console.log(`[E2E] Logged in successfully. Current URL: ${page.url()}`);

    // If redirected to onboarding/workspace, navigate directly to dashboard
    if (page.url().includes('/onboarding')) {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    }

    // 2. Navigate to Invoices
    console.log(`[E2E] Navigating to ${BASE_URL}/dashboard/invoices`);
    await page.goto(`${BASE_URL}/dashboard/invoices`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify zero AG Grid deprecation/pagination warnings
    const deprecationWarnings = agGridWarnings.filter(w => 
      w.includes('#94') || w.includes('#95') || w.includes('#306') || w.includes('#322')
    );
    console.log(`[E2E] AG Grid warnings detected: ${deprecationWarnings.length}`);
    expect(deprecationWarnings).toEqual([]);

    // 3. Verify invoice list and trigger Schedule Email Modal
    console.log('[E2E] Checking for invoice rows in grid');
    const invoiceRows = page.locator('.ag-row');
    const rowCount = await invoiceRows.count();
    console.log(`[E2E] Found ${rowCount} invoice rows in grid`);
    expect(rowCount).toBeGreaterThan(0);

    // Click the Schedule Email button on the first invoice row or toolbar
    const scheduleRowBtn = page.locator('button[title*="Schedule Recurring Email"]').first();
    if (await scheduleRowBtn.isVisible()) {
      console.log('[E2E] Clicking Schedule Recurring Email button on invoice row');
      await scheduleRowBtn.click();
    } else {
      console.log('[E2E] Selecting first row and using bulk action / toolbar Schedule Email');
      const firstRow = invoiceRows.first();
      await firstRow.click();
      await page.waitForTimeout(400);

      const toolbarSchedule = page.locator('button:has-text("Schedule Email")').first();
      await toolbarSchedule.click();
    }

    await page.waitForTimeout(1000);

    // 4. Step through the 4-step Schedule Email Modal Wizard
    const modal = page.locator('div[role="dialog"], .fixed.inset-0').first();
    await expect(modal).toBeVisible({ timeout: 10000 });
    console.log('[E2E] Schedule Email Modal is visible');

    // Step 0: Source Invoice
    console.log('[E2E] Wizard Step 0 (Select Invoice) - clicking Continue');
    const continueBtn0 = modal.locator('button:has-text("Continue")').first();
    await expect(continueBtn0).toBeVisible({ timeout: 5000 });
    await continueBtn0.click();
    await page.waitForTimeout(800);

    // Step 1: Schedule Configuration
    console.log('[E2E] Wizard Step 1 (Schedule Configuration) - clicking Continue');
    const continueBtn1 = modal.locator('button:has-text("Continue")').first();
    await expect(continueBtn1).toBeVisible({ timeout: 5000 });
    await continueBtn1.click();
    await page.waitForTimeout(800);

    // Step 2: Email Settings & Delivery Mode
    console.log('[E2E] Wizard Step 2 (Email Settings) - clicking Continue');
    const continueBtn2 = modal.locator('button:has-text("Continue")').first();
    await expect(continueBtn2).toBeVisible({ timeout: 5000 });
    await continueBtn2.click();
    await page.waitForTimeout(800);

    // Step 3: Review & Generate
    console.log('[E2E] Wizard Step 3 (Review & Generate) - clicking Create Schedule');
    const createScheduleBtn = modal.locator('button:has-text("Create Schedule")').first();
    await expect(createScheduleBtn).toBeVisible({ timeout: 5000 });
    await createScheduleBtn.click();

    // Wait for generation process and modal dismissal
    await page.waitForTimeout(4000);

    // 5. Navigate to Schedule Email Management Page
    console.log(`[E2E] Navigating to ${BASE_URL}/dashboard/invoices/schedule-email`);
    await page.goto(`${BASE_URL}/dashboard/invoices/schedule-email`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 6. Verify 5 KPI Metric Cards
    console.log('[E2E] Verifying 5 KPI Metric Cards');
    await expect(page.getByText('Total Schedules').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Generated Invoices').first()).toBeVisible();
    await expect(page.getByText('Emails Sent').first()).toBeVisible();
    await expect(page.getByText('Emails Pending').first()).toBeVisible();
    await expect(page.getByText('Emails Failed').first()).toBeVisible();

    // 7. Verify Schedule History Table
    const scheduleRows = page.locator('.ag-row, tr.cursor-pointer');
    const scheduleCount = await scheduleRows.count();
    console.log(`[E2E] Found ${scheduleCount} schedules in management table`);
    expect(scheduleCount).toBeGreaterThan(0);

    // 8. Open Slide-out Detail Drawer
    console.log('[E2E] Clicking Details button to inspect slide-out drawer');
    const detailsBtn = page.locator('button:has-text("Details")').first();
    await expect(detailsBtn).toBeVisible({ timeout: 10000 });
    await detailsBtn.click();
    await page.waitForTimeout(1000);

    const drawer = page.locator('.max-w-2xl').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });
    console.log('[E2E] Slide-out drawer is open');

    // 9. Test Pause & Resume Lifecycle on Overview tab
    const pauseBtn = drawer.locator('button:has-text("Pause Schedule")').first();
    if (await pauseBtn.isVisible()) {
      console.log('[E2E] Testing Pause Schedule');
      await pauseBtn.click();
      await page.waitForTimeout(1500);

      // Verify Resume button appears
      const resumeBtn = drawer.locator('button:has-text("Resume Schedule")').first();
      await expect(resumeBtn).toBeVisible({ timeout: 8000 });
      console.log('[E2E] Schedule successfully paused');

      console.log('[E2E] Testing Resume Schedule');
      await resumeBtn.click();
      await page.waitForTimeout(1500);
      await expect(drawer.locator('button:has-text("Pause Schedule")').first()).toBeVisible({ timeout: 8000 });
      console.log('[E2E] Schedule successfully resumed');
    }

    // 10. Verify Drawer Tabs: Generated Invoices & Email Activity
    const invoicesTab = drawer.locator('button:has-text("Generated Invoices")').first();
    if (await invoicesTab.isVisible()) {
      await invoicesTab.click();
      await page.waitForTimeout(600);
      console.log('[E2E] Inspected Generated Invoices tab');
    }

    const activityTab = drawer.locator('button:has-text("Email Activity")').first();
    if (await activityTab.isVisible()) {
      await activityTab.click();
      await page.waitForTimeout(600);
      console.log('[E2E] Inspected Email Activity tab');
    }

    // 11. Test Email Dispatch Processor Endpoint
    console.log('[E2E] Triggering email delivery processor (/api/cron/process-email-schedules)');
    const cronResponse = await page.request.get(`${BASE_URL}/api/cron/process-email-schedules`);
    console.log(`[E2E] Email processor endpoint HTTP status: ${cronResponse.status()}`);
    expect(cronResponse.status()).toBe(200);
    const cronData = await cronResponse.json();
    console.log('[E2E] Email processor result:', cronData);
    expect(cronData.success).toBe(true);

    console.log('[E2E] All Schedule Email & Invoices tests passed cleanly!');
  });

  test('Live Production URL (https://propertyledge.com.au/) Health & Performance Check', async ({ page }) => {
    test.setTimeout(45000);

    const liveUrl = 'https://propertyledge.com.au';
    console.log(`[E2E] Visiting live production: ${liveUrl}`);

    const startTime = Date.now();
    const response = await page.goto(liveUrl, { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    console.log(`[E2E] Live site response status: ${response?.status()}, DOM load time: ${loadTime}ms`);
    expect(response?.status()).toBeLessThan(400);

    // Verify main landing logo / heading element
    const branding = page.getByText(/PropertyLedge/i).first();
    await expect(branding).toBeVisible({ timeout: 15000 });
    console.log('[E2E] Live production site rendered correctly and responsive!');
  });
});
