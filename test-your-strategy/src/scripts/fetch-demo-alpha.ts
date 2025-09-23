import { PrismaClient, AssetType } from '@prisma/client'

const prisma = new PrismaClient()

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Use Alpha Vantage demo data for IBM
async function fetchDemoData() {
  console.log('🚀 Fetching demo data from Alpha Vantage...')

  try {
    const url = 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&apikey=demo&outputsize=full'

    console.log('📊 Fetching IBM stock data...')
    const response = await fetch(url)
    const data = await response.json()

    if (data['Error Message']) {
      console.error('API Error:', data['Error Message'])
      return
    }

    const timeSeries = data['Time Series (Daily)']
    if (!timeSeries) {
      console.error('No time series data found')
      return
    }

    // Create or get IBM asset
    let asset = await prisma.asset.findUnique({
      where: { symbol: 'IBM' }
    })

    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          symbol: 'IBM',
          name: 'International Business Machines Corporation',
          type: 'STOCK',
          exchange: 'NYSE'
        }
      })
      console.log('✅ Created IBM asset')
    }

    // Clear existing data
    await prisma.priceData.deleteMany({
      where: { assetId: asset.id }
    })

    // Convert and store data
    const priceEntries = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      assetId: asset.id,
      date: new Date(date),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseFloat(values['5. volume'])
    }))

    console.log(`📈 Processing ${priceEntries.length} data points...`)

    // Insert in batches
    const batchSize = 100
    for (let i = 0; i < priceEntries.length; i += batchSize) {
      const batch = priceEntries.slice(i, i + batchSize)
      await prisma.priceData.createMany({
        data: batch,
        skipDuplicates: true
      })
    }

    console.log(`✅ Stored ${priceEntries.length} price records for IBM`)

    // Get date range
    const dateRange = await prisma.priceData.aggregate({
      where: { assetId: asset.id },
      _min: { date: true },
      _max: { date: true }
    })

    console.log(`📅 Date range: ${dateRange._min.date?.toDateString()} to ${dateRange._max.date?.toDateString()}`)

    console.log('🎉 Demo data fetch completed!')

  } catch (error) {
    console.error('❌ Error fetching demo data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  fetchDemoData()
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { fetchDemoData }