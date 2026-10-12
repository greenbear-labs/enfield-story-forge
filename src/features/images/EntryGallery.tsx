import { useEffect, useId, useRef, useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Icon } from '../../components/ui/Icon';
import { toast } from '../../components/ui/toast';
import type { Entry, EntryImage } from '../../data/types';
import {
  addEntryImage,
  ImageError,
  imagesOf,
  isCover,
  removeEntryImage,
  setCoverImage,
  setImageCaption,
  useImageUrl,
} from '../../lib/entries/images';
import { useAutosaved } from '../../lib/entries/useAutosaved';
import { useAuthStore } from '../auth/authStore';
import { EntryImg } from './EntryImg';

interface Upload {
  key: string;
  preview: string;
}

/**
 * An entry's images: add them (pick or drop files), open one to caption it,
 * make it the cover, or remove it. The first image is the cover until another is picked.
 */
export function EntryGallery({ entry, label = 'Images' }: { entry: Entry; label?: string }) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const inputId = useId();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const images = imagesOf(entry);
  const open = images.find((i) => i.id === openId);

  // Previews are object URLs; let them go if the page closes mid-upload.
  const live = useRef(uploads);
  useEffect(() => {
    live.current = uploads;
  }, [uploads]);
  useEffect(() => () => live.current.forEach((u) => URL.revokeObjectURL(u.preview)), []);

  const addFiles = (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const upload = { key: crypto.randomUUID(), preview: URL.createObjectURL(file) };
      setUploads((u) => [...u, upload]);
      addEntryImage(ws, entry.id, file)
        .catch((err: unknown) => {
          if (!(err instanceof ImageError)) console.error('Could not upload the image', err);
          toast(
            err instanceof ImageError
              ? err.message
              : 'Couldn’t upload the image. Check your connection and try again.',
          );
        })
        .finally(() => {
          URL.revokeObjectURL(upload.preview);
          setUploads((u) => u.filter((x) => x.key !== upload.key));
        });
    }
  };

  return (
    <div
      className="flex flex-col gap-1.5"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <span className="label">{label}</span>
      <div className={`image-grid ${dragging ? 'is-dragging' : ''}`}>
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            className="image-tile"
            aria-label={`Open image${image.caption ? `: ${image.caption}` : ''}`}
            onClick={() => setOpenId(image.id)}
          >
            <EntryImg image={image} className="size-full object-cover" />
            {isCover(entry, image) && images.length > 1 && (
              <span className="image-badge">Cover</span>
            )}
          </button>
        ))}
        {uploads.map((u) => (
          <span key={u.key} className="image-tile is-uploading" aria-label="Uploading image">
            <img src={u.preview} alt="" className="size-full object-cover" />
            <span className="image-badge">Uploading…</span>
          </span>
        ))}
        <label htmlFor={inputId} className="image-tile image-add">
          <Icon name="image" />
          <span>{images.length || uploads.length ? 'Add more' : 'Add an image'}</span>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {open && (
        <ImageDialog
          key={open.id}
          entry={entry}
          image={open}
          onClose={() => setOpenId(null)}
          onRemove={() => {
            setOpenId(null);
            const undo = removeEntryImage(ws, entry, open);
            toast('Image removed.', { action: { label: 'Undo', onClick: undo } });
          }}
        />
      )}
    </div>
  );
}

function ImageDialog({
  entry,
  image,
  onClose,
  onRemove,
}: {
  entry: Entry;
  image: EntryImage;
  onClose: () => void;
  onRemove: () => void;
}) {
  const ws = useAuthStore((s) => s.workspaceId)!;
  const url = useImageUrl(image);
  const caption = useAutosaved(image.caption ?? '', (v) => setImageCaption(ws, entry, image.id, v));
  const cover = isCover(entry, image);
  const close = () => {
    caption.flush();
    onClose();
  };

  return (
    <Dialog title="Image" onClose={close} wide>
      <EntryImg
        image={image}
        className="max-h-[60vh] w-full rounded-md object-contain"
        alt={image.caption ?? ''}
      />
      <div className="flex flex-wrap items-center gap-2">
        {url && (
          // Focused first, so a phone keyboard doesn't open over the picture.
          <a className="btn" href={url} target="_blank" rel="noreferrer" data-autofocus>
            Full size
          </a>
        )}
        {cover ? (
          <span className="chip">
            <Icon name="check" size={14} />
            The cover
          </span>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={() => setCoverImage(ws, entry.id, image.id)}
          >
            Make it the cover
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost ml-auto"
          onClick={() => {
            caption.flush();
            onRemove();
          }}
        >
          <Icon name="trash" size={16} />
          Remove
        </button>
      </div>
      <label className="flex flex-col gap-1">
        <span className="label">Caption</span>
        <input className="txt" placeholder="What is this?" {...caption.props} />
      </label>
    </Dialog>
  );
}
