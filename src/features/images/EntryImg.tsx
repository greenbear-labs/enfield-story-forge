import type { Entry, EntryImage } from '../../data/types';
import { coverOf, useImageUrl } from '../../lib/entries/images';

/** One of an entry's images. Shows a quiet placeholder until it can load. */
export function EntryImg({
  image,
  className = '',
  alt,
}: {
  image: EntryImage;
  className?: string;
  alt?: string;
}) {
  const url = useImageUrl(image);
  if (!url) {
    return (
      <span
        className={`block bg-sunken ${className}`}
        role="img"
        aria-label={url === null ? 'Image unavailable' : 'Loading image'}
      />
    );
  }
  return (
    <img
      src={url}
      alt={alt ?? image.caption ?? ''}
      width={image.width}
      height={image.height}
      loading="lazy"
      decoding="async"
      className={`block bg-sunken ${className}`}
    />
  );
}

/** A card's cover image, edge to edge across the top of an `.entry-card`. Nothing if it has none. */
export function CardCover({ entry }: { entry: Entry }) {
  const cover = coverOf(entry);
  if (!cover) return null;
  return <EntryImg image={cover} alt="" className="card-cover" />;
}

/** A small round picture, for people. Nothing if the entry has no images. */
export function Avatar({ entry, size = 44 }: { entry: Entry; size?: number }) {
  const cover = coverOf(entry);
  if (!cover) return null;
  return (
    <span className="flex-none overflow-hidden rounded-full" style={{ width: size, height: size }}>
      <EntryImg image={cover} alt="" className="size-full object-cover object-top" />
    </span>
  );
}

/** A small square of the cover, for list rows. Nothing if the entry has no images. */
export function Thumb({ entry, size = 40 }: { entry: Entry; size?: number }) {
  const cover = coverOf(entry);
  if (!cover) return null;
  return (
    <span className="flex-none overflow-hidden rounded-md" style={{ width: size, height: size }}>
      <EntryImg image={cover} alt="" className="size-full object-cover" />
    </span>
  );
}
