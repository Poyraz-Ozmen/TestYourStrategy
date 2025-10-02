import { MarketData } from './market-data'

export interface StrategyParameters {
  type: 'percentage_change'
  thresholdMin: number
  thresholdMax: number
  period: number
  direction: 'up' | 'down'
  startDate?: string
}

export interface StrategyCondition {
  field: keyof MarketData
  operator: '>' | '<' | '>=' | '<=' | '='
  value: number
  period?: number
}

export interface BacktestTrade {
  entryDate: string
  entryPrice: number
  exitDate: string
  exitPrice: number
  return: number
  returnPercentage: number
}

export interface BacktestResults {
  totalReturn: number
  totalReturnPercentage: number
  winRate: number
  totalTrades: number
  profitableTrades: number
  trades: BacktestTrade[]
  maxDrawdown: number
  sharpeRatio: number
}

export class StrategyEngine {
  static calculatePercentageChange(data: MarketData[], period: number = 7): MarketData[] {
    return data.map((item, index) => {
      if (index < period) {
        return { ...item, percentageChange: 0 }
      }

      const currentPrice = item.close
      const previousPrice = data[index - period].close
      const percentageChange = ((currentPrice - previousPrice) / previousPrice) * 100

      return { ...item, percentageChange }
    })
  }

  static findMatches(data: MarketData[], strategy: StrategyParameters): number[] {
    const dataWithChanges = this.calculatePercentageChange(data, strategy.period)
    const matches: number[] = []

    dataWithChanges.forEach((item, index) => {
      const percentageChange = (item as any).percentageChange

      if (strategy.direction === 'down') {
        const minThreshold = -Math.abs(strategy.thresholdMax)
        const maxThreshold = -Math.abs(strategy.thresholdMin)
        if (percentageChange >= minThreshold && percentageChange <= maxThreshold) {
          matches.push(index)
        }
      } else if (strategy.direction === 'up') {
        const minThreshold = Math.abs(strategy.thresholdMin)
        const maxThreshold = Math.abs(strategy.thresholdMax)
        if (percentageChange >= minThreshold && percentageChange <= maxThreshold) {
          matches.push(index)
        }
      }
    })

    return matches
  }

  static backtest(data: MarketData[], strategy: StrategyParameters, analysisDays: number = 7): BacktestResults {
    // Filter data by start date if provided
    let filteredData = data
    if (strategy.startDate) {
      const startDateObj = new Date(strategy.startDate)
      console.log('Filtering data from start date:', strategy.startDate)
      console.log('Original data length:', data.length)
      filteredData = data.filter(item => new Date(item.date) >= startDateObj)
      console.log('Filtered data length:', filteredData.length)
      console.log('Date range:', filteredData.length > 0 ? `${filteredData[0].date} to ${filteredData[filteredData.length - 1].date}` : 'No data')
    }

    const matches = this.findMatches(filteredData, strategy)
    const trades: BacktestTrade[] = []
    let totalReturn = 0
    let profitableTrades = 0

    matches.forEach(matchIndex => {
      const entryIndex = matchIndex + 1
      const exitIndex = entryIndex + analysisDays

      if (exitIndex >= filteredData.length) return

      const entryPrice = filteredData[entryIndex].close
      const exitPrice = filteredData[exitIndex].close
      const returnAmount = exitPrice - entryPrice
      const returnPercentage = (returnAmount / entryPrice) * 100

      const trade: BacktestTrade = {
        entryDate: filteredData[entryIndex].date,
        entryPrice,
        exitDate: filteredData[exitIndex].date,
        exitPrice,
        return: returnAmount,
        returnPercentage
      }

      trades.push(trade)
      totalReturn += returnAmount

      if (returnAmount > 0) {
        profitableTrades++
      }
    })

    const totalTrades = trades.length
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0
    const totalReturnPercentage = totalTrades > 0 ? (totalReturn / (totalTrades * filteredData[0].close)) * 100 : 0

    const maxDrawdown = this.calculateMaxDrawdown(trades)
    const sharpeRatio = this.calculateSharpeRatio(trades)

    return {
      totalReturn,
      totalReturnPercentage,
      winRate,
      totalTrades,
      profitableTrades,
      trades,
      maxDrawdown,
      sharpeRatio
    }
  }

  private static calculateMaxDrawdown(trades: BacktestTrade[]): number {
    let maxDrawdown = 0
    let peak = 0
    let runningTotal = 0

    trades.forEach(trade => {
      runningTotal += trade.return
      if (runningTotal > peak) {
        peak = runningTotal
      }
      const drawdown = peak - runningTotal
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    })

    return maxDrawdown
  }

  private static calculateSharpeRatio(trades: BacktestTrade[]): number {
    if (trades.length === 0) return 0

    const returns = trades.map(trade => trade.returnPercentage)
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)

    return stdDev === 0 ? 0 : avgReturn / stdDev
  }

  static analyzeStrategy(data: MarketData[], strategy: StrategyParameters, analysisDays: number = 7): {
    matches: Array<{ date: string; price: number; change: number }>
    analysisReturns: Array<{ date: string; return: number; returnPercentage: number }>
  } {
    // Filter data by start date if provided
    let filteredData = data
    if (strategy.startDate) {
      filteredData = data.filter(item => new Date(item.date) >= new Date(strategy.startDate!))
    }

    const dataWithChanges = this.calculatePercentageChange(filteredData, strategy.period)
    const matchIndices = this.findMatches(filteredData, strategy)

    const matches = matchIndices.map(index => ({
      date: filteredData[index].date,
      price: filteredData[index].close,
      change: (dataWithChanges[index] as any).percentageChange
    }))

    const analysisReturns = matchIndices.map(index => {
      const analysisIndex = index + analysisDays
      if (analysisIndex >= filteredData.length) return null

      const currentPrice = filteredData[index].close
      const analysisPrice = filteredData[analysisIndex].close
      const returnAmount = analysisPrice - currentPrice
      const returnPercentage = (returnAmount / currentPrice) * 100

      return {
        date: filteredData[analysisIndex].date,
        return: returnAmount,
        returnPercentage
      }
    }).filter(Boolean) as Array<{ date: string; return: number; returnPercentage: number }>

    return { matches, analysisReturns }
  }
}