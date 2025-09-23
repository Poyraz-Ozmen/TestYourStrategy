const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { importCSVData } = require('./import-csv-data');

const prisma = new PrismaClient();

async function importAllStocks() {
  try {
    console.log('Starting batch import of all stock CSV files...');

    const stocksDir = './public/stocks';
    const files = fs.readdirSync(stocksDir);

    // Filter CSV files and exclude A.csv since it's already imported
    const csvFiles = files.filter(file =>
      file.endsWith('.csv') && file !== 'A.csv'
    );

    console.log(`Found ${csvFiles.length} CSV files to import (excluding A.csv)`);

    let totalImported = 0;
    let totalSkipped = 0;
    let totalProcessed = 0;
    let successfulFiles = 0;
    let failedFiles = 0;

    for (let i = 0; i < csvFiles.length; i++) {
      const file = csvFiles[i];
      const symbol = path.basename(file, '.csv');
      const filePath = path.join(stocksDir, file);

      console.log(`\n[${i + 1}/${csvFiles.length}] Processing ${symbol}...`);

      try {
        const result = await importCSVData(filePath, symbol);
        totalImported += result.imported;
        totalSkipped += result.skipped;
        totalProcessed += result.total;
        successfulFiles++;

        console.log(`✅ ${symbol}: ${result.imported} imported, ${result.skipped} skipped`);

        // Add a small delay to prevent overwhelming the database
        if (i % 10 === 0 && i > 0) {
          console.log(`Processed ${i} files, taking a short break...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Failed to import ${symbol}: ${error.message}`);
        failedFiles++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('BATCH IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total files processed: ${csvFiles.length}`);
    console.log(`Successful imports: ${successfulFiles}`);
    console.log(`Failed imports: ${failedFiles}`);
    console.log(`Total records imported: ${totalImported.toLocaleString()}`);
    console.log(`Total records skipped: ${totalSkipped.toLocaleString()}`);
    console.log(`Total records processed: ${totalProcessed.toLocaleString()}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Batch import failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await importAllStocks();
    console.log('Batch import process completed!');
  } catch (error) {
    console.error('Batch import process failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { importAllStocks };