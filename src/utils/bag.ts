export interface BagItem {
  key: string;
  printId: number;
  title: string;
  artist: string;
  unitPrice: number;
  paper: string;
  size: string;
  signature: string;
  frame: string;
  quantity: number;
  addedAt: number;
}

export interface AddBagInput {
  printId: number;
  title: string;
  artist: string;
  unitPrice: number;
  paper: string;
  size: string;
  signature: string;
  frame: string;
  quantity: number;
  now?: number;
}

export function makeBagKey(input: {
  printId: number;
  paper: string;
  size: string;
  signature: string;
  frame: string;
}): string {
  return `${input.printId}__${input.paper}__${input.size}__${input.signature}__${input.frame}`;
}

export function addItemToBag(
  items: readonly BagItem[],
  input: AddBagInput,
): { items: BagItem[]; addedKey: string; isNewLine: boolean } {
  const qty = Math.max(1, Math.min(9, Math.round(input.quantity)));
  const key = makeBagKey(input);
  const existing = items.find((item) => item.key === key);

  if (existing) {
    return {
      items: items.map((item) =>
        item.key === key
          ? { ...item, quantity: Math.min(99, item.quantity + qty) }
          : item,
      ),
      addedKey: key,
      isNewLine: false,
    };
  }

  const nextItem: BagItem = {
    key,
    printId: input.printId,
    title: input.title,
    artist: input.artist,
    unitPrice: input.unitPrice,
    paper: input.paper,
    size: input.size,
    signature: input.signature,
    frame: input.frame,
    quantity: qty,
    addedAt: input.now ?? Date.now(),
  };

  return {
    items: [...items, nextItem],
    addedKey: key,
    isNewLine: true,
  };
}

export function updateBagItemQuantity(
  items: readonly BagItem[],
  key: string,
  delta: number,
): BagItem[] {
  return items
    .map((item) => {
      if (item.key !== key) return item;
      const nextQty = item.quantity + delta;
      if (nextQty <= 0) return null;
      return { ...item, quantity: Math.min(99, nextQty) };
    })
    .filter((item): item is BagItem => item !== null);
}

export function removeBagItem(
  items: readonly BagItem[],
  key: string,
): BagItem[] {
  return items.filter((item) => item.key !== key);
}

export function getBagCount(items: readonly BagItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getBagSubtotal(items: readonly BagItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}
