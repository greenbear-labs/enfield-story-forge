import { create } from 'zustand';

interface MineCart {
  shardIds: string[];
}

/** The shards picked in the Shard Mines. Kept while you move around the app. */
export const useMineCart = create<MineCart>(() => ({ shardIds: [] }));

export function addToCart(shardId: string): void {
  useMineCart.setState((s) =>
    s.shardIds.includes(shardId) ? s : { shardIds: [...s.shardIds, shardId] },
  );
}

export function removeFromCart(shardId: string): void {
  useMineCart.setState((s) => ({ shardIds: s.shardIds.filter((id) => id !== shardId) }));
}

export function clearCart(): void {
  useMineCart.setState({ shardIds: [] });
}
