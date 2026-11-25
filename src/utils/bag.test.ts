import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addItemToBag,
  getBagCount,
  getBagSubtotal,
  removeBagItem,
  updateBagItemQuantity,
  type BagItem,
} from './bag';

const sampleInput = {
  printId: 0,
  title: 'Lemons on Gingham',
  artist: 'Tova Lindqvist',
  unitPrice: 60,
  paper: 'Art Paper',
  size: '11.7 × 16.5" (A3)',
  signature: 'Unsigned',
  frame: 'Unframed',
  quantity: 2,
  now: 1000,
};

test('addItemToBag adds new item and merges matching option combinations', () => {
  const first = addItemToBag([], sampleInput);
  assert.equal(first.items.length, 1);
  assert.equal(first.isNewLine, true);
  assert.equal(getBagCount(first.items), 2);
  assert.equal(getBagSubtotal(first.items), 120);

  const second = addItemToBag(first.items, { ...sampleInput, quantity: 1 });
  assert.equal(second.items.length, 1);
  assert.equal(second.isNewLine, false);
  assert.equal(getBagCount(second.items), 3);
  assert.equal(getBagSubtotal(second.items), 180);

  const differentSize = addItemToBag(second.items, {
    ...sampleInput,
    size: '16.5 × 23.4" (A2)',
    quantity: 1,
  });
  assert.equal(differentSize.items.length, 2);
  assert.equal(getBagCount(differentSize.items), 4);
});

test('updateBagItemQuantity increments, decrements, and removes at zero', () => {
  const { items, addedKey } = addItemToBag([], sampleInput);
  const incremented = updateBagItemQuantity(items, addedKey, 1);
  assert.equal(incremented[0].quantity, 3);

  const decremented = updateBagItemQuantity(incremented, addedKey, -3);
  assert.equal(decremented.length, 0);
});

test('removeBagItem removes targeted item only', () => {
  const first = addItemToBag([], sampleInput);
  const second = addItemToBag(first.items, {
    ...sampleInput,
    printId: 1,
    title: 'Oranges & Stripe',
    quantity: 1,
  });

  const remaining: BagItem[] = removeBagItem(second.items, first.addedKey);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].printId, 1);
});
