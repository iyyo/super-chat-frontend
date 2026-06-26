import { Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const FEATURED = [
  { title: 'GPT-4o', desc: '多模态大模型，理解力更强', tag: '对话' },
  { title: 'DALL·E 3', desc: '高质量 AI 图像生成', tag: '图像' },
  { title: 'Whisper', desc: '语音转文字，支持多语言', tag: '语音' },
  { title: 'Code Copilot', desc: '编程辅助与代码解释', tag: '代码' },
]

export function ExplorePage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input placeholder="搜索 AI 能力..." className="pl-9" />
      </div>

      <section>
        <h3 className="mb-3 text-sm font-medium text-muted">推荐能力</h3>
        <div className="flex flex-col gap-3">
          {FEATURED.map(({ title, desc, tag }) => (
            <Card key={title} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-sm text-muted">{desc}</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/20 px-2.5 py-0.5 text-xs text-accent">
                {tag}
              </span>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
