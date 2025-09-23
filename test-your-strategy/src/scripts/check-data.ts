import { PrismaClient } from '@prisma/client'
import { DatabaseService } from '../lib/database-service'
import { StrategyEngine } from '../lib/strategy-engine'

const prisma = new PrismaClient()

async function checkData() {
  console.log('🔍 Checking data integrity...')

  try {
    // Check assets
    const assets = await prisma.asset.findMany({
      include: {
        _count: {
          select: { priceData: true }
        }
      }
    })

    console.log('\n📊 Assets in database:')
    assets.forEach(asset => {
      console.log(`  ${asset.symbol}: ${asset.name} - ${asset._count.priceData} records`)
    })

    // Check a specific asset's data
    const aaplAsset = assets.find(a => a.symbol === 'AAPL')
    if (aaplAsset) {
      console.log('\n🍎 AAPL Sample Data:')

      const sampleData = await prisma.priceData.findMany({
        where: { assetId: aaplAsset.id },
        orderBy: { date: 'asc' },
        take: 10
      })

      sampleData.forEach(data => {
        console.log(`  ${data.date.toISOString().split('T')[0]}: O:$${data.open.toFixed(2)} H:$${data.high.toFixed(2)} L:$${data.low.toFixed(2)} C:$${data.close.toFixed(2)} V:${data.volume}`)
      })

      // Test strategy engine
      console.log('\n🧮 Testing Strategy Engine:')
      const databaseService = new DatabaseService()
      const marketData = await databaseService.getHistoricalData('AAPL')

      console.log(`  Total records: ${marketData.length}`)
      console.log(`  Date range: ${marketData[0]?.date} to ${marketData[marketData.length - 1]?.date}`)

      // Test a simple strategy
      const strategy = {
        type: 'percentage_change' as const,
        threshold: 5,
        period: 7,
        direction: 'down' as const
      }

      const results = StrategyEngine.backtest(marketData, strategy, 7)
      console.log(`  Strategy test - Total trades: ${results.totalTrades}`)
      console.log(`  Win rate: ${results.winRate.toFixed(2)}%`)
      console.log(`  Total return: ${results.totalReturnPercentage.toFixed(2)}%`)

      // Show some sample trades
      if (results.trades.length > 0) {
        console.log('\n📈 Sample Trades:')
        results.trades.slice(0, 3).forEach((trade, index) => {
          console.log(`  Trade ${index + 1}: Entry ${trade.entryDate} $${trade.entryPrice.toFixed(2)} -> Exit ${trade.exitDate} $${trade.exitPrice.toFixed(2)} (${trade.returnPercentage.toFixed(2)}%)`)
        })
      }

      // Check for data anomalies
      console.log('\n🔍 Data Quality Checks:')
      let negativeCount = 0
      let zeroVolumeCount = 0
      let suspiciousCount = 0

      marketData.forEach(data => {
        if (data.close <= 0 || data.open <= 0 || data.high <= 0 || data.low <= 0) {
          negativeCount++
        }
        if (data.volume <= 0) {
          zeroVolumeCount++
        }
        if (data.high < data.close || data.low > data.close || data.high < data.open || data.low > data.open) {
          suspiciousCount++
        }
      })

      console.log(`  Negative/zero prices: ${negativeCount}`)
      console.log(`  Zero volume records: ${zeroVolumeCount}`)
      console.log(`  Suspicious OHLC relationships: ${suspiciousCount}`)
    }

  } catch (error) {
    console.error('❌ Error checking data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  checkData()
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { checkData }