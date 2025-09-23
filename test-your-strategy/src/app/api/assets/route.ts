import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database-service'

export async function GET() {
  try {
    const databaseService = new DatabaseService()
    const assets = await databaseService.getAvailableSymbols()

    return NextResponse.json(assets)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    )
  }
}