import { describe, expect, it } from 'vitest';
import { crc32, zipBytes } from './zip';

describe('zip', () => {
  it('computes CRC-32', () => {
    expect(crc32(new TextEncoder().encode('hello'))).toBe(0x3610a686);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it('writes stored entries in order, with a central directory', () => {
    const bytes = zipBytes([
      { name: 'mimetype', data: 'application/epub+zip' },
      { name: 'a/b.txt', data: 'hi' },
    ]);
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(new TextDecoder().decode(bytes.slice(30, 38))).toBe('mimetype');
    expect(new TextDecoder().decode(bytes.slice(38, 58))).toBe('application/epub+zip');
    const end = bytes.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
  });
});
