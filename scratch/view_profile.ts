import { chromium } from '@playwright/test';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

async function viewProfile() {
  const isolatedDir = path.join(os.tmpdir(), `pw-profile-${Date.now()}`);
  if (!fs.existsSync(isolatedDir)) {
    fs.mkdirSync(isolatedDir, { recursive: true });
  }

  console.log('Launching isolated Chromium browser with dedicated persistent context...');
  const context = await chromium.launchPersistentContext(isolatedDir, {
    headless: false,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  try {
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('Navigating to https://github.com/YounusSyed186 ...');
    await page.goto('https://github.com/YounusSyed186', { waitUntil: 'domcontentloaded' });

    console.log('Waiting for profile to load...');
    await page.waitForSelector('span.p-name, span.p-nickname', { timeout: 15000 }).catch(() => null);

    const name = await page.locator('span.p-name').textContent().catch(() => 'N/A');
    const nickname = await page.locator('span.p-nickname').textContent().catch(() => 'N/A');
    console.log(`\n========================================`);
    console.log(`Successfully loaded profile in browser:`);
    console.log(`Name: ${name?.trim()}`);
    console.log(`Handle: @${nickname?.trim()}`);
    console.log(`URL: https://github.com/YounusSyed186`);
    console.log(`========================================\n`);
    console.log('Browser window will stay open for 15 seconds for you to view, then close cleanly...');

    await page.waitForTimeout(15000);
  } finally {
    console.log('Closing browser session cleanly...');
    await context.close().catch(() => null);
    try {
      fs.rmSync(isolatedDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup error if Windows holds lock briefly
    }
    console.log('Cleaned up temporary profile.');
  }
}

viewProfile().catch(console.error);
