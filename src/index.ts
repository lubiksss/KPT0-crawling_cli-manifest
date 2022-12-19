import { startCrawler } from './crawler' //
(async function() {
    await startCrawler(null, { headless: false }, process.argv[2])
  }
)()