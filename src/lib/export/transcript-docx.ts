import { segmentPlainText, type EditableSegment } from '@/lib/file-editor'
import { formatMs } from '@/lib/parse-transcript'
import { createStoredZip } from '@/lib/export/zip-store'

export interface TranscriptDocxInput {
  title: string
  fileDate: string
  duration: string
  segments: EditableSegment[]
  fallbackText: string | null
}

interface TranscriptEntry {
  speaker: string | null
  timeRange: string | null
  text: string
}

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

function xml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function run(text: string, properties = ''): string {
  return `<w:r>${properties ? `<w:rPr>${properties}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`
}

function paragraph(content: string, properties = ''): string {
  return `<w:p>${properties ? `<w:pPr>${properties}</w:pPr>` : ''}${content}</w:p>`
}

function multilineRuns(text: string): string {
  return text.split(/\r?\n/).map((line, index) => `${index > 0 ? '<w:r><w:br/></w:r>' : ''}${run(line || ' ')}`).join('')
}

function collectEntries(input: TranscriptDocxInput): TranscriptEntry[] {
  const entries = input.segments.flatMap((segment) => {
    const text = segmentPlainText(segment.html).trim()
    if (!text) return []
    const beginMs = Number.isFinite(segment.beginMs) ? Math.max(0, segment.beginMs) : 0
    const endMs = Number.isFinite(segment.endMs) ? Math.max(beginMs, segment.endMs) : beginMs
    return [{
      speaker: segment.speaker.trim() || '说话人',
      timeRange: `${formatMs(beginMs)} - ${formatMs(endMs)}`,
      text,
    }]
  })
  if (entries.length > 0) return entries
  const fallbackText = input.fallbackText?.trim()
  return fallbackText ? [{ speaker: null, timeRange: null, text: fallbackText }] : []
}

function metadataCell(label: string, value: string): string {
  const cellProperties = '<w:tcW w:w="5000" w:type="dxa"/><w:shd w:fill="F7F8FA"/><w:tcMar><w:top w:w="150" w:type="dxa"/><w:left w:w="220" w:type="dxa"/><w:bottom w:w="150" w:type="dxa"/><w:right w:w="220" w:type="dxa"/></w:tcMar>'
  return `<w:tc><w:tcPr>${cellProperties}</w:tcPr>${paragraph(run(label, '<w:sz w:val="18"/><w:color w:val="7B8493"/>'), '<w:spacing w:after="55"/>')}${paragraph(run(value || '-', '<w:b/><w:sz w:val="21"/><w:color w:val="252A32"/>'))}</w:tc>`
}

function metadataTable(input: TranscriptDocxInput, count: number, exportedAt: string): string {
  const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((side) => `<w:${side} w:val="single" w:sz="2" w:color="E2E6EC"/>`).join('')
  return `<w:tbl><w:tblPr><w:tblW w:w="10000" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${borders}</w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="5000"/><w:gridCol w:w="5000"/></w:tblGrid><w:tr>${metadataCell('文件日期', input.fileDate)}${metadataCell('音视频时长', input.duration)}</w:tr><w:tr>${metadataCell('原文段数', `${count} 段`)}${metadataCell('导出时间', exportedAt)}</w:tr></w:tbl>`
}

function entryXml(entry: TranscriptEntry): string {
  const heading = entry.speaker
    ? paragraph(
        run(entry.speaker, '<w:b/><w:sz w:val="23"/><w:color w:val="1456F0"/>') +
          run(`    ${entry.timeRange}`, '<w:sz w:val="18"/><w:color w:val="77808F"/>'),
        '<w:keepNext/><w:spacing w:before="260" w:after="120"/><w:ind w:left="180" w:right="180"/><w:shd w:fill="F2F6FF"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="1456F0"/></w:pBdr>',
      )
    : ''
  const body = paragraph(
    multilineRuns(entry.text),
    '<w:widowControl/><w:spacing w:after="110" w:line="390" w:lineRule="auto"/><w:ind w:left="180" w:right="180" w:firstLine="440"/>',
  )
  return heading + body
}

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W_NS}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Microsoft YaHei" w:hAnsi="Microsoft YaHei" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/><w:color w:val="303640"/><w:lang w:val="zh-CN" w:eastAsia="zh-CN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`
}

