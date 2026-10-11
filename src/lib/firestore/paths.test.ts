import { describe, expect, it } from 'vitest';
import { paths, storagePaths } from './paths';

describe('paths', () => {
  it('builds workspace and entry paths', () => {
    expect(paths.workspace('u1')).toBe('workspaces/u1');
    expect(paths.entries('u1')).toBe('workspaces/u1/entries');
    expect(paths.entry('u1', 'e1')).toBe('workspaces/u1/entries/e1');
  });

  it('builds body, link and snapshot paths', () => {
    expect(paths.body('u1', 'e1')).toBe('workspaces/u1/bodies/e1');
    expect(paths.link('u1', 'l1')).toBe('workspaces/u1/links/l1');
    expect(paths.snapshot('u1', 'e1', 's1')).toBe('workspaces/u1/entries/e1/snapshots/s1');
  });

  it('builds storage paths inside the workspace', () => {
    expect(storagePaths.entryImages('u1', 'e1')).toBe('workspaces/u1/images/e1');
  });

  it('rejects empty ids and ids with slashes', () => {
    expect(() => paths.workspace('')).toThrow(/workspaceId/);
    expect(() => paths.entry('u1', 'a/b')).toThrow(/entryId/);
  });
});
