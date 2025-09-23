export interface MarketData {
  symbol: string
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface HistoricalDataResponse {
  symbol: string
  data: MarketData[]
}

export class MarketDataService {
  private readonly ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo'
  private readonly BASE_URL = 'https://www.alphavantage.co/query'

  async getStockData(symbol: string, interval: 'daily' | 'weekly' = 'daily'): Promise<HistoricalDataResponse> {
    try {
      const function_name = interval === 'daily' ? 'TIME_SERIES_DAILY' : 'TIME_SERIES_WEEKLY'
      const url = `${this.BASE_URL}?function=${function_name}&symbol=${symbol}&apikey=${this.ALPHA_VANTAGE_API_KEY}&outputsize=full`

      const response = await fetch(url)
      const data = await response.json()

      if (data['Error Message']) {
        throw new Error(`API Error: ${data['Error Message']}`)
      }

      const timeSeriesKey = interval === 'daily' ? 'Time Series (Daily)' : 'Weekly Time Series'
      const timeSeries = data[timeSeriesKey]

      if (!timeSeries) {
        throw new Error('No time series data found')
      }

      const marketData: MarketData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
        symbol,
        date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseFloat(values['5. volume'])
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      return { symbol, data: marketData }
    } catch (error) {
      console.error('Error fetching stock data:', error)
      throw error
    }
  }

  async getCryptoData(symbol: string): Promise<HistoricalDataResponse> {
    try {
      const url = `${this.BASE_URL}?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=USD&apikey=${this.ALPHA_VANTAGE_API_KEY}`

      const response = await fetch(url)
      const data = await response.json()

      if (data['Error Message']) {
        throw new Error(`API Error: ${data['Error Message']}`)
      }

      const timeSeries = data['Time Series (Digital Currency Daily)']

      if (!timeSeries) {
        throw new Error('No time series data found')
      }

      const marketData: MarketData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
        symbol,
        date,
        open: parseFloat(values['1a. open (USD)']),
        high: parseFloat(values['2a. high (USD)']),
        low: parseFloat(values['3a. low (USD)']),
        close: parseFloat(values['4a. close (USD)']),
        volume: parseFloat(values['5. volume'])
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      return { symbol, data: marketData }
    } catch (error) {
      console.error('Error fetching crypto data:', error)
      throw error
    }
  }

  async getDemoData(symbol: string, type: 'STOCK' | 'CRYPTO'): Promise<HistoricalDataResponse> {
    const startDate = new Date('2020-01-01')
    const endDate = new Date()
    const data: MarketData[] = []

    let currentDate = new Date(startDate)
    let basePrice = type === 'STOCK' ? 100 : 50000

    while (currentDate <= endDate) {
      const volatility = Math.random() * 0.1 - 0.05
      const open = basePrice * (1 + volatility)
      const close = open * (1 + (Math.random() * 0.06 - 0.03))
      const high = Math.max(open, close) * (1 + Math.random() * 0.02)
      const low = Math.min(open, close) * (1 - Math.random() * 0.02)
      const volume = Math.floor(Math.random() * 1000000) + 100000

      data.push({
        symbol,
        date: currentDate.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume
      })

      basePrice = close
      currentDate.setDate(currentDate.getDate() + 1)

      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + (currentDate.getDay() === 0 ? 1 : 2))
      }
    }

    return { symbol, data }
  }
}