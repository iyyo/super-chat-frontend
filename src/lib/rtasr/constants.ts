/** 讯飞 RTASR PCM 帧：16kHz × 16bit × 40ms = 1280 字节 */
export const RTASR_FRAME_BYTES = 1280
export const RTASR_FRAME_MS = 40

/** 单 WS 会话上限 8h（讯飞 37007） */
export const RTASR_CHUNK_MAX_MS = 8 * 60 * 60 * 1000

/** 7h45m 预续录 */
export const RTASR_RENEW_AT_MS = 7 * 60 * 60 * 1000 + 45 * 60 * 1000

/** 暂停超过 10s 重连 WS */
export const RTASR_PAUSE_RECONNECT_MS = 10_000

export const RECORDING_RECOVERY_KEY = 'iyy-recording-recovery'

/** 恢复快照最长有效 24h */
export const RECORDING_RECOVERY_MAX_AGE_MS = 24 * 60 * 60 * 1000
