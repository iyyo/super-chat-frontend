interface ZipTextEntry {
  name: string
  content: string
}

const encoder = new TextEncoder()
const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  }
  return crc >>> 0
})

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function write16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true)
}

function write32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true)
}

function dosTimestamp(date: Date): { date: number; time: number } {
  const year = Math.max(1980, date.getFullYear()) - 1980
  return {
    date: (year << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  }
}

function join(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const output = new Uint8Array(new ArrayBuffer(parts.reduce((size, part) => size + part.length, 0)))
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

export function createStoredZip(entries: ZipTextEntry[]): Blob {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  const { date, time } = dosTimestamp(new Date())
  let localOffset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const data = encoder.encode(entry.content)
    const checksum = crc32(data)
    const local = new Uint8Array(30 + name.length + data.length)
    const localView = new DataView(local.buffer)
    write32(localView, 0, 0x04034b50)
    write16(localView, 4, 20)
    write16(localView, 6, 0x0800)
    write16(localView, 8, 0)
    write16(localView, 10, time)
    write16(localView, 12, date)
    write32(localView, 14, checksum)
    write32(localView, 18, data.length)
    write32(localView, 22, data.length)
    write16(localView, 26, name.length)
    write16(localView, 28, 0)
    local.set(name, 30)
    local.set(data, 30 + name.length)
    localParts.push(local)

    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    write32(centralView, 0, 0x02014b50)
    write16(centralView, 4, 20)
    write16(centralView, 6, 20)
    write16(centralView, 8, 0x0800)
    write16(centralView, 10, 0)
    write16(centralView, 12, time)
    write16(centralView, 14, date)
    write32(centralView, 16, checksum)
    write32(centralView, 20, data.length)
    write32(centralView, 24, data.length)
    write16(centralView, 28, name.length)
    write32(centralView, 42, localOffset)
    central.set(name, 46)
    centralParts.push(central)
    localOffset += local.length
  }

  const centralDirectory = join(centralParts)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  write32(endView, 0, 0x06054b50)
  write16(endView, 8, entries.length)
  write16(endView, 10, entries.length)
  write32(endView, 12, centralDirectory.length)
  write32(endView, 16, localOffset)
  return new Blob([join([...localParts, centralDirectory, end])], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}
