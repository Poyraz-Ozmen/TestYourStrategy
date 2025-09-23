const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
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
          name: symbol, // We can update this later with full company names
          type: 'STOCK',
          exchange: 'NASDAQ' // Default, can be updated later
        }
      });
      console.log(`Created asset: ${symbol}`);
    } else {
      console.log(`Asset ${symbol} already exists`);
    }

    // Read and parse CSV file
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    const data = csv.parse(csvData, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`Parsed ${data.length} records from CSV`);

    // Process records in batches to avoid memory issues
    const batchSize = 100;
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const priceDataBatch = [];

      for (const record of batch) {
        try {
          const date = new Date(record.Date);

          // Skip invalid dates
          if (isNaN(date.getTime())) {
            console.warn(`Invalid date: ${record.Date}`);
            skipped++;
            continue;
          }

          priceDataBatch.push({
            assetId: asset.id,
            date: date,
            open: parseFloat(record.Open),
            high: parseFloat(record.High),
            low: parseFloat(record.Low),
            close: parseFloat(record.Close),
            volume: parseFloat(record.Volume)
          });
        } catch (error) {
          console.warn(`Error processing record: ${JSON.stringify(record)}, Error: ${error.message}`);
          skipped++;
        }
      }

      // Insert records individually with duplicate checking
      if (priceDataBatch.length > 0) {
        let batchImported = 0;
        for (const priceRecord of priceDataBatch) {
          try {
            // Check if record already exists (unique constraint on assetId + date)
            const existing = await prisma.priceData.findUnique({
              where: {
                assetId_date: {
                  assetId: priceRecord.assetId,
                  date: priceRecord.date
                }
              }
            });

            if (!existing) {
              await prisma.priceData.create({
                data: priceRecord
              });
              batchImported++;
            }
          } catch (error) {
            console.warn(`Error creating individual record: ${error.message}`);
          }
        }
        imported += batchImported;
        console.log(`Imported batch ${Math.floor(i/batchSize) + 1}: ${batchImported} records`);
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
      console.log('Usage: node import-csv-data.js <csv-file-path> <symbol>');
      console.log('Example: node import-csv-data.js ./public/stocks/A.csv A');
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