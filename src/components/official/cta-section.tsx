import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { APP_NAME, ROUTES } from '@/lib/constants'
import { Reveal } from '@/components/official/reveal'
import { ChatPanel } from '@/components/official/illustrations/chat-panel'

export function CtaSection() {
  return (
    <section className="official-cta-section">
      <div className="mx-auto max-w-[1200px] px-6 py-16 md:py-24">
        <Reveal>
          <div className="official-cta-card">
            <div className="official-cta-layout">
              <div className="official-cta-copy">
                <p className="official-cta-label">准备好升级你的工作流了吗？</p>
                <h2 className="official-cta-title">
                  无需下载安装，打开浏览器
                  <br className="hidden sm:block" />
                  开始体验 {APP_NAME} 的 AI 语音能力
                </h2>
                <p className="official-cta-desc">
                  注册即可免费体验实时转写与 AI 纪要，让每一次会议和采访都变成结构化知识。
                </p>
                <div className="official-cta-actions">
                  <Link to={ROUTES.authRegister} className="ifly-btn-primary">
                    免费注册使用
                  </Link>
                  <Link to={ROUTES.chat} className="official-cta-btn official-cta-btn-secondary">
                    直接进入工作台
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
                <p className="official-cta-note">免费试用 · 无需安装 · 浏览器即可开始</p>
              </div>

              <div className="official-cta-visual">
                <div className="official-cta-visual-frame">
                  <ChatPanel liveFeed />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
