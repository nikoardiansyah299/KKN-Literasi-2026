import test from 'node:test';
import assert from 'node:assert/strict';
import { getCatalogBooks } from './data.ts';

test('getCatalogBooks returns fallback items when Prisma queries fail', async () => {
  const failingPrisma = {
    book: {
      findMany: async () => {
        throw new Error('db unreachable');
      },
      count: async () => {
        throw new Error('db unreachable');
      },
    },
  } as any;

  const result = await getCatalogBooks({ start: 0, end: 999, page: 1, pageSize: 12 }, failingPrisma);

  assert.equal(result.items.length, 3);
  assert.equal(result.total, 3);
  assert.equal(result.items[0].title, 'The Knowledge Atlas');
});
