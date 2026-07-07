const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/server');
const db = require('../src/db');

test('catalog still returns books when availability queries fail', async () => {
  const originalQueryRawUnsafe = db.prisma.$queryRawUnsafe;
  const originalExecuteRawUnsafe = db.prisma.$executeRawUnsafe;

  db.prisma.$queryRawUnsafe = async (queryText, ...params) => {
    const sql = String(queryText);
    if (sql.includes('FROM loans') || sql.includes('FROM reservations')) {
      throw new Error('availability lookup failed');
    }

    return originalQueryRawUnsafe.call(db.prisma, queryText, ...params);
  };

  db.prisma.$executeRawUnsafe = async (queryText, ...params) => {
    return originalExecuteRawUnsafe.call(db.prisma, queryText, ...params);
  };

  const server = app.listen(0);

  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/catalog?start=0&end=999`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(payload.items), 'catalog should include an items array');
    assert.ok(payload.items.length > 0, 'catalog should still return books when availability fails');
    assert.ok(payload.items.every((item) => item.availability), 'each book should still have availability data');
  } finally {
    db.prisma.$queryRawUnsafe = originalQueryRawUnsafe;
    db.prisma.$executeRawUnsafe = originalExecuteRawUnsafe;
    await new Promise((resolve) => server.close(resolve));
  }
});
