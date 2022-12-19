import { Browser, BrowserContext, Page } from 'playwright'
import { initBrowser, initContext } from './utils/playwrightUtils'
import customLogger from './utils/logger'
import path from 'path'
import moment from 'moment'
import { initExcel } from './utils/exceljsUtils'
import { makeDirPath } from './utils/fsUtils'
import { ordinal_suffix_of } from './utils/numberUtils'

const startCrawler: (event, input: any, key: string) => Promise<void> = async (event, input, key) => {
  const startTime = moment()
  let basePath: string = 'test'
  const logger = new customLogger(event)

  logger.info('Started crawler')

  // Setup
  const browser: Browser = await initBrowser(input.headless)
  let context: BrowserContext = await initContext(browser)
  const page: Page = await context.newPage()

  let allCnt = 0
  let netCnt = 0
  let footCnt = 0
  let phoneCnt = 0

  // The actual interesting bit
  let inputKeys = [key.split('_')[0]]
  logger.info(`inputKeys: ${inputKeys}`)
  let details = []
  for (let i = 0; i < inputKeys.length; i++) {
    const inputKey = inputKeys[i]
    let targetUrl = `https://search.daum.net/search?w=site&lpp=100&DA=STC&q=${inputKey}&m=directory&sort=recency&p=1`
    await page.goto(targetUrl)
    // const pageTxt = await page.locator('.txt_info').innerText()
    // const itemCnt = pageTxt.replace('건', '').split('/')[1].replace(',', '').trim()
    // let pageCnt = Math.ceil(Number(itemCnt) / 100)
    const pageStart = parseInt(key.split('_')[1].split('-')[0])
    const pageEnd = parseInt(key.split('_')[1].split('-')[1])
    const pageCnt = pageEnd - pageStart + 1
    logger.info(`pageStart: ${pageStart}, pageEnd: ${pageEnd}, pageCnt: ${pageCnt}`)

    logger.info(`Crawling ${ordinal_suffix_of(i + 1)} (${inputKey}) in ${pageCnt} pages`)
    for (let j = pageStart; j <= pageEnd; j++) {
      targetUrl = `https://search.daum.net/search?w=site&lpp=100&DA=STC&q=${inputKey}&m=directory&sort=recency&p=${j}`
      await page.goto(targetUrl)
      const items = await page.locator('.list_info .cont_inner')
      let count = await items.count()
      for (let k = 0; k < count; k++) {
        const homePage = await context.newPage()
        const domain = await items.nth(k).locator('.info a').getAttribute('href')
        try {
          allCnt++
          logger.info(`Crawling ${ordinal_suffix_of(i + 1)} (${inputKey}) ${ordinal_suffix_of((j - 1) * 100 + (k + 1))} item in ${j}page at ${domain}`)
          //'키워드','상호','도메인','상세설명문구','홈페이지내TEL/연락처/전화','홈페이지내상호','홈페이지내대표','홈페이지내주소/소재','홈페이지내사업자번호/사업자등록번호',
          const keyword = inputKey
          const title = await items.nth(k).locator('.wrap_tit').innerText()
          const description = await items.nth(k).locator('p').innerText()

          try {
            await homePage.goto(domain, { waitUntil: 'networkidle' })
          } catch (e) {
            netCnt++
            details.push({
              keyword,
              title,
              domain,
              description,
            })
            throw new Error('Failed to load page')
          }

          let phoneNumber = null
          let inTitle = null
          let representative = null
          let address = null
          let number = null

          const homePageContent = await homePage.content()
          const pageHtml = homePageContent.replace(/\n/g, '')
          let footerHtml = null
          if (pageHtml.match(/footer.*/)) {
            footerHtml = pageHtml.match(/footer.*/)[0]
          } else {
            footCnt++
            details.push({
              keyword,
              title,
              domain,
              description,
            })
            throw new Error('Failed to found footer')
          }

          const phoneRegex =
            /(전화|연락처|TEL|번호|고객)([^0-9])*((01[0-9]|02|03[1-3]|04[1-4]|05[1-5]|06[1-4]|16[0-9]{2}|1661|15[0-9]{2}|18[0-9]{2}|080|070)-?\d{0,4}-?\d{4})/i
          const phoneReg = footerHtml.match(phoneRegex)
          if (phoneReg) {
            phoneCnt++
            phoneNumber = removeRedundant(phoneReg[0])
            phoneNumber = phoneNumber.match(/\d*-?\d*-?\d/)[0]
          }

          const inTitleRegex = /(?:<([^>\s]*)[^>]*>)?[^<>|\/]*(?:법인명|상호|회사명|상점명|업체)[^<>|\/]*(?:<\1>|<\/\1>)?\s*(?:<([^>\s]*)[^>]*>)?[^<>|\/]*(?:<\2>|<\/\2>)?/i
          let inTitleReg = footerHtml.match(inTitleRegex)
          if (inTitleReg) inTitle = removeRedundant(inTitleReg[0])

          const representativeRegex = /(?:<([^>\s]*)[^>]*>)?[^<>|\/]*(?:대표자|대표|이사|성명)[^<>|\/]*(?:<\1>|<\/\1>)?\s*(?:<([^>\s]*)[^>]*>)?[^<>|\/]*(?:<\2>|<\/\2>)?/i
          const representativeReg = footerHtml.match(representativeRegex)
          if (representativeReg) representative = removeRedundant(representativeReg[0])

          const addressRegex = /(?:<([^>\s]*)[^>]*>)?[^<>|\/]*(?:소재지|주소|소재|본점)[^<>|\/]*(?:<\1>|<\/\1>)?\s*(?:<([^>\s]*)[^>]*>)?[^<>|\/]*(?:<\2>|<\/\2>)?/i
          const addressReg = footerHtml.match(addressRegex)
          if (addressReg) address = removeRedundant(addressReg[0])

          const numberRegex = /(사업자\s*번호|사업자\s*등록\s*번호)([^0-9])*(\d{3}-\d{2}-\d{5})/
          const numberReg = footerHtml.match(numberRegex)
          if (numberReg) number = removeRedundant(numberReg[0])

          await homePage.close()

          details.push({
            keyword,
            title,
            domain,
            description,
            phoneNumber,
            inTitle,
            representative,
            address,
            number,
          })
        } catch (e) {
          await homePage.close()
          logger.debug(`${domain} error: ${e}`)
        }
      }
    }
  }
  const [books, sheet] = initExcel()
  makeDirPath(basePath)
  for (let i = 0; i < details.length; i++) {
    const detail = details[i]
    sheet.addRow([
      detail.keyword,
      detail.title,
      detail.domain,
      detail.description,
      detail.phoneNumber,
      detail.inTitle,
      detail.representative,
      detail.address,
      detail.number,
    ])
  }
  sheet.addRow([``])
  sheet.addRow([`사이트 갯수: ${allCnt}`])
  sheet.addRow([`사이트 로드 성공(네트워크 관련): ${allCnt - netCnt} (${(allCnt - netCnt) / allCnt * 100}%)`])
  sheet.addRow([`하단영역 있음: ${allCnt - footCnt} (${(allCnt - footCnt) / allCnt * 100}%)`])
  sheet.addRow([`전화번호 추출 성공: ${phoneCnt} (${phoneCnt / allCnt * 100}%)`])
  await books.xlsx.writeFile(path.join(basePath, `${moment().format('YYYYMMDDHHmmss')}_${key}.xlsx`))

  // Teardown
  await context.close()
  await browser.close()

  logger.info(`all: ${allCnt}, network: ${netCnt}, footer: ${footCnt}, phone: ${phoneCnt}`)
  logger.info(`Finished crawler, it took ${moment().diff(startTime, 'minutes')} minutes`)
}

