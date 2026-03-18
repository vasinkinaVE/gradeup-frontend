// src/types/index.ts
export type UserRole = 'employee' | 'manager' | 'spo' | 'admin'

// Роль в конкретной аттестации (временная)
export type AttestationRole = 'attestee' | 'attester' | 'observer'

export interface User {
  id: string
  lastName: string
  firstName: string
  middleName: string
  email: string
  role: UserRole
  position: string
  category: string
  department?: string
}

// Тема профиля (навык, который нужно подтвердить)
export interface ProfileTheme {
  id: string
  name: string
  description: string
  category: string
  confirmationType: 'attestation' | 'practical' | 'performance' | 'combined'
  stages: number
  closedStages: number
  progress: number // 0-100%
  literature: string[]
}

// Аттестация (встреча)
export interface Attestation {
  id: string
  topic: string
  date: string
  time: string
  location: string
  duration: number
  attesteeId: string // кто проходит
  attesterId: string // кто принимает
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed'
}

// Вопрос аттестации
export interface Question {
  id: string
  text: string
  answer: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
}
