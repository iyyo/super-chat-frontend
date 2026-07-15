import { WEBSITE_IMAGES } from '@/lib/website-assets'

export const APP_NAME = import.meta.env.VITE_APP_TITLE ?? 'IYY AI'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** 全局默认品牌色（可通过主题设置覆盖，持久化到 localStorage） */
export const DEFAULT_BRAND_COLOR = '#6366f1'

export const BRAND_THEME_PRESETS = [
  { id: 'indigo', label: '靛蓝', color: '#6366f1' },
  { id: 'violet', label: '紫罗兰', color: '#8b5cf6' },
  { id: 'emerald', label: '翠绿', color: '#10b981' },
  { id: 'rose', label: '玫红', color: '#f43f5e' },
  { id: 'amber', label: '琥珀', color: '#f59e0b' },
  { id: 'slate', label: '石墨', color: '#475569' },
  { id: 'cyan', label: '青色', color: '#06b6d4' },
  { id: 'classic', label: '经典蓝', color: '#1e6fff' },
] as const

export const ROUTES = {
  official: '/',
  auth: '/auth',
  authRegister: '/auth?tab=register',
  legalTerms: '/legal/terms',
  legalPrivacy: '/legal/privacy',
  authForgotPassword: '/auth/forgot-password',
  app: '/app',
  chat: '/app/chat',
  explore: '/app/explore',
  profile: '/app/profile',
  manual: '/app/manual',
  record: '/app/record',
  files: '/app/files',
  fileDetail: (id: string) => `/app/files/${id}`,
  share: (token: string) => `/share/${token}`,
} as const

export function buildShareUrl(token: string) {
  if (typeof window === 'undefined') return `/share/${token}`
  return `${window.location.origin}/share/${encodeURIComponent(token)}`
}

/** 工作台 URL 动作参数（官网入口 → 落地页弹窗） */
export const APP_ACTIONS = {
  import: 'import',
  record: 'record',
} as const

export function appUrlWithAction(action: keyof typeof APP_ACTIONS) {
  return `${ROUTES.app}?action=${APP_ACTIONS[action]}`
}

export const IMPORT_AUDIO_LANGUAGES = [
  { id: 'zh-en', label: '中英混合', premium: false },
  { id: 'dialect', label: '方言免切换', premium: true },
  { id: 'cec', label: '中英粤混合', premium: true },
  { id: 'zh', label: '中文（普通话）', premium: false },
  { id: 'en', label: '英语', premium: false },
  { id: 'more', label: '更多', premium: false, more: true },
] as const

export const IMPORT_SPEAKER_COUNTS = [
  { id: 'auto', label: '自动' },
  ...Array.from({ length: 12 }, (_, i) => ({
    id: String(i + 1),
    label: `${i + 1}人`,
  })),
  { id: '12+', label: '12人以上' },
] as const

export const IMPORT_PROFESSIONAL_DOMAINS = [
  { id: 'general', label: '通用' },
  { id: 'law', label: '法律' },
  { id: 'finance', label: '金融' },
  { id: 'medical', label: '医疗' },
  { id: 'tech', label: '科技' },
  { id: 'sports', label: '体育' },
  { id: 'education', label: '教育' },
  { id: 'telecom', label: '运营商' },
  { id: 'government', label: '政府' },
  { id: 'game', label: '游戏' },
  { id: 'ecommerce', label: '电商' },
  { id: 'military', label: '军事' },
  { id: 'enterprise', label: '企业' },
  { id: 'life', label: '生活' },
  { id: 'entertainment', label: '娱乐' },
  { id: 'humanities', label: '人文历史' },
  { id: 'auto', label: '汽车' },
] as const

export const MANUAL_LANGUAGES = [
  { id: 'zh', label: '中文 (普通话)' },
  { id: 'en', label: '英语' },
  { id: 'sc', label: '中文 (四川话)' },
  { id: 'yue', label: '中文 (粤语)' },
  { id: 'sd', label: '中文 (山东话)' },
  { id: 'henan', label: '中文 (河南话)' },
  { id: 'more', label: '更多', more: true },
] as const

