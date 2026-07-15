import type { TranscriptSegment } from '@/lib/parse-transcript'
import { speakerLabel } from '@/lib/parse-transcript'

export interface FileSummaryView {
  title: string
  description: string
  speechRecords: Array<{
    speaker: string
    quote: string
    tag?: string
  }>
  assessments: Array<{
    label: string
    severity: 'normal' | 'warn' | 'serious'
    items: string[]
  }>
  extractable: string[]
  suggestChip: string
}

export function buildFileSummary(
  fileTitle: string,
  segments: TranscriptSegment[],
  plainText: string | null,
): FileSummaryView {
  const text = plainText?.trim() ?? segments.map((s) => s.text).join('')
  const wordCount = text.length
  const speakers = [...new Set(segments.map((s) => s.role ?? '1'))]
  const isShort = wordCount < 30
  const isSingleSpeaker = speakers.length <= 1

  const speechRecords = segments.slice(0, 3).map((seg) => ({
    speaker: speakerLabel(seg.role),
    quote: `提到了「${seg.text.slice(0, 24)}${seg.text.length > 24 ? '…' : ''}」`,
    tag: isShort ? '内容较短，建议补充上下文' : undefined,
  }))

  if (speechRecords.length === 0 && text) {
    speechRecords.push({
      speaker: '说话人1',
      quote: `提到了「${text.slice(0, 32)}${text.length > 32 ? '…' : ''}」`,
      tag: isShort ? '孤立短语，缺乏上下文' : undefined,
    })
  }

  const assessments: FileSummaryView['assessments'] = []

  if (isShort) {
    assessments.push({
      label: '议题缺失',
      severity: 'serious',
      items: ['录音文本过短', '未识别到完整议题结构', '建议核对音频是否完整'],
    })
  } else {
    assessments.push({
      label: '议题识别',
      severity: 'normal',
      items: [`已识别约 ${wordCount} 字转写内容`, '可进入 Chat 继续追问与整理'],
    })
  }

  if (isSingleSpeaker) {
    assessments.push({
      label: '参与缺失',
      severity: isShort ? 'serious' : 'warn',
      items: ['仅检测到单一说话人', '无多人对话结构', '如需分角色请开启说话人分离'],
    })
  } else {
    assessments.push({
      label: '参与识别',
      severity: 'normal',
      items: [`识别到 ${speakers.length} 位说话人`, '可在右侧笔记查看分角色转写'],
    })
  }

  const extractable: string[] = []
  if (text) extractable.push(`核心文本：${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`)
  extractable.push(`时长片段：${segments.length} 段`)
  if (speakers.length > 1) extractable.push(`说话人：${speakers.map((r) => speakerLabel(r)).join('、')}`)

  const suggestChip =
    segments.length > 0
      ? `探讨${speakerLabel(segments[0]?.role)}的相关问题`
      : '基于转写内容继续分析'

  return {
    title: isShort ? '会议内容较短' : fileTitle,
    description: isShort
      ? '录音中仅包含极少量语音片段，无法形成完整会议纪要，建议补充更完整的录音后重新转写。'
      : `已根据转写结果生成结构化纪要预览。共 ${wordCount} 字，${segments.length} 个语音片段。`,
    speechRecords,
    assessments,
    extractable,
    suggestChip,
  }
}
