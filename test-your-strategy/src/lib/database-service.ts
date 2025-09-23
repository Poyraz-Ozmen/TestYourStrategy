import { prisma } from './db'
import { MarketData } from './market-data'

export class DatabaseService {
  async getAssets() {
    return prisma.asset.findMany({
      orderBy: { symbol: 'asc' }
    })
  }

  async getAssetBySymbol(symbol: string) {
    return prisma.asset.findUnique({
      where: { symbol: symbol.toUpperCase() }
    })
  }

  async getHistoricalData(symbol: string): Promise<MarketData[]> {
    const asset = await this.getAssetBySymbol(symbol)

    if (!asset) {
      throw new Error(`Asset ${symbol} not found in database`)
    }

    const priceData = await prisma.priceData.findMany({
      where: { assetId: asset.id },
      orderBy: { date: 'asc' }
    })

    return priceData.map(data => ({
      symbol: asset.symbol,
      date: data.date.toISOString().split('T')[0],
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      volume: data.volume
    }))
  }

  async getAvailableSymbols() {
    const assets = await prisma.asset.findMany({
      select: {
        symbol: true,
        name: true,
        type: true,
        _count: {
          select: { priceData: true }
        }
      },
      orderBy: { symbol: 'asc' }
    })

    return assets.filter(asset => asset._count.priceData > 0)
  }

  async getDataDateRange(symbol: string) {
    const asset = await this.getAssetBySymbol(symbol)

    if (!asset) {
      return null
    }

    const result = await prisma.priceData.aggregate({
      where: { assetId: asset.id },
      _min: { date: true },
      _max: { date: true },
      _count: { id: true }
    })

    return {
      startDate: result._min.date,
      endDate: result._max.date,
      totalRecords: result._count.id
    }
  }
}