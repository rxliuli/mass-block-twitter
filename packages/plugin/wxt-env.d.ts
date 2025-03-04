/// <reference types="svelte" />
/// <reference types="@vitest/browser/matchers" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_INITIAL_PATH?: string
  }
}

export {}
