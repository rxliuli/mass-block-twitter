// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {}

declare module '*.md?html' {
  declare const html: string
  export default html
}
declare module '*.md?svelte' {
  import type { Component } from 'svelte'
  declare const svelte: Component
  export default svelte
}
declare module '*.md?meta' {
  declare const meta: {
    title: string
    formatter: Record<string, string>
  }
  export default meta
}
