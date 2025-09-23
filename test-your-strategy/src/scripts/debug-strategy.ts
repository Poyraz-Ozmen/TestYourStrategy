import { DatabaseService } from '../lib/database-service'
import { StrategyEngine } from '../lib/strategy-engine'

async function debugStrategy() {
  console.log('🐛 Debugging Strategy Engine...')

  try {
    const databaseService = new DatabaseService()
    const marketData = await databaseService.getHistoricalData('AAPL')

    console.log(`📊 Data loaded: ${marketData.length} records`)
    console.log(`📅 Date range: ${marketData[0]?.date} to ${marketData[marketData.length - 1]?.date}`)

    // Show first few records
    console.log('\n💰 First 10 prices:')
    marketData.slice(0, 10).forEach((data, index) => {
      console.log(`  ${index}: ${data.date} - Close: $${data.close.toFixed(2)}`)
    })

    // Test percentage calculation
    console.log('\n📈 Testing percentage calculations (7-day periods):')
    const dataWithChanges = StrategyEngine.calculatePercentageChange(marketData, 7)

    // Show percentage changes for days 7-17 (first valid calculations)
    dataWithChanges.slice(7, 17).forEach((data, index) => {
      const actualIndex = index + 7
      const prevPrice = marketData[actualIndex - 7].close
      const currentPrice = data.close
      const manualCalc = ((currentPrice - prevPrice) / prevPrice) * 100

      console.log(`  Day ${actualIndex}: ${data.date}`)
      console.log(`    Previous (${marketData[actualIndex - 7].date}): $${prevPrice.toFixed(2)}`)
      console.log(`    Current: $${currentPrice.toFixed(2)}`)
      console.log(`    Engine calc: ${(data as any).percentageChange?.toFixed(2)}%`)
      console.log(`    Manual calc: ${manualCalc.toFixed(2)}%`)
      console.log('')
    })

    // Test strategy matching
    const strategy = {
      type: 'percentage_change' as const,
      threshold: 5,
      period: 7,
      direction: 'down' as const
    }

    console.log('\n🎯 Testing strategy matching (5% down over 7 days):')
    const matches = StrategyEngine.findMatches(marketData, strategy)
    console.log(`Found ${matches.length} matches`)

    // Show first few matches
    if (matches.length > 0) {
      console.log('\n✅ First 5 matches:')
      matches.slice(0, 5).forEach((matchIndex, i) => {
        const matchData = dataWithChanges[matchIndex]
        const prevPrice = marketData[matchIndex - 7].close
        const currentPrice = matchData.close
        const change = ((currentPrice - prevPrice) / prevPrice) * 100

        console.log(`  Match ${i + 1}: Index ${matchIndex}, Date ${matchData.date}`)
        console.log(`    Change: ${change.toFixed(2)}% (threshold: -${strategy.threshold}%)`)
      })
    } else {
      console.log('❌ No matches found. Let me check thresholds...')

      // Find the most negative changes
      const changesWithIndex = dataWithChanges.map((data, index) => ({
        index,
        date: data.date,
        change: (data as any).percentageChange || 0
      })).filter(item => item.change < 0).sort((a, b) => a.change - b.change)

      console.log('\n📉 Most negative changes found:')
      changesWithIndex.slice(0, 10).forEach(item => {
        console.log(`  ${item.date}: ${item.change.toFixed(2)}%`)
      })

      // Try with smaller threshold
      console.log('\n🔄 Trying with 2% threshold...')
      const smallerStrategy = { ...strategy, threshold: 2 }
      const smallerMatches = StrategyEngine.findMatches(marketData, smallerStrategy)
      console.log(`Found ${smallerMatches.length} matches with 2% threshold`)
    }

  } catch (error) {
    console.error('❌ Error in debug:', error)
  }
}

if (require.main === module) {
  debugStrategy()
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { debugStrategy }