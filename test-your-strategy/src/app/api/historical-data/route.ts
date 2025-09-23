import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database-service'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    )
  }

  try {
    const databaseService = new DatabaseService()
    const marketData = await databaseService.getHistoricalData(symbol.toUpperCase())

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      data: marketData
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'No historical data found in database' },
      { status: 404 }
    )
  }
}