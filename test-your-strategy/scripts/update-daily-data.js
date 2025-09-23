const { PrismaClient } = require('@prisma/client');
const https = require('https');

const prisma = new PrismaClient();

class MarketDataUpdater {
  constructor() {
    this.ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    this.BASE_URL = 'https://www.alphavantage.co/query';
  }

  async fetchStockData(symbol) {
    return new Promise((resolve, reject) => {
      const url = `${this.BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${this.ALPHA_VANTAGE_API_KEY}&outputsize=compact`;

      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);

            if (json['Error Message']) {
              reject(new Error(`API Error: ${json['Error Message']}`));
              return;
            }

            const timeSeries = json['Time Series (Daily)'];
            if (!timeSeries) {
              reject(new Error('No time series data found'));
              return;
            }

            // Get the most recent date's data
            const dates = Object.keys(timeSeries).sort().reverse();
            const latestDate = dates[0];
            const latestData = timeSeries[latestDate];

            resolve({
              symbol,
              date: latestDate,
              open: parseFloat(latestData['1. open']),
              high: parseFloat(latestData['2. high']),
              low: parseFloat(latestData['3. low']),
              close: parseFloat(latestData['4. close']),
              volume: parseFloat(latestData['5. volume'])
            });
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', reject);
    });
  }

  async updateStockData(symbol) {
    try {
      console.log(`Fetching data for ${symbol}...`);

      // Get the asset from database
      const asset = await prisma.asset.findUnique({
        where: { symbol }
      });

      if (!asset) {
        console.warn(`Asset ${symbol} not found in database`);
        return { symbol, status: 'not_found' };
      }

      // Fetch latest market data
      const marketData = await this.fetchStockData(symbol);

      // Check if we already have this date's data
      const existingData = await prisma.priceData.findFirst({
        where: {
          assetId: asset.id,
          date: new Date(marketData.date)
        }
      });

      if (existingData) {
        console.log(`Data for ${symbol} on ${marketData.date} already exists`);
        return { symbol, status: 'already_exists', date: marketData.date };
      }

      // Create new price data record
      await prisma.priceData.create({
        data: {
          assetId: asset.id,
          date: new Date(marketData.date),
          open: marketData.open,
          high: marketData.high,
          low: marketData.low,
          close: marketData.close,
          volume: marketData.volume
        }
      });

      console.log(`✅ Successfully updated ${symbol} with data for ${marketData.date}`);
      return { symbol, status: 'updated', date: marketData.date };

    } catch (error) {
      console.error(`❌ Error updating ${symbol}:`, error.message);
      return { symbol, status: 'error', error: error.message };
    }
  }

  async updateRandomStocks(limit = 10) {
    try {
      console.log('🚀 Starting daily market data update...');

      // Get all stock symbols (not crypto) from database
      const assets = await prisma.asset.findMany({
        where: { type: 'STOCK' },
        select: { symbol: true }
      });

      if (assets.length === 0) {
        console.log('No stock assets found in database');
        return;
      }

      // Randomly select stocks to update
      const shuffled = assets.sort(() => 0.5 - Math.random());
      const selectedSymbols = shuffled.slice(0, limit).map(asset => asset.symbol);

      console.log(`Selected ${selectedSymbols.length} symbols to update: ${selectedSymbols.join(', ')}`);

      const results = {
        updated: [],
        already_exists: [],
        errors: [],
        not_found: []
      };

      // Update each symbol with rate limiting
      for (let i = 0; i < selectedSymbols.length; i++) {
        const symbol = selectedSymbols[i];
        const result = await this.updateStockData(symbol);

        if (results[result.status]) {
          results[result.status].push(result);
        } else {
          // Handle unknown status
          if (!results.errors) results.errors = [];
          results.errors.push({...result, status: 'error', error: `Unknown status: ${result.status}`});
        }

        // Rate limiting: wait 12 seconds between requests (Alpha Vantage free tier limit)
        if (i < selectedSymbols.length - 1) {
          console.log('⏳ Waiting 12 seconds (rate limit)...');
          await new Promise(resolve => setTimeout(resolve, 12000));
        }
      }

      console.log('\n📊 Update Summary:');
      console.log(`✅ Updated: ${results.updated.length}`);
      console.log(`ℹ️  Already exists: ${results.already_exists.length}`);
      console.log(`❌ Errors: ${results.errors.length}`);
      console.log(`❓ Not found: ${results.not_found.length}`);

      if (results.updated.length > 0) {
        console.log('\n📈 Successfully updated:');
        results.updated.forEach(r => console.log(`  - ${r.symbol} (${r.date})`));
      }

      if (results.errors.length > 0) {
        console.log('\n❌ Errors:');
        results.errors.forEach(r => console.log(`  - ${r.symbol}: ${r.error}`));
      }

    } catch (error) {
      console.error('Failed to update market data:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function main() {
  const updater = new MarketDataUpdater();
  const limit = process.argv[2] ? parseInt(process.argv[2]) : 10;

  console.log(`🎯 Updating market data for ${limit} random stocks`);
  await updater.updateRandomStocks(limit);
}

if (require.main === module) {
  main();
}

module.exports = { MarketDataUpdater };