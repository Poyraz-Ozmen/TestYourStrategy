import { PrismaClient, AssetType } from '@prisma/client'
import { MarketDataService } from '../lib/market-data'

const prisma = new PrismaClient()

interface AssetToFetch {
  symbol: string
  name: string
  type: AssetType
  exchange?: string
}

const ASSETS_TO_FETCH: AssetToFetch[] = [
  // Major Stocks
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'STOCK', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'STOCK', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'STOCK', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'STOCK', exchange: 'NASDAQ' },

  // Popular Cryptos
  { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO' },
  { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO' },
]

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchRealData() {
  console.log('🚀 Starting real data fetch from Alpha Vantage...')

  const marketDataService = new MarketDataService()

  try {
    for (const assetConfig of ASSETS_TO_FETCH) {
      console.log(`📊 Fetching data for ${assetConfig.symbol} (${assetConfig.name})...`)

      try {
        // Check if asset exists, create if not
        let asset = await prisma.asset.findUnique({
          where: { symbol: assetConfig.symbol }
        })

        if (!asset) {
          asset = await prisma.asset.create({
            data: {
              symbol: assetConfig.symbol,
              name: assetConfig.name,
              type: assetConfig.type,
              exchange: assetConfig.exchange
            }
          })
          console.log(`  ✅ Created asset: ${assetConfig.symbol}`)
        }

        // Fetch historical data
        let historicalData
        if (assetConfig.type === 'STOCK') {
          historicalData = await marketDataService.getStockData(assetConfig.symbol, 'daily')
        } else {
          historicalData = await marketDataService.getCryptoData(assetConfig.symbol)
        }

        console.log(`  📈 Received ${historicalData.data.length} data points`)

        // Delete existing price data for this asset
        await prisma.priceData.deleteMany({
          where: { assetId: asset.id }
        })

        // Insert new price data in batches
        const batchSize = 100
        const priceData = historicalData.data.map(item => ({
          assetId: asset.id,
          date: new Date(item.date),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume
        }))

        for (let i = 0; i < priceData.length; i += batchSize) {
          const batch = priceData.slice(i, i + batchSize)
          await prisma.priceData.createMany({
            data: batch,
            skipDuplicates: true
          })
        }

        console.log(`  ✅ Stored ${priceData.length} price records for ${assetConfig.symbol}`)

        // Rate limiting - Alpha Vantage allows 5 requests per minute for free tier
        console.log('  ⏳ Waiting 15 seconds to respect API rate limits...')
        await delay(15000)

      } catch (error) {
        console.error(`  ❌ Error fetching data for ${assetConfig.symbol}:`, error)
        console.log('  ⏳ Waiting before continuing...')
        await delay(5000)
      }
    }

    console.log('🎉 Real data fetch completed!')

    // Show summary
    const totalAssets = await prisma.asset.count()
    const totalPriceRecords = await prisma.priceData.count()

    console.log(`📊 Summary:`)
    console.log(`   - Total assets: ${totalAssets}`)
    console.log(`   - Total price records: ${totalPriceRecords}`)

  } catch (error) {
    console.error('❌ Fatal error during data fetch:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  fetchRealData()
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { fetchRealData }