export const MANUAL_DRAFT_TYPES = [
  { id: 'role', label: '文稿 (标角色)' },
  { id: 'plain', label: '文稿' },
] as const

export const MANUAL_REQUIREMENTS = [
  {
    id: 'smooth',
    title: '流畅整理',
    desc: '去除语气词，适当整理，内容更流畅',
  },
  {
    id: 'verbatim',
    title: '逐字逐句',
    desc: '仅过滤冗余词与无效片段',
  },
  {
    id: 'extract',
    title: '内容提炼',
    desc: '保留原文 30%-40% 核心内容',
  },
] as const

export const MANUAL_SPEED_OPTIONS = [
  { id: 'normal', label: '正常转写', hint: '1小时音频预计需要3小时' },
  { id: 'urgent', label: '加急转写', hint: '1小时音频预计需要2小时' },
] as const

export const NAV_ITEMS = [
  { path: ROUTES.app, label: '首页', icon: 'home' as const },
  { path: ROUTES.chat, label: '对话', icon: 'message' as const },
  { path: ROUTES.explore, label: '发现', icon: 'compass' as const },
  { path: ROUTES.profile, label: '我的', icon: 'user' as const },
]

/** 工作台侧栏（桌面端） */
export const WORKSPACE_SIDEBAR_NAV = [
  { path: ROUTES.app, label: '首页', icon: 'home' as const, end: true },
  { path: ROUTES.files, label: '文件', icon: 'files' as const, end: true },
  { path: ROUTES.chat, label: 'Chat', icon: 'message' as const, end: false },
] as const

export const WORKSPACE_ACTIONS = [
  {
    id: 'record',
    title: '开始录音',
    desc: '实时转写，边录边出稿',
    variant: 'primary' as const,
    href: ROUTES.record,
  },
  {
    id: 'import',
    title: '导入文件',
    desc: '音视频一键转文字',
    variant: 'default' as const,
    opensImportModal: true,
  },
  {
    id: 'subtitle',
    title: '悬浮字幕',
    desc: '会议直播实时字幕',
    variant: 'default' as const,
    href: ROUTES.chat,
  },
] as const

export const WORKSPACE_RECENT_FILES = [
  {
    id: '1',
    title: '新录音',
    subtitle: null,
    duration: '00:06',
    date: '06-23 14:47',
    source: '网站',
    tag: null,
    live: true,
  },
  {
    id: '2',
    title: '简短对话',
    subtitle: '探讨相关人员的相关问题',
    duration: '00:30',
    date: '06-23 14:45',
    source: '网站',
    tag: '章节速览 1',
    live: false,
  },
  {
    id: '3',
    title: '拼文字与个人形象的拼写过程',
    subtitle: '拼文字的过程与个人形象',
    duration: '00:36',
    date: '05-23 15:47',
    source: '网站',
    tag: '章节速览 1',
    live: false,
  },
] as const

export const WORKSPACE_FILE_TABS = [
  { id: 'mine', label: '我的文件' },
  { id: 'imports', label: '导入记录' },
  { id: 'star', label: '收藏文件' },
  { id: 'trash', label: '回收站' },
] as const

export const WORKSPACE_ALL_FILES = [
  ...WORKSPACE_RECENT_FILES,
  {
    id: '4',
    title: '报考学院开始上课',
    subtitle: null,
    duration: '00:20',
    date: '05-14 11:22',
    source: '网站',
    tag: null,
    live: false,
  },
  {
    id: '5',
    title: '新录音-2025年12月5日-11:29:21',
    subtitle: null,
    duration: '00:22',
    date: '2025-12-05 11:29',
    source: '网站',
    tag: null,
    live: false,
  },
  {
    id: '6',
    title: '新录音-2025年12月5日-11:14:05',
    subtitle: null,
    duration: '01:14',
    date: '2025-12-05 11:14',
    source: '网站',
    tag: null,
    live: false,
  },
] as const

