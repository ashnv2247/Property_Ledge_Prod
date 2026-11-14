import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../config/test-env';

test('verify 4-step create invoice modal with category choice', async ({ page }) => {
  test.setTimeout(60000);

  // 1. Log in
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

  // 2. Go to Invoices
  await page.goto('/dashboard/invoices');
  await page.waitForSelector('button:has-text("New Invoice")', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Click '+ New Invoice'
  const newInvoiceBtn = page.locator('button:has-text("New Invoice")').first();
  await expect(newInvoiceBtn).toBeVisible();
  await newInvoiceBtn.click();
  await page.waitForTimeout(800);

  // Screenshot 1: Step 0 - Category Selection Choice
  await page.screenshot({ path: 'C:/Users/DELL/.gemini/antigravity-ide/brain/18d172ec-a67e-4a96-b7f3-a1b63f7fd4db/.tempmediaStorage/invoice_step0_category_choice.png' });

  // Click 'Property Lease Rent Invoice' to demonstrate lease card selection
  const leaseCard = page.getByText('Property Lease Rent Invoice').first();
  await leaseCard.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'C:/Users/DELL/.gemini/antigravity-ide/brain/18d172ec-a67e-4a96-b7f3-a1b63f7fd4db/.tempmediaStorage/invoice_step0_lease_selected.png' });

  // Click back to 'Independent Customer Invoice'
  const standaloneCard = page.getByText('Independent Customer Invoice').first();
  await standaloneCard.click();
  await page.waitForTimeout(400);

  // Click 'Continue to Invoice Details'
  const continueBtn = page.getByRole('button', { name: /continue to invoice details/i }).first();
  await continueBtn.click();
  await page.waitForTimeout(800);

  // Step 1: Invoice Details (Breathable single-page form)
  // Fill recipient name
  const recipientInput = page.locator('input[placeholder*="John Smith"]').first();
  await recipientInput.fill('Acme Corp Pty Ltd');
  await page.waitForTimeout(400);

  // Click 'Preview Document'
  const previewBtn = page.getByRole('button', { name: /preview document/i }).first();
  await previewBtn.click();
  await page.waitForTimeout(1000);

  // Step 2: Live Preview Document & Issue
  await expect(page.getByText('Sandbox Safe')).toBeVisible();
});
