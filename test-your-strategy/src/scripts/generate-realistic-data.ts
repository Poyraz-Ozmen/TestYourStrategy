import { PrismaClient, AssetType } from '@prisma/client'

const prisma = new PrismaClient()

interface AssetConfig {
  symbol: string
  name: string
  type: AssetType
  exchange?: string
  startPrice: number
  trend: number // Annual return expectation
  volatility: number // Annual volatility
}

const REALISTIC_ASSETS: AssetConfig[] = [
  // Blue chip stocks with realistic historical patterns
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', exchange: 'NASDAQ', startPrice: 100, trend: 0.12, volatility: 0.25 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'STOCK', exchange: 'NASDAQ', startPrice: 200, trend: 0.15, volatility: 0.22 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'STOCK', exchange: 'NASDAQ', startPrice: 2000, trend: 0.10, volatility: 0.28 },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'STOCK', exchange: 'NASDAQ', startPrice: 400, trend: 0.25, volatility: 0.50 },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'STOCK', exchange: 'NYSE', startPrice: 300, trend: 0.08, volatility: 0.16 },

  // Crypto with higher volatility
  { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO', startPrice: 20000, trend: 0.30, volatility: 0.80 },
  { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO', startPrice: 1000, trend: 0.40, volatility: 0.90 }
]

// Generate realistic price movements using geometric Brownian motion
function generateRealisticPrices(config: AssetConfig, days: number) {
  const prices: number[] = [config.startPrice]
  const dt = 1 / 365 // Daily time step

  for (let i = 1; i < days; i++) {
    const lastPrice = prices[i - 1]

    // Add some market regime changes
    let currentTrend = config.trend
    let currentVol = config.volatility

    // Simulate market crashes (rare events)
    if (Math.random() < 0.002) { // ~0.2% chance per day
      currentTrend = -0.5 // Crash scenario
      currentVol = config.volatility * 2
    }

    // Weekend effect - no price movement on weekends for stocks
    const date = new Date('2020-01-01')
    date.setDate(date.getDate() + i - 1)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6

    if (isWeekend && config.type === 'STOCK') {
      prices.push(lastPrice)
      continue
    }

    // Geometric Brownian Motion formula
    const drift = currentTrend * dt
    const diffusion = currentVol * Math.sqrt(dt) * (Math.random() * 2 - 1) // Box-Muller would be better

    const newPrice = lastPrice * Math.exp(drift + diffusion)
    prices.push(Math.max(newPrice, 0.01)) // Prevent negative prices
  }

  return prices
}

function generateOHLCFromClose(closePrice: number, previousClose: number, volatility: number) {
  const dailyVol = volatility / Math.sqrt(365) * 0.3 // Intraday is lower than daily

  // Generate open price (gap from previous close)
  const gapSize = (Math.random() - 0.5) * dailyVol * 0.5
  const open = previousClose * (1 + gapSize)

  // Generate high and low around open and close
  const maxPrice = Math.max(open, closePrice)
  const minPrice = Math.min(open, closePrice)

  const high = maxPrice * (1 + Math.random() * dailyVol)
  const low = minPrice * (1 - Math.random() * dailyVol)

  return {
    open: Math.round(open * 100) / 100,
    high: Math.round(high * 100) / 100,
    low: Math.round(low * 100) / 100,
    close: Math.round(closePrice * 100) / 100
  }
}

async function generateRealisticData() {
  console.log('🚀 Generating realistic historical data...')

  try {
    // Clear existing data
    console.log('🗑️ Clearing existing data...')
    await prisma.priceData.deleteMany()
    await prisma.backtestResult.deleteMany()
    await prisma.strategy.deleteMany()
    await prisma.asset.deleteMany()

    const startDate = new Date('2020-01-01')
    const endDate = new Date()
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    console.log(`📊 Generating ${totalDays} days of realistic data for ${REALISTIC_ASSETS.length} assets...`)

    for (const assetConfig of REALISTIC_ASSETS) {
      console.log(`📈 Processing ${assetConfig.symbol} (${assetConfig.name})...`)

      // Create asset
      const asset = await prisma.asset.create({
        data: {
          symbol: assetConfig.symbol,
          name: assetConfig.name,
          type: assetConfig.type,
          exchange: assetConfig.exchange
        }
      })

      // Generate price series
      const closePrices = generateRealisticPrices(assetConfig, totalDays)

      const priceData = []
      for (let i = 0; i < totalDays; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)

        const closePrice = closePrices[i]
        const previousClose = i > 0 ? closePrices[i - 1] : closePrice

        const ohlc = generateOHLCFromClose(closePrice, previousClose, assetConfig.volatility)

        // Generate realistic volume
        const baseVolume = assetConfig.type === 'STOCK' ? 1000000 : 100000
        const volatilityMultiplier = 1 + Math.abs(closePrice - previousClose) / previousClose * 5
        const randomMultiplier = 0.3 + Math.random() * 1.4
        const volume = Math.round(baseVolume * volatilityMultiplier * randomMultiplier)

        priceData.push({
          assetId: asset.id,
          date: date,
          open: ohlc.open,
          high: ohlc.high,
          low: ohlc.low,
          close: ohlc.close,
          volume: volume
        })
      }

      // Insert in batches
      console.log(`💾 Storing ${priceData.length} price records...`)
      const batchSize = 500
      for (let i = 0; i < priceData.length; i += batchSize) {
        const batch = priceData.slice(i, i + batchSize)
        await prisma.priceData.createMany({
          data: batch
        })
      }

      // Show price evolution
      const startPrice = priceData[0].close
      const endPrice = priceData[priceData.length - 1].close
      const totalReturn = ((endPrice - startPrice) / startPrice * 100).toFixed(1)

      console.log(`✅ ${assetConfig.symbol}: $${startPrice.toFixed(2)} → $${endPrice.toFixed(2)} (${totalReturn}%)`)
    }

    console.log('🎉 Realistic data generation completed!')

    // Show summary
    const summary = await Promise.all(
      REALISTIC_ASSETS.map(async (asset) => {
        const count = await prisma.priceData.count({
          where: { asset: { symbol: asset.symbol } }
        })
        return { symbol: asset.symbol, records: count }
      })
    )

    console.log('📊 Summary:')
    summary.forEach(({ symbol, records }) => {
      console.log(`   ${symbol}: ${records} records`)
    })

  } catch (error) {
    console.error('❌ Error generating data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  generateRealisticData()
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { generateRealisticData }