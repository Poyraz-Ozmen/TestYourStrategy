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

const VOLATILE_ASSETS: AssetConfig[] = [
  // More volatile configurations
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', exchange: 'NASDAQ', startPrice: 100, trend: 0.12, volatility: 0.35 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'STOCK', exchange: 'NASDAQ', startPrice: 200, trend: 0.15, volatility: 0.30 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'STOCK', exchange: 'NASDAQ', startPrice: 2000, trend: 0.10, volatility: 0.38 },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'STOCK', exchange: 'NASDAQ', startPrice: 400, trend: 0.25, volatility: 0.65 },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'STOCK', exchange: 'NYSE', startPrice: 300, trend: 0.08, volatility: 0.25 },

  // High volatility crypto
  { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO', startPrice: 20000, trend: 0.30, volatility: 1.2 },
  { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO', startPrice: 1000, trend: 0.40, volatility: 1.4 }
]

// More realistic price generation with market events
function generateVolatilePrices(config: AssetConfig, days: number) {
  const prices: number[] = [config.startPrice]
  const dt = 1 / 365 // Daily time step

  for (let i = 1; i < days; i++) {
    const lastPrice = prices[i - 1]
    const date = new Date('2020-01-01')
    date.setDate(date.getDate() + i - 1)

    let currentTrend = config.trend
    let currentVol = config.volatility

    // Market events simulation
    const random = Math.random()

    // Major crashes (2-3% chance per year)
    if (random < 0.008) {
      currentTrend = -1.5 // Major crash
      currentVol = config.volatility * 3
    }
    // Minor corrections (10% chance per year)
    else if (random < 0.03) {
      currentTrend = -0.3 // Correction
      currentVol = config.volatility * 1.8
    }
    // Bull runs (5% chance per year)
    else if (random < 0.015) {
      currentTrend = config.trend * 3 // Bull run
      currentVol = config.volatility * 1.5
    }
    // Earnings/news volatility (happens frequently)
    else if (random < 0.1) {
      currentVol = config.volatility * (1.5 + Math.random())
    }

    // Add some momentum/clustering
    if (i > 1) {
      const yesterdayChange = (prices[i - 1] - prices[i - 2]) / prices[i - 2]
      if (Math.abs(yesterdayChange) > 0.03) { // If big move yesterday
        currentVol *= 1.5 // More volatility today
      }
    }

    // Weekend effect - no price movement on weekends for stocks
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    if (isWeekend && config.type === 'STOCK') {
      prices.push(lastPrice)
      continue
    }

    // Generate multiple random shocks for more realistic distribution
    let totalShock = 0
    for (let j = 0; j < 3; j++) {
      totalShock += (Math.random() - 0.5) * 2 // Sum of uniform gives more normal-like distribution
    }
    totalShock /= 3

    // Geometric Brownian Motion with enhanced volatility
    const drift = currentTrend * dt
    const diffusion = currentVol * Math.sqrt(dt) * totalShock

    const newPrice = lastPrice * Math.exp(drift + diffusion)
    prices.push(Math.max(newPrice, 0.01)) // Prevent negative prices
  }

  return prices
}

function generateOHLCFromClose(closePrice: number, previousClose: number, volatility: number) {
  const dailyVol = volatility / Math.sqrt(365) * 0.4 // Intraday volatility

  // Generate open price with potential gaps
  const gapProbability = 0.15 // 15% chance of gap
  const gapSize = Math.random() < gapProbability ? (Math.random() - 0.5) * dailyVol * 2 : (Math.random() - 0.5) * dailyVol * 0.5
  const open = previousClose * (1 + gapSize)

  // Generate high and low with more realistic ranges
  const priceRange = Math.abs(closePrice - open)
  const extraRange = Math.random() * dailyVol * Math.abs(closePrice) * 0.5

  const maxPrice = Math.max(open, closePrice)
  const minPrice = Math.min(open, closePrice)

  const high = maxPrice + extraRange
  const low = Math.max(minPrice - extraRange, closePrice * 0.5) // Don't go below 50% of close

  return {
    open: Math.round(open * 100) / 100,
    high: Math.round(high * 100) / 100,
    low: Math.round(low * 100) / 100,
    close: Math.round(closePrice * 100) / 100
  }
}

async function generateVolatileData() {
  console.log('🌪️ Generating high-volatility realistic data...')

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

    console.log(`📊 Generating ${totalDays} days of volatile data for ${VOLATILE_ASSETS.length} assets...`)

    for (const assetConfig of VOLATILE_ASSETS) {
      console.log(`📈 Processing ${assetConfig.symbol} (volatility: ${(assetConfig.volatility * 100).toFixed(0)}%)...`)

      // Create asset
      const asset = await prisma.asset.create({
        data: {
          symbol: assetConfig.symbol,
          name: assetConfig.name,
          type: assetConfig.type,
          exchange: assetConfig.exchange
        }
      })

      // Generate volatile price series
      const closePrices = generateVolatilePrices(assetConfig, totalDays)

      const priceData = []
      for (let i = 0; i < totalDays; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)

        const closePrice = closePrices[i]
        const previousClose = i > 0 ? closePrices[i - 1] : closePrice

        const ohlc = generateOHLCFromClose(closePrice, previousClose, assetConfig.volatility)

        // Generate volume with volatility correlation
        const priceChange = Math.abs(closePrice - previousClose) / previousClose
        const baseVolume = assetConfig.type === 'STOCK' ? 2000000 : 200000
        const volatilityMultiplier = 1 + priceChange * 20 // Higher volume on big moves
        const randomMultiplier = 0.2 + Math.random() * 1.6
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

      // Calculate statistics
      const startPrice = priceData[0].close
      const endPrice = priceData[priceData.length - 1].close
      const totalReturn = ((endPrice - startPrice) / startPrice * 100).toFixed(1)

      // Calculate maximum drawdowns and gains
      let maxPrice = startPrice
      let minPrice = startPrice
      priceData.forEach(data => {
        if (data.close > maxPrice) maxPrice = data.close
        if (data.close < minPrice) minPrice = data.close
      })

      const maxGain = ((maxPrice - startPrice) / startPrice * 100).toFixed(1)
      const maxLoss = ((minPrice - startPrice) / startPrice * 100).toFixed(1)

      console.log(`✅ ${assetConfig.symbol}: $${startPrice.toFixed(2)} → $${endPrice.toFixed(2)} (${totalReturn}%)`)
      console.log(`   📈 Max gain: ${maxGain}%, 📉 Max loss: ${maxLoss}%`)
    }

    console.log('🎉 Volatile data generation completed!')

    // Show summary with volatility metrics
    console.log('\n📊 Volatility Summary:')
    for (const asset of VOLATILE_ASSETS) {
      const priceRecords = await prisma.priceData.findMany({
        where: { asset: { symbol: asset.symbol } },
        orderBy: { date: 'asc' },
        select: { close: true }
      })

      if (priceRecords.length > 1) {
        // Calculate realized volatility
        const returns = []
        for (let i = 1; i < priceRecords.length; i++) {
          const dailyReturn = (priceRecords[i].close - priceRecords[i - 1].close) / priceRecords[i - 1].close
          returns.push(dailyReturn)
        }

        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
        const volatility = Math.sqrt(variance * 252) // Annualized

        console.log(`   ${asset.symbol}: ${(volatility * 100).toFixed(1)}% realized volatility`)
      }
    }

  } catch (error) {
    console.error('❌ Error generating volatile data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  generateVolatileData()
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { generateVolatileData }