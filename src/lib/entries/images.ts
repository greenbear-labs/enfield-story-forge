import { arrayUnion, deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Entry, EntryImage } from '../../data/types';
import { getFirebase, loadImageStorage } from '../firebase/client';
import { paths, storagePaths } from '../firestore/paths';
import { fireAndTrack } from './entries';

/** Images are scaled down so their longest side is at most this many pixels. */
export const MAX_IMAGE_SIDE = 1600;
/** storage.rules refuses anything at or over 10 MB. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** How long a removed image can be brought back before its file is deleted. */
const UNDO_MS = 8000;

/** A problem worth telling the writer about, in words they can act on. */
export class ImageError extends Error {}

export const imagesOf = (entry: Entry): EntryImage[] => entry.images ?? [];

/** The cover: the one picked, or else the first image. */
export function coverOf(entry: Entry): EntryImage | undefined {
  const images = imagesOf(entry);
  return images.find((i) => i.id === entry.coverImageId) ?? images[0];
}

export function isCover(entry: Entry, image: EntryImage): boolean {
  return coverOf(entry)?.id === image.id;
}

/** The size an image is scaled to so it fits within `max` on its longest side. */
export function fitWithin(width: number, height: number, max = MAX_IMAGE_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/** Scales an image down and re-encodes it (WebP, or JPEG where WebP can't be made). */
async function compress(file: File) {
  if (!file.type.startsWith('image/')) throw new ImageError('That file isn’t an image.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageError('This image can’t be opened here. Try a JPEG or PNG.');
  }
  const size = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageError('This browser can’t prepare images for upload.');
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const webp = await toBlob(canvas, 'image/webp', 0.82);
  // Browsers that can't encode WebP hand back a PNG instead.
  const blob = webp?.type === 'image/webp' ? webp : await toBlob(canvas, 'image/jpeg', 0.85);
  if (!blob) throw new ImageError('This image couldn’t be prepared for upload.');
  if (blob.size >= MAX_UPLOAD_BYTES) throw new ImageError('That image is too large.');
  return { blob, ...size };
}

const newImageId = () => crypto.randomUUID().replaceAll('-', '').slice(0, 20);

function writeImages(
  workspaceId: string,
  entryId: string,
  data: Record<string, unknown>,
  what: string,
): void {
  const { db } = getFirebase();
  fireAndTrack(
    updateDoc(doc(db, paths.entry(workspaceId, entryId)), {
      ...data,
      updatedAt: serverTimestamp(),
    }),
    what,
  );
}

/**
 * Compresses an image, uploads it, and adds it to the entry. Unlike other
 * writes this waits, because Storage needs a connection.
 */
export async function addEntryImage(
  workspaceId: string,
  entryId: string,
  file: File,
): Promise<EntryImage> {
  if (!navigator.onLine) {
    throw new ImageError('Adding images needs a connection. Try again once you’re online.');
  }
  const { blob, width, height } = await compress(file);
  const id = newImageId();
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = `${storagePaths.entryImages(workspaceId, entryId)}/${id}.${ext}`;
  const { storage, lib } = await loadImageStorage();
  const fileRef = lib.ref(storage, storagePath);
  // Each upload gets a new path, so browsers can keep it for good.
  await lib.uploadBytes(fileRef, blob, {
    contentType: blob.type,
    cacheControl: 'private, max-age=31536000, immutable',
  });
  const url = await lib.getDownloadURL(fileRef);
  const image: EntryImage = { id, storagePath, url, width, height };
  // arrayUnion, so several uploads finishing together don't overwrite each other.
  writeImages(workspaceId, entryId, { images: arrayUnion(image) }, 'add the image');
  return image;
}

/** Changes one image's caption. An empty caption removes it. */
export function setImageCaption(
  workspaceId: string,
  entry: Entry,
  imageId: string,
  caption: string,
): void {
  const images = imagesOf(entry).map((image) => {
    if (image.id !== imageId) return image;
    const next: EntryImage = { ...image, caption: caption.trim() };
    if (!next.caption) delete next.caption;
    return next;
  });
  writeImages(workspaceId, entry.id, { images }, 'save the caption');
}

export function setCoverImage(workspaceId: string, entryId: string, imageId: string): void {
  writeImages(workspaceId, entryId, { coverImageId: imageId }, 'set the cover');
}

/**
 * Takes an image off an entry and returns an undo. The file itself is deleted
 * once the chance to undo has passed.
 */
export function removeEntryImage(workspaceId: string, entry: Entry, image: EntryImage): () => void {
  const before = imagesOf(entry);
  const coverBefore = entry.coverImageId;
  writeImages(
    workspaceId,
    entry.id,
    {
      images: before.filter((i) => i.id !== image.id),
      ...(coverBefore === image.id ? { coverImageId: deleteField() } : {}),
    },
    'remove the image',
  );
  const timer = setTimeout(() => {
    loadImageStorage()
      .then(({ storage, lib }) => lib.deleteObject(lib.ref(storage, image.storagePath)))
      .catch((err: unknown) => console.error('Could not delete the image file', err));
  }, UNDO_MS);
  return () => {
    clearTimeout(timer);
    writeImages(
      workspaceId,
      entry.id,
      { images: before, ...(coverBefore ? { coverImageId: coverBefore } : {}) },
      'put the image back',
    );
  };
}

const urlCache = new Map<string, Promise<string>>();

function lookUpUrl(storagePath: string): Promise<string> {
  let url = urlCache.get(storagePath);
  if (!url) {
    url = loadImageStorage().then(({ storage, lib }) =>
      lib.getDownloadURL(lib.ref(storage, storagePath)),
    );
    url.catch(() => urlCache.delete(storagePath));
    urlCache.set(storagePath, url);
  }
  return url;
}

/**
 * Where to load an image from: its saved URL, or one asked of Storage.
 * Undefined while asking; null if Storage couldn't give one.
 */
export function useImageUrl(image: EntryImage | undefined): string | null | undefined {
  const path = image?.url ? undefined : image?.storagePath;
  const [found, setFound] = useState<{ path: string; url: string | null }>();
  useEffect(() => {
    if (!path) return;
    let live = true;
    lookUpUrl(path).then(
      (url) => live && setFound({ path, url }),
      () => live && setFound({ path, url: null }),
    );
    return () => {
      live = false;
    };
  }, [path]);
  if (!image) return undefined;
  if (image.url) return image.url;
  return found && found.path === path ? found.url : undefined;
}
