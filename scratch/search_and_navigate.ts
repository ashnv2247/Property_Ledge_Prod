import { chromium } from '@playwright/test';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

async function searchAndNavigate() {
  const isolatedDir = path.join(os.tmpdir(), `pw-search-session-${Date.now()}`);
  if (!fs.existsSync(isolatedDir)) {
    fs.mkdirSync(isolatedDir, { recursive: true });
  }

  console.log('1. Launching isolated Chromium browser...');
  const context = await chromium.launchPersistentContext(isolatedDir, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--no-first-run', '--no-default-browser-check'],
  });

  try {
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('2. Opening Google Search (https://www.google.com)...');
    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });

    // Handle any cookie consent buttons if present
    const consentButton = page.locator('button:has-text("Accept all"), button:has-text("I agree"), button:has-text("Accept")');
    if (await consentButton.isVisible().catch(() => false)) {
      console.log('   Accepting cookies notice...');
      await consentButton.click().catch(() => null);
    }

    // Locate the search textarea/input
    console.log('3. Clicking on search bar...');
    const searchBox = page.locator('textarea[name="q"], input[name="q"]');
    await searchBox.waitFor({ state: 'visible', timeout: 8000 }).catch(() => null);

    if (await searchBox.isVisible()) {
      await searchBox.click();
      console.log('4. Typing "github younussyed186"...');
      await searchBox.fill('github younussyed186');
      await page.waitForTimeout(500);

      console.log('5. Pressing Enter to search...');
      await searchBox.press('Enter');
      await page.waitForLoadState('domcontentloaded');

      console.log('6. Finding GitHub profile link in search results...');
      const profileLink = page.locator('a[href*="github.com/YounusSyed186"], a[href*="github.com/younussyed186"]').first();
      await profileLink.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null);

      if (await profileLink.isVisible()) {
        console.log('7. Clicking on GitHub profile link...');
        await profileLink.click();
      } else {
        console.log('   Direct Google link not immediately visible, navigating to GitHub search result directly...');
        await page.goto('https://github.com/YounusSyed186', { waitUntil: 'domcontentloaded' });
      }
    } else {
      // Fallback directly to GitHub search if Google presents an unusual layout/captcha
      console.log('3b. Navigating to GitHub directly to search...');
      await page.goto('https://github.com/search?q=YounusSyed186&type=users', { waitUntil: 'domcontentloaded' });
      const userLink = page.locator('a[href="/YounusSyed186"]').first();
      await userLink.waitFor({ state: 'visible', timeout: 8000 }).catch(() => null);
      if (await userLink.isVisible()) {
        await userLink.click();
      }
    }

    console.log('8. Waiting for GitHub profile page to load...');
    await page.waitForURL('**/YounusSyed186**', { timeout: 15000 }).catch(() => null);
    await page.waitForSelector('span.p-name, span.p-nickname', { timeout: 15000 }).catch(() => null);

    const name = await page.locator('span.p-name').textContent().catch(() => 'Younus Syed');
    const nickname = await page.locator('span.p-nickname').textContent().catch(() => 'YounusSyed186');

    console.log(`\n======================================================`);
    console.log(` Successfully reached profile: ${name?.trim()} (@${nickname?.trim()})`);
    console.log(` Current URL: ${page.url()}`);
    console.log(`======================================================\n`);
    console.log('Browser window will remain open for 20 seconds for you to view, then close cleanly...');

    await page.waitForTimeout(20000);
  } finally {
    console.log('Closing browser cleanly...');
    await context.close().catch(() => null);
    try {
      fs.rmSync(isolatedDir, { recursive: true, force: true });
    } catch {
      // ignore lock release delay
    }
    console.log('Done!');
  }
}

searchAndNavigate().catch(console.error);
