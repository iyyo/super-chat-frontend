import { DEFAULT_BRAND_COLOR } from '@/lib/constants'

export interface BrandPalette {
  primary: string
  hover: string
  light: string
  mid: string
  soft: string
  rgb: string
  summaryEnd: string
}

function clampByte(n: number) {
  return Math.round(Math.min(255, Math.max(0, n)))
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((c) => clampByte(c).toString(16).padStart(2, '0')).join('')}`
}

export function normalizeHex(input: string): string | null {
  let hex = input.trim()
  if (!hex.startsWith('#')) hex = `#${hex}`
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const c = hex.slice(1)
    return `#${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`.toLowerCase()
  }
  return null
}

function parseHex(hex: string) {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  const raw = normalized.slice(1)
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  }
}

function mix(hex: string, target: string, weight: number) {
  const c1 = parseHex(hex)
  const c2 = parseHex(target)
  if (!c1 || !c2) return hex
  const w = Math.min(1, Math.max(0, weight))
  return rgbToHex(
    c1.r * (1 - w) + c2.r * w,
    c1.g * (1 - w) + c2.g * w,
    c1.b * (1 - w) + c2.b * w,
  )
}

export function buildBrandPalette(primary: string): BrandPalette | null {
  const normalized = normalizeHex(primary)
  if (!normalized) return null
  const rgb = parseHex(normalized)
  if (!rgb) return null

  return {
    primary: normalized,
    hover: mix(normalized, '#000000', 0.14),
    light: mix(normalized, '#ffffff', 0.9),
    mid: mix(normalized, '#ffffff', 0.35),
    soft: mix(normalized, '#ffffff', 0.22),
    summaryEnd: mix(normalized, '#ffffff', 0.94),
    rgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
  }
}

export function applyBrandTheme(primary: string) {
  const palette = buildBrandPalette(primary) ?? buildBrandPalette(DEFAULT_BRAND_COLOR)
  if (!palette) return

  const root = document.documentElement
  root.style.setProperty('--ifly-blue', palette.primary)
  root.style.setProperty('--ifly-blue-hover', palette.hover)
  root.style.setProperty('--ifly-blue-light', palette.light)
  root.style.setProperty('--brand-primary', palette.primary)
  root.style.setProperty('--brand-hover', palette.hover)
  root.style.setProperty('--brand-light', palette.light)
  root.style.setProperty('--brand-mid', palette.mid)
  root.style.setProperty('--brand-soft', palette.soft)
  root.style.setProperty('--brand-rgb', palette.rgb)
  root.style.setProperty('--brand-summary-gradient', `linear-gradient(135deg, ${palette.light} 0%, ${palette.summaryEnd} 100%)`)
  root.style.setProperty('--official-card-border', `rgba(${palette.rgb}, 0.14)`)
  root.style.setProperty(
    '--official-card-shadow',
    `0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(${palette.rgb}, 0.07)`,
  )
  root.style.setProperty(
    '--official-card-shadow-hover',
    `0 4px 8px rgba(${palette.rgb}, 0.08), 0 14px 36px rgba(${palette.rgb}, 0.14)`,
  )

  // C 端 Tailwind @theme 变量
  root.style.setProperty('--color-primary', palette.primary)
  root.style.setProperty('--color-accent', palette.soft)

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', palette.primary)
}
