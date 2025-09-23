'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-md transition-all duration-200 ${
          theme === 'light'
            ? 'bg-white dark:bg-gray-700 shadow-md text-yellow-500 scale-105'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:scale-105'
        }`}
        aria-label="Light theme"
        title="Light theme"
      >
        <Sun className={`h-4 w-4 transition-colors ${theme === 'light' ? 'text-yellow-500' : ''}`} />
      </button>

      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-md transition-all duration-200 ${
          theme === 'dark'
            ? 'bg-white dark:bg-gray-700 shadow-md text-blue-500 scale-105'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:scale-105'
        }`}
        aria-label="Dark theme"
        title="Dark theme"
      >
        <Moon className={`h-4 w-4 transition-colors ${theme === 'dark' ? 'text-blue-500' : ''}`} />
      </button>

      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-md transition-all duration-200 ${
          theme === 'system'
            ? 'bg-white dark:bg-gray-700 shadow-md text-green-500 scale-105'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:scale-105'
        }`}
        aria-label="System theme"
        title="System theme"
      >
        <Monitor className={`h-4 w-4 transition-colors ${theme === 'system' ? 'text-green-500' : ''}`} />
      </button>
    </div>
  )
}