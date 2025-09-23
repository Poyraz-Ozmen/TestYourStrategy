import { NextRequest, NextResponse } from 'next/server'
import { MarketDataService } from '@/lib/market-data'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')
  const type = searchParams.get('type') as 'STOCK' | 'CRYPTO'

  if (!symbol || !type) {
    return NextResponse.json(
      { error: 'Symbol and type are required' },
      { status: 400 }
    )
  }

  try {
    const marketDataService = new MarketDataService()
    let data

    if (process.env.NODE_ENV === 'development') {
      data = await marketDataService.getDemoData(symbol, type)
    } else {
      if (type === 'STOCK') {
        data = await marketDataService.getStockData(symbol)
      } else {
        data = await marketDataService.getCryptoData(symbol)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    )
  }
}