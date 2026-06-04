const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://cod-dashboard-jet.vercel.app/dashboard', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  const hasGlobe = await page.locator('.lucide-globe').count();
  const hasChevron = await page.locator('.lucide-chevron-down').count();
  const hasFrancais = await page.getByText('Français').count();
  const hasEnglish = await page.getByText('English').count();
  console.log(`Globe: ${hasGlobe}, ChevronDown: ${hasChevron}, Français: ${hasFrancais}, English: ${hasEnglish}`);
  const header = await page.locator('header').first();
  await header.screenshot({ path: 'navbar.png' });
  console.log('Screenshot saved');
  await browser.close();
})();
