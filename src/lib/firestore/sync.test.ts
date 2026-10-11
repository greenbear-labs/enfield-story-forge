import { describe, expect, it } from 'vitest';
import { selectSyncState } from './sync';

describe('selectSyncState', () => {
  it('reports offline first, then pending writes, then synced', () => {
    expect(selectSyncState({ online: false, pending: 2 })).toBe('offline');
    expect(selectSyncState({ online: true, pending: 1 })).toBe('saving');
    expect(selectSyncState({ online: true, pending: 0 })).toBe('synced');
  });
});
