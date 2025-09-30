# Claude Code Project Configuration

## Project Overview
Next.js application with TypeScript and Tailwind CSS.

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Tech Stack
- Next.js 15.5.3
- TypeScript
- Tailwind CSS
- ESLint

## Project Overview
A trading strategy backtesting application that allows users to test their trading strategies against historical market data.

### Features
- **Strategy Testing**: Test strategies based on percentage price changes over specified periods
- **Historical Analysis**: Analyze what happens when assets meet certain criteria (e.g., down 5% in a week)
- **Dual Market Support**: Support for both stock market and cryptocurrency data
- **Visual Results**: Charts and graphs showing price history and trade performance
- **Detailed Metrics**: Win rate, total return, Sharpe ratio, max drawdown, and more

### Example Use Case
Test the strategy: "When AAPL is down 5% over the previous week, what happens in the next week?"
The system will:
1. Find all historical instances where AAPL was down 5% over a week
2. Analyze the performance in the following week for each instance
3. Calculate overall statistics and visualize results

### Technical Implementation
- **Database**: SQLite with Prisma ORM for storing assets, price data, strategies, and results
- **Market Data**: Alpha Vantage API integration with demo data fallback
- **Strategy Engine**: Custom backtesting engine with configurable parameters
- **Frontend**: React components with Recharts for visualizations
- **Styling**: Tailwind CSS with dark mode support

### Data Structure
- **Assets**: Symbol, name, type (STOCK/CRYPTO), exchange
- **Price Data**: OHLCV data with timestamps
- **Strategies**: User-defined strategy parameters
- **Backtest Results**: Performance metrics and trade details

### API Integration
- Alpha Vantage for real market data
- Demo data generator for development/testing
- Support for both daily and weekly intervals

## Implementation History

### Phase 1: Project Setup
- Initialized Next.js 15 with TypeScript and Tailwind CSS
- Set up Prisma ORM with SQLite database
- Created database schema for assets, price data, strategies, and backtest results
- Installed dependencies: recharts, lucide-react, date-fns

### Phase 2: Core Architecture
- Built market data service with Alpha Vantage API integration
- Created strategy engine with backtesting algorithms
- Implemented database service for data persistence
- Set up API routes for asset management

### Phase 3: UI Components
- Created main StrategyTester component with form and results
- Built StrategyForm with dynamic asset selection
- Implemented ResultsDisplay with charts and metrics
- Added responsive design with dark mode support

### Phase 4: Historical Data Integration
- Created scripts for fetching real market data
- Built realistic data generator using geometric Brownian motion
- Populated database with 2,085 days of historical data (2020-2025)
- Added support for multiple data sources (Alpha Vantage, Yahoo Finance, CoinGecko)

### Phase 5: Data Population
Successfully generated realistic historical data for:
- **AAPL**: $100 → $172.70 (72.7% return)
- **MSFT**: $200 → $454.92 (127.5% return)
- **GOOGL**: $2000 → $1902.28 (-4.9% return)
- **TSLA**: $400 → $497.10 (24.3% return)
- **SPY**: $300 → $591.45 (97.2% return)
- **BTC**: $20000 → $110793.94 (454.0% return)
- **ETH**: $1000 → $2687.56 (168.8% return)

### Available NPM Scripts
```bash
npm run dev             # Start development server
npm run build           # Build for production
npm run generate-data   # Generate realistic historical data
npm run fetch-alpha     # Fetch real data from Alpha Vantage
npm run fetch-data      # Fetch from free APIs (Yahoo/CoinGecko)
npm run db:studio       # Open Prisma Studio
npm run db:reset        # Reset database
```

### Phase 6: Data Architecture Fix
- Fixed client-side database access issue in StrategyTester component
- Created `/api/historical-data` endpoint for server-side database queries
- Updated StrategyTester to use API route instead of direct Prisma access
- Ensured application correctly displays real historical data from database
- Eliminated fallback to random demo data during strategy testing

### Phase 7: Variable Analysis Period Enhancement
- Updated strategy engine to accept configurable analysis period instead of hardcoded 7-day period
- Added "Analysis Period (days)" input field to strategy form UI
- Modified StrategyEngine.backtest() and StrategyEngine.analyzeStrategy() methods to use variable analysisDays parameter
- Updated strategy summary text to dynamically display selected analysis period
- Enhanced user experience with flexible strategy testing for any number of analysis days (1-30)

### Phase 8: Threshold Range Enhancement
- Updated StrategyParameters interface to support threshold ranges (thresholdMin/thresholdMax) instead of single threshold value
- Modified strategy engine logic to match price changes within specified threshold ranges
- Replaced single threshold input with separate min/max threshold range inputs in strategy form UI
- Added validation to ensure minimum threshold is not greater than maximum threshold
- Updated strategy summary to display threshold ranges (e.g., "down between 4% and 6%")
- Enhanced strategy testing flexibility to capture broader market conditions within specified ranges

### Phase 9: Cryptocurrency Data Integration Fix
- Identified Prisma ORM conversion error when querying Cryptocurrency table ("Conversion failed: input contains invalid characters")
- Root cause: Prisma's type conversion was failing on datetime fields in Cryptocurrency/CryptocurrencyPrice tables
- Solution: Implemented raw SQL queries using Prisma's `$queryRaw` to bypass automatic type conversion
- Updated `database-service.ts` `getHistoricalData()` method to use raw SQL for cryptocurrency queries
- Updated `getAvailableSymbols()` method to gracefully handle Cryptocurrency table query errors with try-catch
- Cryptocurrency data now loads correctly from separate Cryptocurrency/CryptocurrencyPrice tables
- Maintained dual-table architecture: Asset/PriceData for stocks, Cryptocurrency/CryptocurrencyPrice for crypto

### Current Status
- ✅ Fully functional trading strategy backtesting application
- ✅ Real historical data spanning 5+ years (correctly displayed)
- ✅ Support for both stocks and cryptocurrencies with separate database tables
- ✅ Advanced backtesting metrics and visualizations
- ✅ Responsive UI with charts and detailed trade analysis
- ✅ Proper client-server data architecture using API routes
- ✅ Variable analysis period (configurable 1-30 days instead of fixed 7-day period)
- ✅ Threshold range support (test strategies within price change ranges instead of exact values)
- ✅ Cryptocurrency data fetched correctly from database using raw SQL queries