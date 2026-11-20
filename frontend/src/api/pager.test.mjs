import test from "node:test";
import assert from "node:assert/strict";
import { appendPage, mergeFirstPage, paginate } from "./pager.mjs";

const ids = (list) => list.map((d) => d.id);

test("refreshing the first page keeps older loaded pages", () => {
  const current = [{ id: 9 }, { id: 8 }, { id: 5 }, { id: 4 }];
  assert.deepEqual(ids(mergeFirstPage(current, [{ id: 10 }, { id: 9 }, { id: 7 }])), [10, 9, 7, 5, 4]);
});

test("items that left the first page window are dropped", () => {
  // 8 was claimed by someone else; it's newer than the page's oldest id, so it's gone.
  assert.deepEqual(ids(mergeFirstPage([{ id: 9 }, { id: 8 }, { id: 3 }], [{ id: 9 }, { id: 6 }])), [9, 6, 3]);
});

test("an empty first page empties the list", () => {
  assert.deepEqual(mergeFirstPage([{ id: 2 }], []), []);
});

test("appending skips duplicates", () => {
  assert.deepEqual(ids(appendPage([{ id: 5 }, { id: 4 }], [{ id: 4 }, { id: 3 }])), [5, 4, 3]);
});

test("paginate slices and counts pages", () => {
  const items = Array.from({ length: 13 }, (_, i) => i);
  assert.deepEqual(paginate(items, 3, 6), { items: [12], page: 3, pages: 3 });
  assert.deepEqual(paginate(items, 1, 6).items, [0, 1, 2, 3, 4, 5]);
});

test("paginate clamps out-of-range pages and handles empty lists", () => {
  assert.equal(paginate([1, 2], 9, 6).page, 1);
  assert.deepEqual(paginate([], 1, 6), { items: [], page: 1, pages: 1 });
});