export type WorkspaceFile = (typeof WORKSPACE_ALL_FILES)[number]

export const WORKSPACE_ASSISTANT_NAME = '小谛'

export const WORKSPACE_CHAT_GREETING = '👋Hi 我是你的AI助手小谛'

export const WORKSPACE_CHAT_SUBTITLE = '来问点什么吧'

export const WORKSPACE_CHAT_SUGGESTIONS = [
  '帮我总结会议的核心内容',
  '请整理会议待办',
  '为我写一份会议纪要，要求正式、规范',
] as const

export const WORKSPACE_CHAT_AI_NOTE = '以上内容由人工智能生成'

export const OFFICIAL_NAV = [
  { label: '产品能力', href: '#products' },
  { label: '企业服务', href: '#enterprise' },
  { label: '用户故事', href: '#stories' },
] as const

export const HERO_TAGLINE = '听见即记录 · AI 即纪要'

export const HERO_PRODUCT_CHIPS = [
  { id: 'voice', label: '语音转写', href: ROUTES.chat },
  { id: 'chat', label: '智能对话', href: ROUTES.chat },
  { id: 'summary', label: 'AI 纪要', href: ROUTES.chat },
  { id: 'doc', label: '文档助手', href: ROUTES.chat },
] as const

export const HERO_ACTION_CARDS = [
  {
    id: 'import',
    iconKey: 'import' as const,
    title: '导入音视频',
    bullets: ['转文字准确率最高可达 98%', '1 小时音视频最快 5 分钟出稿'],
    href: appUrlWithAction('import'),
    badge: null,
  },
  {
    id: 'record',
    iconKey: 'record' as const,
    title: '实时录音',
    bullets: ['会议实时记录整理效率工具', 'AI 会议纪要，一键成稿'],
    href: ROUTES.app,
    badge: '免费体验',
  },
  {
    id: 'summary',
    iconKey: 'summary' as const,
    title: 'AI 智能纪要',
    bullets: ['自动提炼要点与待办事项', '支持导出 Word / PDF 格式'],
    href: ROUTES.manual,
    badge: null,
  },
] as const

export const HERO_BULLETS = [
  '导入文件 · 1 小时音频最快 5 分钟出稿',
  '实时录音 · 一键成稿，准确率最高 98%',
  '支持多语种 + 专业领域效果优化',
  '说话人角色区分 · AI 整理会议纪要',
] as const

/** 信任条数据（Hero 下方） */
export const TRUST_STATS = [
  { value: '500万+', label: '累计转写用户' },
  { value: '98%', label: '转写准确率' },
  { value: '37+', label: '支持语种' },
  { value: '10万+', label: '企业团队在用' },
] as const

export const HERO_STATS = [
  { value: '98%', label: '转写准确率' },
  { value: '37+', label: '支持语种' },
  { value: '5min', label: '1小时出稿' },
] as const

/** Hero 主标题轮播（上下翻滚切换） */
export const HERO_TITLE_CYCLES = [
  { primary: '听见', secondary: '你的 AI 语音记录助手' },
  { primary: '记录', secondary: '会议采访课堂，一站转写' },
  { primary: '纪要', secondary: 'AI 自动提炼要点与待办' },
  { primary: '导出', secondary: 'Word / PDF 多格式一键出稿' },
] as const

