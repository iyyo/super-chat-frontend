/** 从流式 JSON 半成品里抠可读字段，用于边生成边展示 */

export interface SummaryStreamDraft {
  abstract: string
  bullets: string[]
  title: string
}

function unescapeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string
  } catch {
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }
}

function matchStringField(raw: string, field: string): string {
  const re = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`)
  const hit = re.exec(raw)
  return hit ? unescapeJsonString(hit[1]) : ''
}

export function extractSummaryStreamDraft(raw: string): SummaryStreamDraft {
  const title = matchStringField(raw, 'title')
  const abstract = matchStringField(raw, 'abstract')

  const bullets: string[] = []
  const arr = /"previewBullets"\s*:\s*\[([\s\S]*?)\]/.exec(raw)
  if (arr?.[1]) {
    const itemRe = /"((?:\\.|[^"\\])*)"/g
    let m: RegExpExecArray | null
    while ((m = itemRe.exec(arr[1])) && bullets.length < 3) {
      const text = unescapeJsonString(m[1]).trim()
      if (text) bullets.push(text)
    }
  }

  return { title, abstract, bullets }
}
