const { crawl } = require('./crawl');

(async () => {
  try {
    await crawl();
  } catch (e) {
    console.error('ERROR:', e);
  }
})();