function documentXml(input: TranscriptDocxInput, entries: TranscriptEntry[], exportedAt: string): string {
  const title = input.title.trim() || '原文记录'
  const titleBlock = paragraph(run(title, '<w:b/><w:sz w:val="38"/><w:color w:val="1E232B"/>'), '<w:spacing w:before="320" w:after="120"/>')
  const subtitle = paragraph(run('转写原文', '<w:b/><w:sz w:val="21"/><w:color w:val="1456F0"/>'), '<w:spacing w:after="360"/>')
  const sectionTitle = paragraph(run('原文记录', '<w:b/><w:sz w:val="27"/><w:color w:val="252A32"/>'), '<w:spacing w:before="500" w:after="100"/><w:pBdr><w:bottom w:val="single" w:sz="5" w:space="8" w:color="DDE2E9"/></w:pBdr>')
  const sectionProperties = '<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1120" w:right="1120" w:bottom="1120" w:left="1120" w:header="560" w:footer="560" w:gutter="0"/></w:sectPr>'
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${titleBlock}${subtitle}${metadataTable(input, entries.length, exportedAt)}${sectionTitle}${entries.map(entryXml).join('')}${sectionProperties}</w:body></w:document>`
}

function packageEntries(input: TranscriptDocxInput, entries: TranscriptEntry[], exportedAt: string) {
  const title = input.title.trim() || '原文记录'
  const isoNow = new Date().toISOString()
  return [
    { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>' },
    { name: 'docProps/core.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(title)}</dc:title><dc:subject>转写原文</dc:subject><dc:creator>wwj</dc:creator><cp:lastModifiedBy>wwj</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${isoNow}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${isoNow}</dcterms:modified></cp:coreProperties>` },
    { name: 'docProps/app.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>IYY</Application><AppVersion>1.0</AppVersion></Properties>' },
    { name: 'word/document.xml', content: documentXml(input, entries, exportedAt) },
    { name: 'word/styles.xml', content: stylesXml() },
    { name: 'word/settings.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="${W_NS}"><w:updateFields w:val="true"/><w:compat/></w:settings>` },
    { name: 'word/header1.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="${W_NS}">${paragraph(run(`IYY  ·  ${title}`, '<w:sz w:val="17"/><w:color w:val="8A93A1"/>'), '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="6" w:color="DDE2E9"/></w:pBdr>')}</w:hdr>` },
    { name: 'word/footer1.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="${W_NS}">${paragraph(`${run('第 ', '<w:sz w:val="17"/><w:color w:val="8A93A1"/>')}<w:fldSimple w:instr="PAGE">${run('1', '<w:sz w:val="17"/><w:color w:val="8A93A1"/>')}</w:fldSimple>${run(' 页', '<w:sz w:val="17"/><w:color w:val="8A93A1"/>')}`, '<w:jc w:val="center"/>')}</w:ftr>` },
    { name: 'word/_rels/document.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>' },
  ]
}

function safeFilename(title: string): string {
  return `${title.trim().replace(/[\\/:*?"<>|]/g, '_') || '原文记录'}.docx`
}

export async function exportTranscriptDocx(input: TranscriptDocxInput): Promise<void> {
  const entries = collectEntries(input)
  if (entries.length === 0) throw new Error('EMPTY_TRANSCRIPT')
  const exportedAt = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date())
  const blob = createStoredZip(packageEntries(input, entries, exportedAt))
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = safeFilename(input.title)
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
    anchor.remove()
  }, 1000)
}
