const { MarketDataUpdater } = require('./update-daily-data');

async function testUpdate() {
  const updater = new MarketDataUpdater();

  console.log('🧪 Testing market data update with AAPL...');

  const result = await updater.updateStockData('AAPL');
  console.log('Result:', result);
}

testUpdate().catch(console.error);