/** 语音产品覆盖场景（官网产品区，无插画 demo） */
export const VOICE_SCENES = [
  {
    id: 'meeting',
    step: '01',
    title: '会议办公',
    desc: '多人讨论实时转写，AI 自动提炼要点与待办，会后一键导出纪要',
    icon: 'meeting' as const,
    image: '/images/website/scenes/meeting.png',
    accent: 'blue' as const,
  },
  {
    id: 'interview',
    step: '02',
    title: '采访调研',
    desc: '现场边录边转，关键信息不遗漏，回去直接整理成稿',
    icon: 'interview' as const,
    image: '/images/website/scenes/interview.png',
    accent: 'violet' as const,
  },
  {
    id: 'classroom',
    step: '03',
    title: '课堂学习',
    desc: '外语课堂实时翻译转写，复习时像看字幕一样清晰',
    icon: 'classroom' as const,
    image: '/images/website/scenes/classroom.png',
    accent: 'teal' as const,
  },
] as const

export const VOICE_CAPABILITIES = [
  '实时录音 · 边录边出稿',
  '导入音视频 · 智能语篇规整',
  '说话人角色区分',
  'AI 会议纪要 · 待办自动提取',
  '多语种识别 · 专业领域优化',
  'Word / PDF 多格式导出',
] as const

/** 企业 Logo 墙（虚构品牌名 + image2 生成抽象 Logo） */
export const ENTERPRISE_LOGOS = [
  { name: '声澜科技', logo: WEBSITE_IMAGES.logos[0] },
  { name: '智联云图', logo: WEBSITE_IMAGES.logos[1] },
  { name: '远信资本', logo: WEBSITE_IMAGES.logos[2] },
  { name: '环宇物流', logo: WEBSITE_IMAGES.logos[3] },
  { name: '知学教育', logo: WEBSITE_IMAGES.logos[4] },
  { name: '新视传媒', logo: WEBSITE_IMAGES.logos[5] },
  { name: '康维医疗', logo: WEBSITE_IMAGES.logos[6] },
  { name: '优选零售', logo: WEBSITE_IMAGES.logos[7] },
  { name: '绿能动力', logo: WEBSITE_IMAGES.logos[8] },
  { name: '云栈数据', logo: WEBSITE_IMAGES.logos[9] },
] as const

export const PRODUCTS = [
  {
    id: 'voice',
    name: '智能语音',
    subtitle: '你的 AI 语音记录助手',
    bullets: ['实时录音转文字，边录边出稿', '导入音视频，智能语篇规整', 'AI 自动生成会议纪要'],
    visual: 'voice' as const,
    previewImage: WEBSITE_IMAGES.products.voice,
    link: ROUTES.chat,
  },
  {
    id: 'chat',
    name: '智能对话',
    subtitle: 'AI 写作，让你更会写',
    bullets: ['基于大模型，场景化内容生成', '多轮上下文，代码写作翻译', '导入素材，智能解析文档'],
    visual: 'chat' as const,
    previewImage: WEBSITE_IMAGES.products.chat,
    link: ROUTES.chat,
  },
  {
    id: 'image',
    name: '图像生成',
    subtitle: '文字即画面，创意无边界',
    bullets: ['文字描述生成高质量图像', '多种风格与尺寸可选', '创意灵感一键拓展'],
    visual: 'image' as const,
    previewImage: WEBSITE_IMAGES.products.image,
    link: ROUTES.explore,
  },
  {
    id: 'doc',
    name: '文档助手',
    subtitle: '长文秒懂，效率倍增',
    bullets: ['智能摘要、翻译与改写', '文档格式精准还原', '批量处理，高效交付'],
    visual: 'doc' as const,
    previewImage: WEBSITE_IMAGES.products.doc,
    link: ROUTES.chat,
  },
]

export type ExplorerVisualType =
  | 'voice'
  | 'chat'
  | 'image'
  | 'doc'
  | 'chat-panel'

/** 企业方案卖点 */
export const ENTERPRISE_HIGHLIGHTS = [
  { id: 'share', title: '员工共享', desc: '团队账号统一开通' },
  { id: 'custom', title: '专属定制', desc: '商务经理全程对接' },
  { id: 'price', title: '转写优惠', desc: '企业批量更低价' },
  { id: 'security', title: '数据安全', desc: '私有化部署可选' },
] as const

