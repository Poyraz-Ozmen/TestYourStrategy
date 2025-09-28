'use client'

import { useState } from 'react'
import { MarketDataService, HistoricalDataResponse } from '@/lib/market-data'
import { StrategyEngine, StrategyParameters, BacktestResults } from '@/lib/strategy-engine'
import StrategyForm from './StrategyForm'
import ResultsDisplay from './ResultsDisplay'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

export default function StrategyTester() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<BacktestResults | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalDataResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleStrategyTest = async (
    symbol: string,
    assetType: 'STOCK' | 'CRYPTO',
    strategy: StrategyParameters,
    analysisDays: number
  ) => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      // First try to get data from database via API
      let data: HistoricalDataResponse
      try {
        const response = await fetch(`/api/historical-data?symbol=${symbol}`)
        if (response.ok) {
          data = await response.json()
          console.log(`Using database data for ${symbol}: ${data.data.length} records`)
        } else {
          throw new Error('No database data available')
        }
      } catch {
        console.log(`No database data for ${symbol}, falling back to demo data`)
        // Fallback to demo data if not in database
        const marketDataService = new MarketDataService()
        data = await marketDataService.getDemoData(symbol, assetType)
      }

      setHistoricalData(data)

      const backtestResults = StrategyEngine.backtest(data.data, strategy, analysisDays)
      setResults(backtestResults)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-colors">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Strategy Configuration
          </h2>
        </div>

        <StrategyForm onSubmit={handleStrategyTest} loading={loading} />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 transition-colors">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300 font-medium">Error</span>
          </div>
          <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
        </div>
      )}

      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8 transition-colors">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">
              Processing strategy...
            </span>
          </div>
        </div>
      )}

      {results && historicalData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-colors">
          <div className="flex items-center gap-2 mb-6">
            <TrendingDown className="h-6 w-6 text-green-600 dark:text-green-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Backtest Results
            </h2>
          </div>

          <ResultsDisplay
            results={results}
            historicalData={historicalData}
          />
        </div>
      )}
    </div>
  )
}