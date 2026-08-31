/** 讯飞 RTASR PCM 帧：16kHz × 16bit × 40ms = 1280 字节 */
export const RTASR_FRAME_BYTES = 1280
export const RTASR_FRAME_MS = 40

/** 单 WS 会话上限 8h（讯飞 37007） */
export const RTASR_CHUNK_MAX_MS = 8 * 60 * 60 * 1000

/** 7h45m 预续录 */
export const RTASR_RENEW_AT_MS = 7 * 60 * 60 * 1000 + 45 * 60 * 1000

/** 暂停超过 10s 重连 WS（本地采集侧） */
export const RTASR_PAUSE_RECONNECT_MS = 10_000

/**
 * 重连调度（对齐小班白板）：
 * 进入重连 → 等 3s → 每轮最多拉票 4 次（间隔 5s）→ 单次建连超时 10s
 * → 轮间再等 3s → 直到成功或整段 600s
 */
/** 进入重连后首次拉票前等待 */
export const RTASR_RECONNECT_INITIAL_DELAY_MS = 3_000
/** 同一轮内两次拉票间隔 */
export const RTASR_RECONNECT_TICKET_INTERVAL_MS = 5_000
/** 每轮拉票上限 */
export const RTASR_RECONNECT_TICKETS_PER_ROUND = 4
/** 轮与轮之间等待（上一轮第 4 次之后） */
export const RTASR_RECONNECT_ROUND_GAP_MS = 3_000
/** 单次 WS 建连超时 */
export const RTASR_RECONNECT_WS_TIMEOUT_MS = 10_000
/** 整段重连最长窗口（后端需至少等这么久） */
export const RTASR_RECONNECT_GIVE_UP_MS = 600_000

/** @deprecated 使用白板调度；保留别名避免旧引用炸掉 */
export const RTASR_RECONNECT_BASE_DELAY_MS = RTASR_RECONNECT_TICKET_INTERVAL_MS
export const RTASR_RECONNECT_MAX_ATTEMPTS = 999

/** 检查点同步间隔（服务端） */
export const RTASR_CHECKPOINT_INTERVAL_MS = 3_000

/** 保存失败时内存重试上限（不落本地盘） */
export const RTASR_SAVE_RETRY_MAX_ATTEMPTS = 8

/** 保存失败重试退避基数 */
export const RTASR_SAVE_RETRY_BASE_DELAY_MS = 2_000