/** 官网统一场景探索器：左侧导航 + 右侧大面板（滚动驱动） */
export const EXPLORER_SCENARIOS = [
  {
    id: 'voice',
    nav: '智能语音',
    tag: '核心产品',
    title: '你的 AI 语音记录助手',
    desc: '会议、采访、课堂——同一条语音链路，从录音到纪要全自动。',
    bullets: [
      '实时录音转文字，边录边出稿',
      '导入音视频，智能语篇规整',
      'AI 自动生成会议纪要',
      '说话人区分 · 多语种识别',
    ],
    visual: 'voice' as const,
    link: ROUTES.chat,
    cta: '立即体验',
  },
  {
    id: 'chat',
    nav: '智能对话',
    tag: '核心产品',
    title: 'AI 写作，让你更会写',
    desc: '基于大模型的场景化内容生成，多轮上下文理解你的意图。',
    bullets: [
      '场景化内容生成与润色',
      '多轮上下文，代码写作翻译',
      '导入素材，智能解析文档',
    ],
    visual: 'chat-panel' as const,
    link: ROUTES.chat,
    cta: '开始对话',
  },
  {
    id: 'image',
    nav: '图像生成',
    tag: '核心产品',
    title: '文字即画面，创意无边界',
    desc: '用自然语言描述画面，快速生成高质量视觉素材。',
    bullets: [
      '文字描述生成高质量图像',
      '多种风格与尺寸可选',
      '创意灵感一键拓展',
    ],
    visual: 'image' as const,
    link: ROUTES.explore,
    cta: '去创作',
  },
  {
    id: 'doc',
    nav: '文档助手',
    tag: '核心产品',
    title: '长文秒懂，效率倍增',
    desc: '摘要、翻译、改写与格式还原，批量处理更高效。',
    bullets: [
      '智能摘要、翻译与改写',
      '文档格式精准还原',
      '批量处理，高效交付',
    ],
    visual: 'doc' as const,
    link: ROUTES.chat,
    cta: '处理文档',
  },
  {
    id: 'meeting',
    nav: '智能会议',
    tag: '解决方案',
    title: '听见智能会议',
    desc: '本地化部署，智能安全，覆盖会前签到到会后归档全流程。',
    bullets: [
      '会前签到 · 实时转写 · 会后归档',
      '支持本地化部署',
      '多人会议智能降噪',
    ],
    visual: 'voice' as const,
    link: ROUTES.app,
    cta: '了解详情',
  },
  {
    id: 'translate',
    nav: '文档翻译',
    tag: '解决方案',
    title: '专业文档翻译',
    desc: '文档翻译格式高度还原，支持多语种专业文稿处理。',
    bullets: [
      '版式高度还原',
      '多语种专业文稿',
      '批量处理更高效',
    ],
    visual: 'doc' as const,
    link: ROUTES.chat,
    cta: '了解详情',
  },
  {
    id: 'custom',
    nav: '行业定制',
    tag: '解决方案',
    title: '行业定制方案',
    desc: '强大丰富的定制化服务，专属商务经理全程对接。',
    bullets: [
      '专属商务经理对接',
      '私有化部署可选',
      '按行业定制工作流',
    ],
    visual: 'chat' as const,
    link: ROUTES.app,
    cta: '了解详情',
  },
  {
    id: 'enterprise',
    nav: '企业服务',
    tag: '团队方案',
    title: '企业级解决方案',
    desc: '员工共享、专属定制、批量优惠与数据安全，一套方案覆盖团队协作全流程。',
    bullets: ENTERPRISE_HIGHLIGHTS.map((h) => `${h.title} — ${h.desc}`),
    visual: 'chat-panel' as const,
    link: ROUTES.app,
    cta: '获取企业方案',
    enterprise: true,
  },
] as const

