'use client'

import { BacktestResults } from '@/lib/strategy-engine'
import { HistoricalDataResponse } from '@/lib/market-data'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react'
import { useTheme } from 'next-themes'

interface ResultsDisplayProps {
  results: BacktestResults
  historicalData: HistoricalDataResponse
}

export default function ResultsDisplay({ results, historicalData }: ResultsDisplayProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const priceChartData = historicalData.data.slice(-90).map(item => ({
    date: new Date(item.date).toLocaleDateString(),
    price: item.close,
    volume: item.volume
  }))

  const tradesChartData = results.trades.map((trade, index) => ({
    trade: `Trade ${index + 1}`,
    return: trade.returnPercentage
  }))

  const stats = [
    {
      label: 'Total Return',
      value: formatPercentage(results.totalReturnPercentage),
      icon: results.totalReturnPercentage >= 0 ? TrendingUp : TrendingDown,
      color: results.totalReturnPercentage >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: results.totalReturnPercentage >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
    },
    {
      label: 'Win Rate',
      value: formatPercentage(results.winRate),
      icon: Target,
      color: results.winRate >= 50 ? 'text-green-600' : 'text-red-600',
      bgColor: results.winRate >= 50 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
    },
    {
      label: 'Total Trades',
      value: results.totalTrades.toString(),
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      label: 'Profitable Trades',
      value: results.profitableTrades.toString(),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    }
  ]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className={`${stat.bgColor} rounded-lg p-4 border border-gray-200 dark:border-gray-600 transition-colors shadow-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-bold ${stat.color} dark:brightness-110`}>
                    {stat.value}
                  </p>
                </div>
                <Icon className={`h-8 w-8 ${stat.color} dark:brightness-110 opacity-80`} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Price History (Last 90 Days)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#6b7280' }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#6b7280' }} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Price']}
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '6px',
                    color: isDark ? '#f9fafb' : '#111827'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Trade Returns
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tradesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis
                  dataKey="trade"
                  tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#6b7280' }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#6b7280' }} />
                <Tooltip
                  formatter={(value: number) => [formatPercentage(value), 'Return']}
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '6px',
                    color: isDark ? '#f9fafb' : '#111827'
                  }}
                />
                <Bar dataKey="return">
                  {tradesChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.return >= 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600 transition-colors">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Trade Details
        </h3>
        <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-white">Entry Date</th>
                <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-white">Entry Price</th>
                <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-white">Exit Date</th>
                <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-white">Exit Price</th>
                <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-white">Return</th>
                <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-white">Return %</th>
              </tr>
            </thead>
            <tbody>
              {results.trades.map((trade, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                  <td className="py-2 px-4 text-gray-600 dark:text-gray-300">
                    {new Date(trade.entryDate).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4 text-gray-600 dark:text-gray-300">
                    {formatCurrency(trade.entryPrice)}
                  </td>
                  <td className="py-2 px-4 text-gray-600 dark:text-gray-300">
                    {new Date(trade.exitDate).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4 text-gray-600 dark:text-gray-300">
                    {formatCurrency(trade.exitPrice)}
                  </td>
                  <td className={`py-2 px-4 ${trade.return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(trade.return)}
                  </td>
                  <td className={`py-2 px-4 font-medium ${trade.returnPercentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatPercentage(trade.returnPercentage)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.trades.length > 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-center mt-4">
              Showing all {results.trades.length} trades
            </p>
          )}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600 transition-colors">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Strategy Performance Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
            <span className="text-gray-600 dark:text-gray-400">Max Drawdown:</span>
            <span className="ml-2 font-medium text-red-600 dark:text-red-400">
              {formatCurrency(results.maxDrawdown)}
            </span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
            <span className="text-gray-600 dark:text-gray-400">Sharpe Ratio:</span>
            <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">
              {results.sharpeRatio.toFixed(2)}
            </span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
            <span className="text-gray-600 dark:text-gray-400">Average Return per Trade:</span>
            <span className={`ml-2 font-medium ${results.totalReturnPercentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {results.totalTrades > 0 ? formatPercentage(results.totalReturnPercentage / results.totalTrades) : '0%'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}