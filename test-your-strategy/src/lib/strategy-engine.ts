import { MarketData } from './market-data'

export interface StrategyParameters {
  type: 'percentage_change'
  threshold: number
  period: number
  direction: 'up' | 'down'
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

      if (strategy.direction === 'down' && percentageChange <= -Math.abs(strategy.threshold)) {
        matches.push(index)
      } else if (strategy.direction === 'up' && percentageChange >= Math.abs(strategy.threshold)) {
        matches.push(index)
      }
    })

    return matches
  }

  static backtest(data: MarketData[], strategy: StrategyParameters, holdingPeriod: number = 7): BacktestResults {
    const matches = this.findMatches(data, strategy)
    const trades: BacktestTrade[] = []
    let totalReturn = 0
    let profitableTrades = 0

    matches.forEach(matchIndex => {
      const entryIndex = matchIndex + 1
      const exitIndex = entryIndex + holdingPeriod

      if (exitIndex >= data.length) return

      const entryPrice = data[entryIndex].close
      const exitPrice = data[exitIndex].close
      const returnAmount = exitPrice - entryPrice
      const returnPercentage = (returnAmount / entryPrice) * 100

      const trade: BacktestTrade = {
        entryDate: data[entryIndex].date,
        entryPrice,
        exitDate: data[exitIndex].date,
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
    const totalReturnPercentage = totalTrades > 0 ? (totalReturn / (totalTrades * data[0].close)) * 100 : 0

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

  static analyzeStrategy(data: MarketData[], strategy: StrategyParameters): {
    matches: Array<{ date: string; price: number; change: number }>
    nextWeekReturns: Array<{ date: string; return: number; returnPercentage: number }>
  } {
    const dataWithChanges = this.calculatePercentageChange(data, strategy.period)
    const matchIndices = this.findMatches(data, strategy)

    const matches = matchIndices.map(index => ({
      date: data[index].date,
      price: data[index].close,
      change: (dataWithChanges[index] as any).percentageChange
    }))

    const nextWeekReturns = matchIndices.map(index => {
      const nextWeekIndex = index + 7
      if (nextWeekIndex >= data.length) return null

      const currentPrice = data[index].close
      const nextWeekPrice = data[nextWeekIndex].close
      const returnAmount = nextWeekPrice - currentPrice
      const returnPercentage = (returnAmount / currentPrice) * 100

      return {
        date: data[nextWeekIndex].date,
        return: returnAmount,
        returnPercentage
      }
    }).filter(Boolean) as Array<{ date: string; return: number; returnPercentage: number }>

    return { matches, nextWeekReturns }
  }
}