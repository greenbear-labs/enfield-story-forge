/**
 * Firestore paths, as plain strings so they're easy to test and reuse.
 *
 * workspaces/{workspaceId}
 * workspaces/{workspaceId}/entries/{entryId}
 * workspaces/{workspaceId}/bodies/{entryId}                     (EntryBody, same id as its entry)
 * workspaces/{workspaceId}/links/{linkId}
 * workspaces/{workspaceId}/entries/{entryId}/snapshots/{snapshotId}
 * workspaces/{workspaceId}/writingDays/{YYYY-MM-DD}              (words written that day)
 * workspaces/{workspaceId}/settings/writing                     (the daily goal)
 * workspaces/{workspaceId}/settings/welcome                     (the welcome tour, once dismissed)
 * workspaces/{workspaceId}/settings/backup                      (when the last backup was made)
 */

function seg(value: string, name: string): string {
  if (!value || value.includes('/')) {
    throw new Error(`Invalid ${name}: ${JSON.stringify(value)}`);
  }
  return value;
}

export const paths = {
  workspaces: () => 'workspaces',
  workspace: (workspaceId: string) => `workspaces/${seg(workspaceId, 'workspaceId')}`,

  entries: (workspaceId: string) => `${paths.workspace(workspaceId)}/entries`,
  entry: (workspaceId: string, entryId: string) =>
    `${paths.entries(workspaceId)}/${seg(entryId, 'entryId')}`,

  bodies: (workspaceId: string) => `${paths.workspace(workspaceId)}/bodies`,
  body: (workspaceId: string, entryId: string) =>
    `${paths.bodies(workspaceId)}/${seg(entryId, 'entryId')}`,

  links: (workspaceId: string) => `${paths.workspace(workspaceId)}/links`,
  link: (workspaceId: string, linkId: string) =>
    `${paths.links(workspaceId)}/${seg(linkId, 'linkId')}`,

  snapshots: (workspaceId: string, entryId: string) =>
    `${paths.entry(workspaceId, entryId)}/snapshots`,
  snapshot: (workspaceId: string, entryId: string, snapshotId: string) =>
    `${paths.snapshots(workspaceId, entryId)}/${seg(snapshotId, 'snapshotId')}`,

  writingDays: (workspaceId: string) => `${paths.workspace(workspaceId)}/writingDays`,
  writingDay: (workspaceId: string, date: string) =>
    `${paths.writingDays(workspaceId)}/${seg(date, 'date')}`,
  writingSettings: (workspaceId: string) => `${paths.workspace(workspaceId)}/settings/writing`,
  welcomeSettings: (workspaceId: string) => `${paths.workspace(workspaceId)}/settings/welcome`,
  backupSettings: (workspaceId: string) => `${paths.workspace(workspaceId)}/settings/backup`,
} as const;

/** Storage folder for an entry's images (see storage.rules). */
export const storagePaths = {
  entryImages: (workspaceId: string, entryId: string) =>
    `${paths.workspace(workspaceId)}/images/${seg(entryId, 'entryId')}`,
} as const;
