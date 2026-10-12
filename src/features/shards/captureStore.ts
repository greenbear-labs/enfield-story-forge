import { create } from 'zustand';
import type { ShardType } from './shardModel';

interface CaptureState {
  open: boolean;
  /** Text and type to start from, e.g. from a Spark Prompt. */
  initial?: { text?: string; shardType?: ShardType };
}

export const useCaptureStore = create<CaptureState>(() => ({ open: false }));

/** Opens the quick shard capture dialog from anywhere. */
export function openCapture(initial?: CaptureState['initial']): void {
  useCaptureStore.setState({ open: true, initial });
}

export function closeCapture(): void {
  useCaptureStore.setState({ open: false, initial: undefined });
}
