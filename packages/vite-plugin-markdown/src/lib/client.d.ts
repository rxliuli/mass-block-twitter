declare module '*.md?html' {
  declare const html: string
  export default html
}
declare module '*.md?svelte' {
  import type { Component } from 'svelte'
  declare const svelte: Component
  export default svelte
}
declare module '*.md?react' {
  import type { Component, ReactElement } from 'react'
  declare const react: ReactElement
  export default react
}
declare module '*.md?meta' {
  declare const meta: {
    title: string
    formatter: Record<string, string>
  }
  export default meta
}
