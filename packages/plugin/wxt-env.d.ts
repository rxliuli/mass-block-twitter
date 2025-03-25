/// <reference types="svelte" />
/// <reference types="@vitest/browser/matchers" />
/// <reference types="@vitest/browser/providers/playwright" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_INITIAL_PATH?: string
  }
}

declare module '@vitest/browser/context' {
  interface Locator {
    element(): HTMLElement
  }
}

export {}
