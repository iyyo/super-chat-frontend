import type { EditableSegment } from '@/lib/file-editor'
import { segmentPlainText } from '@/lib/file-editor'
import { buildFileSummary, type FileSummaryView } from '@/lib/file-summary'
import { buildFallbackChapters, type SummaryChapter } from '@/lib/summary-chapters'

export type SummaryStatus = 'generating' | 'done' | 'failed' | null

export interface TimelineStep {
  icon: 'input' | 'analysis' | 'output'
  title: string
  tag: string
  description: string
  bullets?: string[]
}

export interface DialogueBlock {
  heading: string
  paragraphs?: string[]
  items?: Array<{ label: string; value: string }>
  bullets?: string[]
}

export interface StructuredSummaryDocument {
  title: string
  description: string
  assessments: FileSummaryView['assessments']
  timeline: TimelineStep[]
  dialogueTitle: string
  metadata: Array<{ label: string; value: string }>
  abstract: string
  chapters: SummaryChapter[]
  dialogueSections: DialogueBlock[]
  previewBullets?: string[]
  copyText: string
}

function splitSentences(text: string): string[] {
  return text
    .split(/[。！？.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
}

function quoteSnippet(text: string, max = 28): string {
  const t = text.trim()
  if (!t) return '（无内容）'
  return `「${t.slice(0, max)}${t.length > max ? '…' : ''}」`
}

function pickTopSpeaker(lines: Array<{ speaker: string; text: string }>) {
  const stats = new Map<string, number>()
  for (const line of lines) stats.set(line.speaker, (stats.get(line.speaker) ?? 0) + line.text.length)
  return [...stats.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function buildPreviewBullets(isShort: boolean, fullText: string, lines: Array<{ speaker: string; text: string }>): string[] {
  if (isShort) {
    return [
      `当前仅捕获 ${Math.max(lines.length, 1)} 段短句，暂时不足以还原完整议题。`,
      lines[0] ? `${lines[0].speaker} 提到 ${quoteSnippet(lines[0].text, 24)}` : `原始片段 ${quoteSnippet(fullText, 24)}`,
      '补充更长录音后，可继续生成完整纪要与待办。',
    ]
  }

  const topSpeaker = pickTopSpeaker(lines)
  return [
    `已整理 ${lines.length} 段发言，当前纪要可直接继续编辑。`,
    topSpeaker ? `${topSpeaker} 的发言信息量最高，适合优先回看。` : '当前内容已具备基础纪要结构。',
    '如需更细的责任人与截止时间，可在 Chat 中继续追问。',
  ]
}

function buildTimeline(isShort: boolean, fullText: string, segmentCount: number, speakerCount: number): TimelineStep[] {
  if (isShort) {
    return [
      {
        icon: 'input',
        title: '材料范围',
        tag: '片段',
        description: '当前录音更像一条零散语音片段，时长与上下文都不足以拼出完整议题。',
      },
      {
        icon: 'analysis',
        title: '已识别内容',
        tag: '线索',
        description: '基于现有材料，暂时只能稳定确认这些信息：',
        bullets: ['原句片段', '出现过的说话人', '可回放的原始时间点'],
      },
      {
        icon: 'output',
        title: '当前输出',
        tag: '纪要',
        description:
          '本页先保留能确认的信息，不强行编造结论；补录更完整内容后再生成正式纪要会更可靠。',
      },
    ]
  }

  const sentences = splitSentences(fullText)
  return [
    {
      icon: 'input',
      title: '材料范围',
      tag: '输入',
      description: `已整理 ${segmentCount} 段发言，约 ${fullText.length} 字，覆盖 ${speakerCount} 位说话人。`,
    },
    {
      icon: 'analysis',
      title: '识别结果',
      tag: '提炼',
      description: '当前纪要已提炼出这些可直接使用的线索：',
      bullets: [
        `核心表达 ${Math.min(sentences.length, 8)} 条`,
        '章节切分与说话人分布',
        '可继续追问的结论与待办线索',
      ],
    },
    {
      icon: 'output',
      title: '当前输出',
      tag: '纪要',
      description:
        sentences.length > 0
          ? '已生成一版可编辑纪要，适合先快速回看，再按业务场景补足责任人与决策。'
          : '转写内容较少，建议补充录音后重新分析。',
    },
  ]
}

function buildDialogueSections(
  isShort: boolean,
  fullText: string,
  lines: Array<{ speaker: string; text: string }>,
): DialogueBlock[] {
  const speakers = [...new Set(lines.map((l) => l.speaker))]
  const mainQuote = lines[0]?.text ? quoteSnippet(lines[0].text, 48) : quoteSnippet(fullText, 48)

  if (isShort) {
    return [
      {
        heading: '当前能确认的信息',
        paragraphs: ['这段录音更像试录或零散补充语音，暂时不足以还原完整会议过程。'],
        bullets: [
          `片段内容：${lines[0]?.speaker ?? '说话人1'}提到了 ${mainQuote}。`,
          '目前看不到明确议题、决策过程或责任人信息。',
        ],
      },
      {
        heading: '为什么先不下结论',
        bullets: [
          '上下文太短，无法判断这句话对应的背景问题。',
          speakers.length > 1 ? '缺少连续讨论过程，难以判断各方是否形成共识。' : '缺少多人互动，无法确认是否存在回应与分工。',
          '没有可直接落到责任人和时间点的内容。',
        ],
      },
      {
        heading: '补充后会更有用',
        items: [
          { label: '建议补充', value: '连续 3–5 分钟录音，或补一段包含背景与结论的原话。' },
          { label: '下一步', value: '补录后重新生成，或先在 Chat 中补背景再继续整理。' },
        ],
      },
    ]
  }

  const topSpeaker = pickTopSpeaker(lines)
  const overview =
    lines.length > 0
      ? `共 ${lines.length} 段发言，${speakers.length} 位说话人参与。当前纪要先聚焦“能确认的内容”，方便你快速继续整理。`
      : '以下为当前转写材料生成的纪要摘要。'

  const speechBullets = lines.slice(0, 5).map((l) => `${l.speaker}：${quoteSnippet(l.text, 40)}`)
  const nextAction =
    speakers.length > 1
      ? '优先在 Chat 中追问「谁负责 / 何时完成」，把责任人与截止时间补齐。'
      : '建议补充更多互动片段后，再继续抽取待办与结论。'

  return [
    {
      heading: '内容速览',
      paragraphs: [
        overview,
        topSpeaker ? `从发言密度看，当前信息量最高的是 ${topSpeaker}。` : '当前材料已能支持基础纪要整理。',
      ],
      bullets: speechBullets.length > 0 ? speechBullets : [quoteSnippet(fullText, 80)],
    },
    {
      heading: '当前可落地结论',
      items: [
        {
          label: '当前结论',
          value: splitSentences(fullText).slice(-1)[0] ?? '待结合业务场景补充',
        },
        { label: '建议下一步', value: nextAction },
      ],
    },
    {
      heading: '继续追问方向',
      bullets: [
        '提取本次讨论里已经达成的明确决定。',
        '补齐待办、责任人、截止时间。',
        speakers.length > 1 ? '按说话人拆开看观点差异与分工。' : '回听原音，补齐遗漏的背景信息。',
      ],
    },
  ]
}

function buildCopyText(doc: Omit<StructuredSummaryDocument, 'copyText'>): string {
  const lines: string[] = [doc.title, doc.description, '', `【${doc.dialogueTitle}】`]
  for (const m of doc.metadata.filter((item) => item.label !== '会议状态')) {
    lines.push(`- ${m.label}：${m.value}`)
  }
  lines.push('', doc.abstract)

  if (doc.chapters.length > 0) {
    lines.push('', '【章节概要】')
    doc.chapters.forEach((chapter) => {
      lines.push(`- ${formatChapterTime(chapter.startMs)} ${chapter.title}：${chapter.summary}`)
    })
  }

  for (const section of doc.dialogueSections) {
    lines.push('', section.heading)
    section.paragraphs?.forEach((p) => lines.push(p))
    section.items?.forEach((i) => lines.push(`- ${i.label}：${i.value}`))
    section.bullets?.forEach((b) => lines.push(`- ${b}`))
  }

  return lines.join('\n')
}

export function buildStructuredSummaryDocument(
  fileTitle: string,
  segments: EditableSegment[],
  plainFallback: string | null,
): StructuredSummaryDocument {
  const lines = segments
    .map((s) => ({ speaker: s.speaker.trim() || '说话人1', text: segmentPlainText(s.html) }))
    .filter((l) => l.text.length > 0)

  const fullText =
    lines.length > 0 ? lines.map((l) => l.text).join('') : (plainFallback?.trim() ?? '')

  const wordCount = fullText.length
  const isShort = wordCount < 30
  const speakers = [...new Set(lines.map((l) => l.speaker))]
  const transcriptSegments = segments.map((s) => ({ beginMs: s.beginMs, endMs: s.endMs, role: s.role, text: segmentPlainText(s.html) }))

  const base = buildFileSummary(fileTitle, transcriptSegments, fullText || null)

  const assessments = isShort
    ? [
        {
          label: '议题缺失',
          severity: 'serious' as const,
          items: ['未明确会议主题或目标。', '无法识别讨论领域与背景。'],
        },
        {
          label: '参与缺失',
          severity: 'serious' as const,
          items: ['仅记录说话人1的零散发言。', '无其他参与者互动或回应记录。'],
        },
      ]
    : base.assessments

  const title = isShort ? '会议内容缺失' : fileTitle || '会议纪要'
  const description = isShort
    ? '由于输入的会议内容过于简短且缺乏上下文，无法生成包含完整议题、讨论过程和结论的详细纪要。'
    : base.description

  const metadata = isShort
    ? [
        { label: '会议主题', value: '未明确' },
        { label: '参会人员', value: speakers[0] ?? '说话人1' },
        { label: '会议状态', value: '内容片段化，缺乏完整议题' },
      ]
    : [
        { label: '会议主题', value: fileTitle || '未明确' },
        { label: '参会人员', value: speakers.join('、') || '说话人1' },
        {
          label: '会议状态',
          value: wordCount > 200 ? '内容较完整，可继续追问' : '内容有限，建议补充录音',
        },
      ]

  const abstract = isShort
    ? '当前只捕获到零散短句，先展示可确认片段，不强行推导会议主题、结论或待办。'
    : `已根据 ${wordCount} 字转写生成纪要预览。${speakers.length > 1 ? `涉及 ${speakers.length} 位说话人。` : ''}`

  const dialogueSections = buildDialogueSections(isShort, fullText, lines)
  const timeline = buildTimeline(isShort, fullText, lines.length, speakers.length || 1)
  const chapters = buildFallbackChapters(segments, fullText)
  const previewBullets = buildPreviewBullets(isShort, fullText, lines)

  const partial = { title, description, assessments, timeline, dialogueTitle: isShort ? '简短对话' : '会议纪要', metadata, abstract, chapters, dialogueSections, previewBullets }

  return {
    ...partial,
    copyText: buildCopyText(partial),
  }
}

/** 优先使用服务端 AI 纪要，否则回退本地模板 */
export function resolveStructuredSummaryDocument(
  apiSummary: (Omit<StructuredSummaryDocument, 'copyText'> & { copyText?: string }) | null | undefined,
  fallback: StructuredSummaryDocument,
): StructuredSummaryDocument {
  if (!apiSummary?.title) return fallback
  const merged = {
    ...fallback,
    ...apiSummary,
    chapters: apiSummary.chapters?.length ? apiSummary.chapters : fallback.chapters,
    timeline: apiSummary.timeline?.length ? apiSummary.timeline : fallback.timeline,
    dialogueSections: apiSummary.dialogueSections?.length ? apiSummary.dialogueSections : fallback.dialogueSections,
    previewBullets: apiSummary.previewBullets?.length ? apiSummary.previewBullets : fallback.previewBullets,
  }
  return { ...merged, copyText: buildCopyText(merged) }
}

function formatChapterTime(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}
