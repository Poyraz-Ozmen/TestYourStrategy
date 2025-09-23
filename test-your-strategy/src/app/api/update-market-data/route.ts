import { NextRequest, NextResponse } from 'next/server'
import { MarketDataService } from '@/lib/market-data'
import { DatabaseService } from '@/lib/database-service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { symbols, limit = 10 } = await request.json()

    const marketDataService = new MarketDataService()
    const databaseService = new DatabaseService()

    // If no symbols provided, get some random symbols from database
    let symbolsToUpdate: string[] = symbols || []

    if (!symbolsToUpdate.length) {
      const allAssets = await databaseService.getAvailableSymbols()
      // Get random symbols up to the limit
      symbolsToUpdate = allAssets
        .sort(() => 0.5 - Math.random())
        .slice(0, limit)
        .map(asset => asset.symbol)
    }

    const results = {
      successful: [] as string[],
      failed: [] as string[],
      totalUpdated: 0
    }

    console.log(`Starting market data update for ${symbolsToUpdate.length} symbols...`)

    for (const symbol of symbolsToUpdate) {
      try {
        console.log(`Fetching data for ${symbol}...`)

        // Get the asset from database to determine type
        const asset = await prisma.asset.findUnique({
          where: { symbol }
        })

        if (!asset) {
          console.warn(`Asset ${symbol} not found in database`)
          results.failed.push(symbol)
          continue
        }

        // Fetch latest market data
        let marketDataResponse
        if (asset.type === 'CRYPTO') {
          marketDataResponse = await marketDataService.getCryptoData(symbol)
        } else {
          marketDataResponse = await marketDataService.getStockData(symbol, 'daily')
        }

        // Get the latest data point (most recent date)
        const latestData = marketDataResponse.data[marketDataResponse.data.length - 1]

        if (!latestData) {
          console.warn(`No market data found for ${symbol}`)
          results.failed.push(symbol)
          continue
        }

        // Check if we already have this date's data
        const existingData = await prisma.priceData.findFirst({
          where: {
            assetId: asset.id,
            date: new Date(latestData.date)
          }
        })

        if (existingData) {
          console.log(`Data for ${symbol} on ${latestData.date} already exists, skipping...`)
          results.successful.push(symbol)
          continue
        }

        // Create new price data record
        await prisma.priceData.create({
          data: {
            assetId: asset.id,
            date: new Date(latestData.date),
            open: latestData.open,
            high: latestData.high,
            low: latestData.low,
            close: latestData.close,
            volume: latestData.volume
          }
        })

        console.log(`Successfully updated ${symbol} with data for ${latestData.date}`)
        results.successful.push(symbol)
        results.totalUpdated++

        // Add a small delay to avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Error updating ${symbol}:`, error)
        results.failed.push(symbol)
      }
    }

    return NextResponse.json({
      message: `Market data update completed`,
      results
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to update market data' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Market data update endpoint',
    usage: {
      method: 'POST',
      description: 'Updates market data for specified symbols',
      body: {
        symbols: 'Array of stock symbols (optional)',
        limit: 'Number of random symbols to update if symbols not provided (default: 10)'
      },
      examples: {
        'Update specific symbols': {
          symbols: ['AAPL', 'GOOGL', 'MSFT']
        },
        'Update 5 random symbols': {
          limit: 5
        }
      }
    }
  })
}