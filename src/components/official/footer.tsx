import { Link } from 'react-router-dom'
import { APP_NAME, ROUTES } from '@/lib/constants'

export function OfficialFooter() {
  return (
    <footer id="support" className="border-t border-[var(--ifly-border)] bg-[var(--ifly-bg-gray)]">
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h4 className="text-sm font-semibold text-[var(--ifly-text)]">产品</h4>
            <ul className="mt-4 space-y-2 text-sm text-[var(--ifly-text-secondary)]">
              <li><Link to={ROUTES.chat} className="hover:text-[var(--ifly-blue)]">智能语音</Link></li>
              <li><Link to={ROUTES.chat} className="hover:text-[var(--ifly-blue)]">智能对话</Link></li>
              <li><Link to={ROUTES.explore} className="hover:text-[var(--ifly-blue)]">图像生成</Link></li>
              <li><Link to={ROUTES.chat} className="hover:text-[var(--ifly-blue)]">文档助手</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--ifly-text)]">解决方案</h4>
            <ul className="mt-4 space-y-2 text-sm text-[var(--ifly-text-secondary)]">
              <li><a href="#products" className="hover:text-[var(--ifly-blue)]">会议办公</a></li>
              <li><a href="#products" className="hover:text-[var(--ifly-blue)]">文档翻译</a></li>
              <li><a href="#enterprise" className="hover:text-[var(--ifly-blue)]">企业定制</a></li>
            </ul>
          </div>
          <div id="about">
            <h4 className="text-sm font-semibold text-[var(--ifly-text)]">支持</h4>
            <ul className="mt-4 space-y-2 text-sm text-[var(--ifly-text-secondary)]">
              <li><a href="#support" className="hover:text-[var(--ifly-blue)]">帮助中心</a></li>
              <li><Link to={ROUTES.legalPrivacy} className="hover:text-[var(--ifly-blue)]">隐私政策</Link></li>
              <li><Link to={ROUTES.legalTerms} className="hover:text-[var(--ifly-blue)]">用户协议</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--ifly-text)]">联系我们</h4>
            <ul className="mt-4 space-y-2 text-sm text-[var(--ifly-text-secondary)]">
              <li>商务合作 · 企业采购</li>
              <li>客服咨询 · 售后答疑</li>
              <li>
                <Link to={ROUTES.app} className="text-[var(--ifly-blue)] hover:underline">
                  免费体验转文字
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--ifly-border)] pt-6 text-center text-xs text-[var(--ifly-text-muted)]">
          <p>Copyright © 2026 {APP_NAME}. 保留所有权利。</p>
        </div>
      </div>
    </footer>
  )
}
