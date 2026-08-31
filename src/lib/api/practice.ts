import { api } from '@/lib/api/client'

export type PracticeQuestionType = 'single' | 'multi' | 'short'
export type PracticeSetStatus = 'generating' | 'ready' | 'failed' | 'archived'
export type PracticeAttemptStatus = 'in_progress' | 'completed' | 'abandoned'
export type PracticeMistakeStatus = 'active' | 'mastered' | 'archived'
export type DailyTaskType = 'mistake_review' | 'finish_attempt' | 'optional_new_set'

export interface PracticeQuestion {
  id: string
  order: number
  type: PracticeQuestionType
  stem: string
  options?: string[]
  answer: string[]
  analysis?: string
  anchorMs?: number | null
  evidence?: string | null
}

export interface PracticeSetConfig {
  count: number
  types: PracticeQuestionType[]
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface PracticeAnswer {
  questionId: string
  response: string[]
  correct: boolean | null
  selfMark?: 'correct' | 'wrong' | null
}

export interface PracticeSetDto {
  id: string
  fileId: string
  title: string
  status: PracticeSetStatus
  config: PracticeSetConfig
  questions: PracticeQuestion[] | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface PracticeAttemptDto {
  id: string
  fileId: string
  practiceSetId: string
  status: PracticeAttemptStatus
  answers: PracticeAnswer[] | null
  score: number | null
  questions: PracticeQuestion[] | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PracticeMistakeDto {
  id: string
  fileId: string
  questionSnapshot: {
    stem: string
    type: PracticeQuestionType
    options?: string[]
    answer: string[]
    analysis?: string
    anchorMs?: number | null
  }
  sourceQuestionId: string | null
  sourceSetId: string | null
  wrongCount: number
  status: PracticeMistakeStatus
  dueAt: string
  lastWrongAt: string
  createdAt: string
}

export interface PracticeTodayDto {
  date: string
  doneCount: number
  totalRequired: number
  allDone: boolean
  tasks: Array<{
    taskKey: string
    type: DailyTaskType
    title: string
    required: boolean
    done: boolean
    payload: Record<string, unknown>
  }>
}

const base = (fileId: string) => `/files/${encodeURIComponent(fileId)}/practice`

export const practiceApi = {
  getToday: (fileId: string) =>
    api.get<PracticeTodayDto>(`${base(fileId)}/today`, { skipToast: true }),
  completeToday: (fileId: string, taskKey: string) =>
    api.post<PracticeTodayDto>(`${base(fileId)}/today/complete`, { taskKey }, { skipToast: true }),
  listSets: (fileId: string) =>
    api.get<PracticeSetDto[]>(`${base(fileId)}/sets`, { skipToast: true }),
  generateSet: (
    fileId: string,
    body?: Partial<Pick<PracticeSetConfig, 'count' | 'types' | 'difficulty'>>,
  ) => api.post<PracticeSetDto>(`${base(fileId)}/sets`, body ?? {}, { skipToast: true, timeout: 30_000 }),
  getSet: (fileId: string, setId: string) =>
    api.get<PracticeSetDto>(`${base(fileId)}/sets/${setId}`, { skipToast: true }),
  startAttempt: (fileId: string, setId: string) =>
    api.post<PracticeAttemptDto>(`${base(fileId)}/sets/${setId}/attempts`, {}, { skipToast: true }),
  getAttempt: (fileId: string, attemptId: string) =>
    api.get<PracticeAttemptDto>(`${base(fileId)}/attempts/${attemptId}`, { skipToast: true }),
  saveAttempt: (fileId: string, attemptId: string, answers: PracticeAnswer[]) =>
    api.patch<PracticeAttemptDto>(
      `${base(fileId)}/attempts/${attemptId}`,
      {
        answers: answers.map((a) => ({
          questionId: a.questionId,
          response: a.response,
          selfMark: a.selfMark ?? null,
        })),
      },
      { skipToast: true },
    ),
  submitAttempt: (fileId: string, attemptId: string) =>
    api.post<PracticeAttemptDto>(`${base(fileId)}/attempts/${attemptId}/submit`, {}, {
      skipToast: true,
    }),
  listMistakes: (fileId: string) =>
    api.get<PracticeMistakeDto[]>(`${base(fileId)}/mistakes`, { skipToast: true }),
  masterMistake: (fileId: string, mistakeId: string) =>
    api.post<PracticeMistakeDto>(`${base(fileId)}/mistakes/${mistakeId}/master`, {}, {
      skipToast: true,
    }),
}
