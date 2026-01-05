/**
 * Pure TypeScript ZIP encoder
 * Windows-compatible ZIP file generation without external dependencies
 *
 * Implements ZIP format (PKZIP 2.0) with STORE method (no compression)
 * Compatible with Windows Explorer, macOS Archive Utility, and standard unzip tools
 */

interface ZipEntry {
  name: string;
  content: Uint8Array;
  modTime: Date;
}

/**
 * Calculate CRC-32 checksum
 */
function crc32(data: Uint8Array): number {
  // CRC-32 lookup table
  const table: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Convert Date to DOS timestamp format
 */
function dateToDos(date: Date): { time: number; date: number } {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  const year = date.getFullYear() - 1980;
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return {
    time: (hours << 11) | (minutes << 5) | seconds,
    date: (year << 9) | (month << 5) | day,
  };
}

/**
 * Write little-endian 16-bit integer
 */
function writeUint16LE(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >> 8) & 0xff]);
}

/**
 * Write little-endian 32-bit integer
 */
function writeUint32LE(value: number): Uint8Array {
  return new Uint8Array([
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >> 24) & 0xff,
  ]);
}

/**
 * Encode string to UTF-8 bytes
 */
function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Create a ZIP archive from multiple files
 */
export function createZip(
  files: Array<{ name: string; content: string | Uint8Array }>
): Uint8Array {
  const now = new Date();
  const entries: ZipEntry[] = files.map((file) => ({
    name: file.name,
    content:
      typeof file.content === 'string'
        ? encodeUtf8(file.content)
        : file.content,
    modTime: now,
  }));

  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const fileName = encodeUtf8(entry.name);
    const crc = crc32(entry.content);
    const dos = dateToDos(entry.modTime);

    // Local file header (30 bytes + filename + content)
    const localHeader = new Uint8Array([
      // Signature: PK\x03\x04
      0x50, 0x4b, 0x03, 0x04,
      // Version needed: 2.0
      0x14, 0x00,
      // General purpose bit flag (bit 11 = UTF-8 filenames)
      0x00, 0x08,
      // Compression method: STORE (0)
      0x00, 0x00,
      // Modification time
      ...writeUint16LE(dos.time),
      // Modification date
      ...writeUint16LE(dos.date),
      // CRC-32
      ...writeUint32LE(crc),
      // Compressed size
      ...writeUint32LE(entry.content.length),
      // Uncompressed size
      ...writeUint32LE(entry.content.length),
      // Filename length
      ...writeUint16LE(fileName.length),
      // Extra field length
      0x00, 0x00,
    ]);

    // Combine local header + filename + content
    const localEntry = new Uint8Array(
      localHeader.length + fileName.length + entry.content.length
    );
    localEntry.set(localHeader, 0);
    localEntry.set(fileName, localHeader.length);
    localEntry.set(entry.content, localHeader.length + fileName.length);
    localHeaders.push(localEntry);

    // Central directory header (46 bytes + filename)
    const centralHeader = new Uint8Array([
      // Signature: PK\x01\x02
      0x50, 0x4b, 0x01, 0x02,
      // Version made by: 2.0, Unix
      0x14, 0x03,
      // Version needed: 2.0
      0x14, 0x00,
      // General purpose bit flag (bit 11 = UTF-8 filenames)
      0x00, 0x08,
      // Compression method: STORE (0)
      0x00, 0x00,
      // Modification time
      ...writeUint16LE(dos.time),
      // Modification date
      ...writeUint16LE(dos.date),
      // CRC-32
      ...writeUint32LE(crc),
      // Compressed size
      ...writeUint32LE(entry.content.length),
      // Uncompressed size
      ...writeUint32LE(entry.content.length),
      // Filename length
      ...writeUint16LE(fileName.length),
      // Extra field length
      0x00, 0x00,
      // File comment length
      0x00, 0x00,
      // Disk number start
      0x00, 0x00,
      // Internal file attributes
      0x00, 0x00,
      // External file attributes (regular file)
      0x00, 0x00, 0xa4, 0x81,
      // Relative offset of local header
      ...writeUint32LE(localOffset),
    ]);

    const centralEntry = new Uint8Array(
      centralHeader.length + fileName.length
    );
    centralEntry.set(centralHeader, 0);
    centralEntry.set(fileName, centralHeader.length);
    centralHeaders.push(centralEntry);

    localOffset += localEntry.length;
  }

  // Calculate central directory size
  const centralSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);

  // End of central directory record (22 bytes)
  const endOfCentralDir = new Uint8Array([
    // Signature: PK\x05\x06
    0x50, 0x4b, 0x05, 0x06,
    // Disk number
    0x00, 0x00,
    // Disk with central directory
    0x00, 0x00,
    // Number of entries on this disk
    ...writeUint16LE(entries.length),
    // Total number of entries
    ...writeUint16LE(entries.length),
    // Size of central directory
    ...writeUint32LE(centralSize),
    // Offset of central directory
    ...writeUint32LE(localOffset),
    // Comment length
    0x00, 0x00,
  ]);

  // Combine all parts
  const totalSize =
    localOffset + centralSize + endOfCentralDir.length;
  const zipData = new Uint8Array(totalSize);

  let offset = 0;

  // Write local headers
  for (const local of localHeaders) {
    zipData.set(local, offset);
    offset += local.length;
  }

  // Write central directory
  for (const central of centralHeaders) {
    zipData.set(central, offset);
    offset += central.length;
  }

  // Write end of central directory
  zipData.set(endOfCentralDir, offset);

  return zipData;
}
