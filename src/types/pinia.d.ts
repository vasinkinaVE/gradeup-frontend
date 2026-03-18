// src/types/pinia.d.ts
import 'pinia'

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: {
      key?: string
      paths?: Array<keyof S>
      storage?: Storage
      beforeRestore?: (context: { store: Store }) => void
      afterRestore?: (context: { store: Store }) => void
      debug?: boolean
    }
  }
}

export {}
