import { ChatVisual } from './chat-visual'
import { ImageVisual } from './image-visual'
import { DocVisual } from './doc-visual'
import { VoiceVisual } from './voice-visual'

export type ProductVisualType = 'chat' | 'image' | 'doc' | 'voice'

interface ProductVisualProps {
  type: ProductVisualType
  theme?: 'light' | 'dark'
}

export function ProductVisual({ type, theme = 'light' }: ProductVisualProps) {
  switch (type) {
    case 'chat':
      return <ChatVisual theme={theme} />
    case 'image':
      return <ImageVisual theme={theme} />
    case 'doc':
      return <DocVisual theme={theme} />
    case 'voice':
      return <VoiceVisual />
    default:
      return <ChatVisual theme={theme} />
  }
}

export { HeroVisual } from './hero-visual'