const removeRedundant: (prev: string) => string = (prev) => {
  return prev
    .replace(/\s*(<([^>]+)>)/gi, '')
    .replace(/\n/g, '')
    .replace(/&nbsp/g, '')
    .replace(/;/g, '')
    .trim()
}

export { startCrawler }

// const [response] = await Promise.all([
//     page.waitForResponse(async(res) => res.url().match(/test/) && res.status() === 200 && (await res.json()).test?.test !== undefined),
//     await page.goto(`https://www.google.com`),
// ])

// const [response] = await Promise.all([
//     page.waitForResponse((res) => res.url().match(/(jpg|jpeg|png)/i) && res.status() === 200),
//     await page.goto(`https://www.google.com`)])
// const buffer = await response.body()
// await fs.writeFile(path.join('./test', 'fileName'), buffer, (err) => {
//     if (err) throw err
// })

// if (i % 100 === 0) {
//     await context.close()
//     context = await initContext(browser)
//     const page: Page = await context.newPage()
//     await page.goto(baseUrl)
// }

// const sizeLocator = await page.locator('.chosen-drop .chosen-results li.active-result')
// const count = await sizeLocator.count()
// for (let i = 1; i < count; i++) {
//     let size = await sizeLocator.nth(i).innerText()
//     sizes.push(size)
// }

// await page.evaluate('const itemList = document.querySelector(".item_list.item_list--article");itemList.scrollTop = itemList.scrollHeight;')
