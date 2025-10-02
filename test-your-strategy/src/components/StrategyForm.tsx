'use client'

import { useState, useEffect } from 'react'
import { StrategyParameters } from '@/lib/strategy-engine'

interface StrategyFormProps {
  onSubmit: (symbol: string, assetType: 'STOCK' | 'CRYPTO', strategy: StrategyParameters, analysisDays: number) => void
  loading: boolean
}

interface Asset {
  symbol: string
  name: string
  type: 'STOCK' | 'CRYPTO'
  _count: { priceData: number }
}

export default function StrategyForm({ onSubmit, loading }: StrategyFormProps) {
  const [symbol, setSymbol] = useState('AAPL')
  const [assetType, setAssetType] = useState<'STOCK' | 'CRYPTO'>('STOCK')
  const [thresholdMin, setThresholdMin] = useState(4)
  const [thresholdMax, setThresholdMax] = useState(6)
  const [period, setPeriod] = useState(7)
  const [analysisDays, setAnalysisDays] = useState(7)
  const [direction, setDirection] = useState<'up' | 'down'>('down')
  const [startDate, setStartDate] = useState('')
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([])

  useEffect(() => {
    // Fetch available assets from the database
    fetch('/api/assets')
      .then(res => res.json())
      .then(assets => {
        setAvailableAssets(assets)
        if (assets.length > 0 && !assets.find((a: Asset) => a.symbol === symbol)) {
          setSymbol(assets[0].symbol)
          setAssetType(assets[0].type)
        }
      })
      .catch(err => console.error('Failed to fetch assets:', err))
  }, [])

  // Filter assets based on selected asset type
  const filteredAssets = availableAssets.filter(asset => asset.type === assetType)

  // Update selected symbol when asset type changes
  useEffect(() => {
    if (filteredAssets.length > 0 && !filteredAssets.find(a => a.symbol === symbol)) {
      setSymbol(filteredAssets[0].symbol)
    }
  }, [assetType, filteredAssets, symbol])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate threshold range
    if (thresholdMin > thresholdMax) {
      alert('Minimum threshold cannot be greater than maximum threshold')
      return
    }

    const strategy: StrategyParameters = {
      type: 'percentage_change',
      thresholdMin,
      thresholdMax,
      period,
      direction,
      ...(startDate && { startDate })
    }

    onSubmit(symbol.toUpperCase(), assetType, strategy, analysisDays)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Symbol
            </label>
            {filteredAssets.length > 0 ? (
              <select
                id="symbol"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value)
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
              >
                {filteredAssets.map(asset => (
                  <option key={asset.symbol} value={asset.symbol} className="dark:bg-gray-700 dark:text-white">
                    {asset.symbol} - {asset.name} ({asset._count.priceData} records)
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                placeholder="e.g., AAPL, BTC"
                required
              />
            )}
          </div>

          <div>
            <label htmlFor="assetType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Asset Type
            </label>
            <select
              id="assetType"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as 'STOCK' | 'CRYPTO')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
            >
              <option value="STOCK" className="dark:bg-gray-700 dark:text-white">Stock</option>
              <option value="CRYPTO" className="dark:bg-gray-700 dark:text-white">Cryptocurrency</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Threshold Range (%)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="thresholdMin" className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Min
                </label>
                <input
                  type="number"
                  id="thresholdMin"
                  value={thresholdMin}
                  onChange={(e) => setThresholdMin(Number(e.target.value))}
                  min="0.1"
                  max="50"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                />
              </div>
              <div>
                <label htmlFor="thresholdMax" className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Max
                </label>
                <input
                  type="number"
                  id="thresholdMax"
                  value={thresholdMax}
                  onChange={(e) => setThresholdMax(Number(e.target.value))}
                  min="0.1"
                  max="50"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Price change threshold range to trigger the strategy
            </p>
          </div>

          <div>
            <label htmlFor="period" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Period (days)
            </label>
            <input
              type="number"
              id="period"
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              min="1"
              max="30"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Number of days to look back for price change
            </p>
          </div>

          <div>
            <label htmlFor="analysisDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Analysis Period (days)
            </label>
            <input
              type="number"
              id="analysisDays"
              value={analysisDays}
              onChange={(e) => setAnalysisDays(Number(e.target.value))}
              min="1"
              max="30"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Number of days to analyze after the trigger condition
            </p>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Start Date (Optional)
        </label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Only analyze trades from this date onwards. Leave empty to use all historical data.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Direction
        </label>
        <div className="flex space-x-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="down"
              checked={direction === 'down'}
              onChange={(e) => setDirection(e.target.value as 'up' | 'down')}
              className="mr-2 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 select-none">Down (Price Drop)</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="up"
              checked={direction === 'up'}
              onChange={(e) => setDirection(e.target.value as 'up' | 'down')}
              className="mr-2 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 select-none">Up (Price Rise)</span>
          </label>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
          Strategy Summary
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          Test what happens when <strong>{symbol}</strong> is{' '}
          <strong>{direction === 'down' ? 'down' : 'up'} between {thresholdMin}% and {thresholdMax}%</strong> over{' '}
          <strong>{period} day{period !== 1 ? 's' : ''}</strong>.
          We&apos;ll analyze the next <strong>{analysisDays} day{analysisDays !== 1 ? 's' : ''}</strong> performance in similar historical situations.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 shadow-sm hover:shadow-md disabled:hover:shadow-sm"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Testing Strategy...
          </div>
        ) : (
          'Test Strategy'
        )}
      </button>
    </form>
  )
}