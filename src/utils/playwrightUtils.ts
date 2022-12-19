import playwright, { Browser, BrowserContext } from 'playwright';

const initBrowser: (isHeadless) => Promise<Browser> = async (headless) => {
  return await playwright.chromium.launch({
    headless,
    // slowMo: 100,
  });
};
const initContext: (browser: Browser) => Promise<BrowserContext> = async (browser: Browser) => {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36',
    viewport: {
      width: 1200,
      height: 800,
    },
  });
  await context.route('**.jpg', (route) => route.abort());
  return context;
};

export { initBrowser, initContext };
