const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parse/sync');

const prisma = new PrismaClient();

async function importCSVData(csvFilePath, symbol) {
  try {
    console.log(`Starting import for ${symbol} from ${csvFilePath}`);

    // First, create or get the asset
    let asset = await prisma.asset.findUnique({
      where: { symbol: symbol }
    });

    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          symbol: symbol,
          name: symbol,
          type: 'STOCK',
          exchange: 'NASDAQ'
        }
      });
      console.log(`Created asset: ${symbol}`);
    } else {
      console.log(`Asset ${symbol} already exists`);
    }

    // Read and parse CSV file - only first 5 records for testing
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    const allData = csv.parse(csvData, {
      columns: true,
      skip_empty_lines: true
    });

    // Test with just first 5 records
    const data = allData.slice(0, 5);
    console.log(`Testing with ${data.length} records from CSV`);

    let imported = 0;
    let skipped = 0;

    for (const record of data) {
      try {
        const date = new Date(record.Date);

        // Skip invalid dates
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date: ${record.Date}`);
          skipped++;
          continue;
        }

        const priceRecord = {
          assetId: asset.id,
          date: date,
          open: parseFloat(record.Open),
          high: parseFloat(record.High),
          low: parseFloat(record.Low),
          close: parseFloat(record.Close),
          volume: parseFloat(record.Volume)
        };

        console.log('Attempting to create:', priceRecord);

        const result = await prisma.priceData.create({
          data: priceRecord
        });

        imported++;
        console.log(`Successfully imported record ${imported}`);

      } catch (error) {
        console.error(`Error processing record: ${JSON.stringify(record)}, Error: ${error.message}`);
        skipped++;
      }
    }

    console.log(`Import completed for ${symbol}:`);
    console.log(`- Total records processed: ${data.length}`);
    console.log(`- Successfully imported: ${imported}`);
    console.log(`- Skipped: ${skipped}`);

    return { imported, skipped, total: data.length };

  } catch (error) {
    console.error(`Error importing CSV data: ${error.message}`);
    throw error;
  }
}

async function main() {
  try {
    const csvPath = process.argv[2];
    const symbol = process.argv[3];

    if (!csvPath || !symbol) {
      console.log('Usage: node import-csv-simple.js <csv-file-path> <symbol>');
      console.log('Example: node import-csv-simple.js ./public/stocks/A.csv A');
      process.exit(1);
    }

    if (!fs.existsSync(csvPath)) {
      console.error(`CSV file not found: ${csvPath}`);
      process.exit(1);
    }

    await importCSVData(csvPath, symbol);
    console.log('Import process completed successfully!');

  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { importCSVData };