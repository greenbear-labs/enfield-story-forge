/**
 * A minimal ZIP reader, enough to open a DOCX: it finds a file by name in the
 * central directory and inflates it with the browser's DecompressionStream.
 */

const decoder = new TextDecoder();

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(data as BufferSource);
      controller.close();
    },
  }).pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The file's bytes, or null if the zip doesn't have it. Throws if it isn't a zip. */
export async function readZipFile(zip: Uint8Array, name: string): Promise<Uint8Array | null> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  // The end-of-central-directory record is in the last 64 KB (after an optional comment).
  let end = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end === -1) throw new Error('Not a zip file');
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  for (let n = 0; n < count; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error('Damaged zip file');
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const fileName = decoder.decode(zip.subarray(at + 46, at + 46 + nameLength));
    if (fileName === name) {
      const start =
        local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const data = zip.subarray(start, start + size);
      if (method === 0) return data;
      if (method === 8) return inflate(data);
      throw new Error('Unsupported zip compression');
    }
    at += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}
