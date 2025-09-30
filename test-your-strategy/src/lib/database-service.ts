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
    // First try to find in regular assets
    const asset = await this.getAssetBySymbol(symbol)

    if (asset) {
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

    // Try to find in cryptocurrencies using raw SQL to bypass Prisma conversion issues
    try {
      const cleanSymbol = symbol.toUpperCase()
      const symbolWithSuffix = cleanSymbol.includes('-') ? cleanSymbol : `${cleanSymbol}-USD`

      // Try both symbol variants using raw SQL
      const crypto: any = await prisma.$queryRaw`
        SELECT id, symbol FROM Cryptocurrency
        WHERE symbol = ${cleanSymbol} OR symbol = ${symbolWithSuffix}
        LIMIT 1
      `

      if (crypto && crypto.length > 0) {
        const cryptoId = crypto[0].id
        const cryptoSymbol = crypto[0].symbol

        const priceData: any = await prisma.$queryRaw`
          SELECT date, open, high, low, close, volume
          FROM CryptocurrencyPrice
          WHERE cryptocurrencyId = ${cryptoId}
          ORDER BY date ASC
        `

        return priceData.map((data: any) => ({
          symbol: cryptoSymbol,
          date: new Date(data.date).toISOString().split('T')[0],
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: data.volume
        }))
      }
    } catch (error) {
      console.error('Error querying cryptocurrency:', error)
    }

    throw new Error(`Asset ${symbol} not found in database`)
  }

  async getAvailableSymbols() {
    // Get regular assets (stocks)
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

    // Get cryptocurrencies
    let cryptocurrencies: any[] = []
    try {
      cryptocurrencies = await prisma.cryptocurrency.findMany({
        select: {
          symbol: true,
          name: true,
          _count: {
            select: { priceData: true }
          }
        },
        orderBy: { symbol: 'asc' }
      })
    } catch (error) {
      console.error('Error fetching cryptocurrencies:', error)
      // Return empty array if there's an error reading cryptocurrencies
      cryptocurrencies = []
    }

    // Combine and format all assets
    const allAssets = [
      ...assets.filter(asset => asset._count.priceData > 0),
      ...cryptocurrencies
        .filter(crypto => crypto._count.priceData > 0)
        .map(crypto => ({
          symbol: crypto.symbol,
          name: crypto.name,
          type: 'CRYPTO' as const,
          _count: crypto._count
        }))
    ]

    return allAssets.sort((a, b) => a.symbol.localeCompare(b.symbol))
  }

  async getDataDateRange(symbol: string) {
    // First try to find in regular assets
    const asset = await this.getAssetBySymbol(symbol)

    if (asset) {
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

    // Try to find in cryptocurrencies
    const crypto = await prisma.cryptocurrency.findUnique({
      where: { symbol: symbol.toUpperCase() }
    })

    if (crypto) {
      const result = await prisma.cryptocurrencyPrice.aggregate({
        where: { cryptocurrencyId: crypto.id },
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

    return null
  }
}