import { startCrawler } from './crawler'
import { Browser, BrowserContext, Page } from 'playwright'
import { initBrowser, initContext } from './utils/playwrightUtils'

test('startCrawler__success', async () => {
  const input = { headless: true }
  let inputKeys = ['벌꿀_1-1', '양봉', '기프트', '상패', '샤인머스켓', '한라봉', '레드향', '새우젓', '캔들', '골드키위']
  await startCrawler(null, input, inputKeys[0])
}, 3000000)

test('page.goto_failed url in github action_success', async () => {
  const input = { headless: true }
  const domain = 'http://crspia.co.kr/shop/main/index.php'
  const browser: Browser = await initBrowser(input.headless)
  let context: BrowserContext = await initContext(browser)
  const page: Page = await context.newPage()

  try {
    await page.goto(domain, { waitUntil: 'networkidle' })
    console.log(await page.title())
  } catch (e) {
    console.log(e)
  }


}, 3000000)
