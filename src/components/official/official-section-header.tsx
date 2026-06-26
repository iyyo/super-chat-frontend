import { cn } from '@/lib/utils'

interface OfficialSectionHeaderProps {
  label?: string
  title: string
  desc?: string
  center?: boolean
  className?: string
}

/** 官网各区块统一标题样式 */
export function OfficialSectionHeader({
  label,
  title,
  desc,
  center = false,
  className,
}: OfficialSectionHeaderProps) {
  return (
    <div className={cn('official-section-head', center && 'official-section-head-center', className)}>
      {label && <p className="official-section-label">{label}</p>}
      <h2 className="official-section-title">{title}</h2>
      {desc && <p className="official-section-desc">{desc}</p>}
    </div>
  )
}
