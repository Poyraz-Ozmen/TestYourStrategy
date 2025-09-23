import { DatabaseService } from '../lib/database-service'
import { StrategyEngine } from '../lib/strategy-engine'

async function testMultipleStrategies() {
  console.log('🎯 Testing multiple strategies with volatile data...')

  try {
    const databaseService = new DatabaseService()

    const symbols = ['AAPL', 'TSLA', 'BTC']

    for (const symbol of symbols) {
      console.log(`\n📊 Testing ${symbol}:`)
      const marketData = await databaseService.getHistoricalData(symbol)

      const strategies = [
        { threshold: 3, direction: 'down' as const, name: '3% down' },
        { threshold: 5, direction: 'down' as const, name: '5% down' },
        { threshold: 10, direction: 'down' as const, name: '10% down' },
        { threshold: 3, direction: 'up' as const, name: '3% up' },
        { threshold: 5, direction: 'up' as const, name: '5% up' },
        { threshold: 10, direction: 'up' as const, name: '10% up' },
      ]

      strategies.forEach(strategyConfig => {
        const strategy = {
          type: 'percentage_change' as const,
          threshold: strategyConfig.threshold,
          period: 7,
          direction: strategyConfig.direction
        }

        const results = StrategyEngine.backtest(marketData, strategy, 7)

        console.log(`  ${strategyConfig.name}: ${results.totalTrades} trades, ` +
                   `${results.winRate.toFixed(1)}% win rate, ` +
                   `${results.totalReturnPercentage.toFixed(2)}% return`)
      })
    }

  } catch (error) {
    console.error('❌ Error testing strategies:', error)
  }
}

if (require.main === module) {
  testMultipleStrategies()
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { testMultipleStrategies }