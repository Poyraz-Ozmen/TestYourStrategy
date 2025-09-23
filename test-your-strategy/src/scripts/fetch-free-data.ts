import { PrismaClient, AssetType } from '@prisma/client'

const prisma = new PrismaClient()

interface AssetToFetch {
  symbol: string
  name: string
  type: AssetType
  exchange?: string
}

const ASSETS_TO_FETCH: AssetToFetch[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'STOCK', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'STOCK', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'STOCK', exchange: 'NASDAQ' },
]

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Using Yahoo Finance API (free, no key required)
async function fetchYahooData(symbol: string): Promise<any[]> {
  const period1 = Math.floor(new Date('2020-01-01').getTime() / 1000)
  const period2 = Math.floor(new Date().getTime() / 1000)

  const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${period1}&period2=${period2}&interval=1d&events=history`

  try {
    const response = await fetch(url)
    const csvText = await response.text()

    const lines = csvText.trim().split('\n')
    const headers = lines[0].split(',')

    return lines.slice(1).map(line => {
      const values = line.split(',')
      return {
        date: values[0],
        open: parseFloat(values[1]),
        high: parseFloat(values[2]),
        low: parseFloat(values[3]),
        close: parseFloat(values[4]),
        adjClose: parseFloat(values[5]),
        volume: parseInt(values[6])
      }
    }).filter(item => !isNaN(item.close))
  } catch (error) {
    console.error(`Error fetching Yahoo data for ${symbol}:`, error)
    return []
  }
}

// Using CoinGecko API for crypto data (free, no key required)
async function fetchCryptoData(symbol: string): Promise<any[]> {
  const coinIds: { [key: string]: string } = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'LINK': 'chainlink'
  }

  const coinId = coinIds[symbol]
  if (!coinId) {
    console.error(`No CoinGecko ID found for ${symbol}`)
    return []
  }

  try {
    const days = Math.ceil((Date.now() - new Date('2020-01-01').getTime()) / (1000 * 60 * 60 * 24))
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`

    const response = await fetch(url)
    const data = await response.json()

    if (!data.prices) {
      console.error(`No price data returned for ${symbol}`)
      return []
    }

    return data.prices.map((price: [number, number], index: number) => {
      const timestamp = price[0]
      const closePrice = price[1]

      // Approximate OHLC from close price with small variations
      const variation = 0.02 // 2% variation
      const open = closePrice * (1 + (Math.random() - 0.5) * variation)
      const high = Math.max(open, closePrice) * (1 + Math.random() * variation)
      const low = Math.min(open, closePrice) * (1 - Math.random() * variation)
      const volume = Math.floor(Math.random() * 1000000000) + 100000000 // Random volume

      return {
        date: new Date(timestamp).toISOString().split('T')[0],
        open,
        high,
        low,
        close: closePrice,
        volume
      }
    })
  } catch (error) {
    console.error(`Error fetching CoinGecko data for ${symbol}:`, error)
    return []
  }
}

async function fetchFreeData() {
  console.log('🚀 Starting free data fetch from Yahoo Finance and CoinGecko...')

  try {
    // Fetch stock data
    for (const assetConfig of ASSETS_TO_FETCH.filter(a => a.type === 'STOCK')) {
      console.log(`📊 Fetching stock data for ${assetConfig.symbol}...`)

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
        }

        const historicalData = await fetchYahooData(assetConfig.symbol)

        if (historicalData.length === 0) {
          console.log(`  ⚠️ No data received for ${assetConfig.symbol}`)
          continue
        }

        console.log(`  📈 Received ${historicalData.length} data points`)

        // Delete existing price data
        await prisma.priceData.deleteMany({
          where: { assetId: asset.id }
        })

        // Insert new price data
        const priceData = historicalData.map(item => ({
          assetId: asset.id,
          date: new Date(item.date),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume
        }))

        await prisma.priceData.createMany({
          data: priceData,
          skipDuplicates: true
        })

        console.log(`  ✅ Stored ${priceData.length} price records`)
        await delay(1000) // Be nice to Yahoo Finance

      } catch (error) {
        console.error(`  ❌ Error processing ${assetConfig.symbol}:`, error)
      }
    }

    // Fetch crypto data
    const cryptoAssets = [
      { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO' as AssetType },
      { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO' as AssetType }
    ]

    for (const assetConfig of cryptoAssets) {
      console.log(`₿ Fetching crypto data for ${assetConfig.symbol}...`)

      try {
        let asset = await prisma.asset.findUnique({
          where: { symbol: assetConfig.symbol }
        })

        if (!asset) {
          asset = await prisma.asset.create({
            data: {
              symbol: assetConfig.symbol,
              name: assetConfig.name,
              type: assetConfig.type
            }
          })
        }

        const historicalData = await fetchCryptoData(assetConfig.symbol)

        if (historicalData.length === 0) {
          console.log(`  ⚠️ No data received for ${assetConfig.symbol}`)
          continue
        }

        console.log(`  📈 Received ${historicalData.length} data points`)

        await prisma.priceData.deleteMany({
          where: { assetId: asset.id }
        })

        const priceData = historicalData.map(item => ({
          assetId: asset.id,
          date: new Date(item.date),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume
        }))

        await prisma.priceData.createMany({
          data: priceData,
          skipDuplicates: true
        })

        console.log(`  ✅ Stored ${priceData.length} price records`)
        await delay(2000) // Be nice to CoinGecko API

      } catch (error) {
        console.error(`  ❌ Error processing ${assetConfig.symbol}:`, error)
      }
    }

    console.log('🎉 Free data fetch completed!')

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
  fetchFreeData()
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { fetchFreeData }