export const MORE_SERVICES = [
  {
    id: 'meeting',
    title: '听见智能会议',
    tag: '会议办公',
    desc: '本地化部署，智能安全，覆盖会前签到到会后归档全流程',
    icon: 'meeting' as const,
    link: ROUTES.app,
  },
  {
    id: 'translate',
    title: '文档翻译',
    tag: '格式还原',
    desc: '文档翻译格式高度还原，支持多语种专业文稿处理',
    icon: 'translate' as const,
    link: ROUTES.chat,
  },
  {
    id: 'enterprise',
    title: '行业定制方案',
    tag: '企业定制',
    desc: '强大丰富的定制化服务，专属商务经理全程对接',
    icon: 'enterprise' as const,
    link: ROUTES.app,
  },
] as const

export const USER_STORIES = [
  {
    id: 'lina',
    name: '李娜',
    role: '记者编辑',
    tag: '新闻现场',
    avatar: '/images/website/stories/lina.png',
    quote:
      '采访现场节奏太快，以前总怕漏掉关键一句。现在边录边转写，回去直接出稿，准确率让我非常安心。',
  },
  {
    id: 'wuxiu',
    name: '吴秀英',
    role: '证券研究员',
    tag: '路演会议',
    avatar: '/images/website/stories/wuxiu.png',
    quote:
      '路演一边听一边转写，AI 自动提炼要点和会议总结。中途接电话回来，重要信息也不会丢。',
  },
  {
    id: 'jack',
    name: 'Jack',
    role: '大学老师',
    tag: '学术论坛',
    avatar: '/images/website/stories/jack.png',
    quote:
      '论坛讨论观点零散，用 App 录下来再转文字，整理课件和论文素材效率翻倍。',
  },
  {
    id: 'chenjing',
    name: '陈静',
    role: '自媒体运营',
    tag: '内容创作',
    avatar: '/images/website/stories/chenjing.png',
    quote:
      '从选题到初稿，AI 帮我完成大部分脑力活。我只做最后润色，更新频率稳定了很多。',
  },
  {
    id: 'huanghan',
    name: '黄涵',
    role: '留学生',
    tag: '课堂学习',
    avatar: '/images/website/stories/huanghan.png',
    quote:
      '外语课堂听不懂的日子结束了。实时翻译加转写，复习时像看字幕一样清晰。',
  },
  {
    id: 'lisa',
    name: 'Lisa',
    role: '行业咨询顾问',
    tag: '咨询调研',
    avatar: '/images/website/stories/lisa.png',
    quote:
      '访谈全靠笔头记事费时低效。现在用手机录音转写，准确率很高，星火还能自动提炼关键信息。',
  },
  {
    id: 'chenyu',
    name: '陈宇',
    role: '健身教练',
    tag: '课程营销',
    avatar: '/images/website/stories/chenyu.png',
    quote:
      '面授课结束后用语音转写加语篇规整，口语变书面语，阅读效率提高，课程营销效果更好。',
  },
  {
    id: 'tujie',
    name: '涂姐',
    role: '退休听障用户',
    tag: '文学创作',
    avatar: '/images/website/stories/tujie.png',
    quote:
      '讯飞是我的耳朵和笔。它倾听我的心声，帮我在文字海洋里自在遨游，创作不再受阻。',
  },
] as const

export const STORY_STATS_PRIMARY = [
  { value: '500万+', label: '用户累计转写' },
  { value: '98%', label: '转写准确率' },
  { value: '5分钟', label: '1小时音频出稿' },
] as const

export const STORY_STATS_EXTRA = [
  { value: '37+', label: '支持语种' },
  { value: '200万+', label: '月活跃用户' },
  { value: '10万+', label: '企业团队在用' },
] as const

export const STORY_SCENE_TAGS = [
  '新闻采访',
  '路演会议',
  '学术论坛',
  '内容创作',
  '课堂学习',
  '企业培训',
  '法律取证',
  '咨询调研',
] as const
