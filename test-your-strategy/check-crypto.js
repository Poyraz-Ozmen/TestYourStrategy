const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCrypto() {
  const cryptos = await prisma.cryptocurrency.findMany();
  console.log('Cryptocurrencies in DB:', cryptos.map(c => c.symbol).join(', '));

  if (cryptos.length > 0) {
    const firstCrypto = cryptos[0];
    const priceCount = await prisma.cryptocurrencyPrice.count({
      where: { cryptocurrencyId: firstCrypto.id }
    });
    console.log(`\n${firstCrypto.symbol} has ${priceCount} price records`);
  }

  await prisma.$disconnect();
}

checkCrypto();
