import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type DocumentSnapshot,
  type Query,
  type QueryConstraint,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import type { Entry, EntryBody, EntryType, Link, LinkKind, Snapshot } from '../../data/types';
import { useAuthStore } from '../../features/auth/authStore';
import { getFirebase } from '../firebase/client';
import { paths } from '../firestore/paths';

/** Live data from a Firestore listener. `data` is undefined until the first result. */
export interface Live<T> {
  data: T | undefined;
  error: Error | undefined;
}

// Pending server timestamps read as a local estimate instead of null.
const toEntry = (snap: DocumentSnapshot): Entry =>
  ({ ...snap.data({ serverTimestamps: 'estimate' }), id: snap.id }) as Entry;

/**
 * Subscribes while `key` is set and stays the same. Results are stored with
 * the key they belong to, so a new key reads as loading until its data comes.
 */
export function useListener<T>(
  key: string | null,
  subscribe: (onData: (data: T) => void, onError: (err: Error) => void) => () => void,
): Live<T> {
  const [state, setState] = useState<{ key: string | null; data?: T; error?: Error }>({
    key: null,
  });

  useEffect(() => {
    if (!key) return;
    return subscribe(
      (data) => setState({ key, data }),
      (error) => {
        console.error('Live data failed', error);
        setState({ key, error });
      },
    );
    // `subscribe` is rebuilt every render; the key captures everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state.key === key && key
    ? { data: state.data, error: state.error }
    : { data: undefined, error: undefined };
}

function useQueryListener<T>(
  key: string | null,
  build: () => Query,
  map: (snap: DocumentSnapshot) => T,
): Live<T[]> {
  return useListener<T[]>(key, (onData, onError) =>
    onSnapshot(build(), (snap) => onData(snap.docs.map(map)), onError),
  );
}

const useWorkspaceId = () => useAuthStore((s) => s.workspaceId);

/** Entries that aren't in the trash, optionally of one type. Unsorted. */
export function useEntries(type?: EntryType): Live<Entry[]> {
  const ws = useWorkspaceId();
  return useQueryListener(
    ws ? `entries:${ws}:${type ?? '*'}` : null,
    () => {
      const constraints: QueryConstraint[] = [where('deletedAt', '==', null)];
      if (type) constraints.unshift(where('type', '==', type));
      return query(collection(getFirebase().db, paths.entries(ws!)), ...constraints);
    },
    toEntry,
  );
}

/**
 * One entry, including when it's in the trash. `data` is null if it doesn't
 * exist. Pass null for no entry (it stays loading).
 */
export function useEntry(entryId: string | null): Live<Entry | null> {
  const ws = useWorkspaceId();
  return useListener<Entry | null>(
    ws && entryId ? `entry:${ws}:${entryId}` : null,
    (onData, onError) =>
      onSnapshot(
        doc(getFirebase().db, paths.entry(ws!, entryId!)),
        (snap) => onData(snap.exists() ? toEntry(snap) : null),
        onError,
      ),
  );
}

/** An entry's rich text body. `data` is null if nothing has been written yet. */
export function useBody(entryId: string | null): Live<EntryBody | null> {
  const ws = useWorkspaceId();
  return useListener<EntryBody | null>(
    ws && entryId ? `body:${ws}:${entryId}` : null,
    (onData, onError) =>
      onSnapshot(
        doc(getFirebase().db, paths.body(ws!, entryId!)),
        (snap) => onData(snap.exists() ? (snap.data() as EntryBody) : null),
        onError,
      ),
  );
}

/** Every rich text body in the workspace, by entry id. For compiling a whole book. */
export function useBodies(): Live<Map<string, unknown>> {
  const ws = useWorkspaceId();
  const live = useQueryListener<EntryBody>(
    ws ? `bodies:${ws}` : null,
    () => query(collection(getFirebase().db, paths.bodies(ws!))),
    // A body's id is its entry's id.
    (snap) => ({ ...(snap.data() as EntryBody), entryId: snap.id }),
  );
  const data = useMemo(
    () => live.data && new Map(live.data.map((b) => [b.entryId, b.doc as unknown])),
    [live.data],
  );
  return { data, error: live.error };
}

/** An entry's snapshots, newest first. */
export function useSnapshots(entryId: string | null): Live<Snapshot[]> {
  const ws = useWorkspaceId();
  const live = useQueryListener<Snapshot>(
    ws && entryId ? `snapshots:${ws}:${entryId}` : null,
    () => query(collection(getFirebase().db, paths.snapshots(ws!, entryId!))),
    (snap) => ({ ...snap.data({ serverTimestamps: 'estimate' }), id: snap.id }) as Snapshot,
  );
  const { data, error } = live;
  return useMemo(
    () => ({
      error,
      data: data && [...data].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()),
    }),
    [data, error],
  );
}

export interface LinkFilter {
  kind?: LinkKind;
  fromId?: string;
  toId?: string;
}

/** Links matching every given filter. With only `toId`, these are an entry's backlinks. */
export function useLinks(filter: LinkFilter): Live<Link[]> {
  const ws = useWorkspaceId();
  const { kind, fromId, toId } = filter;
  return useQueryListener(
    ws ? `links:${ws}:${kind ?? '*'}:${fromId ?? '*'}:${toId ?? '*'}` : null,
    () => {
      const constraints: QueryConstraint[] = [];
      if (kind) constraints.push(where('kind', '==', kind));
      if (fromId) constraints.push(where('fromId', '==', fromId));
      if (toId) constraints.push(where('toId', '==', toId));
      return query(collection(getFirebase().db, paths.links(ws!)), ...constraints);
    },
    (snap) => ({ ...snap.data(), id: snap.id }) as Link,
  );
}

/** Entries by id, for joining links to the entries they point at. */
export function useEntryMap(entries: Entry[] | undefined): Map<string, Entry> {
  return useMemo(() => new Map((entries ?? []).map((e) => [e.id, e])), [entries]);
}
