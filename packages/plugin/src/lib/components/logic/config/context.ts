import { getContext, hasContext, setContext } from 'svelte'

function createContext<T>(name: string) {
  return {
    exists: () => hasContext(name),
    get: () => getContext<T>(name),
    getOr: <TFallback>(fallback: TFallback) => getContext<T>(name) ?? fallback,
    set: (context: T) => setContext(name, context),
  }
}

export const shadcnConfig = createContext<{
  portal?: HTMLElement
}>('ShadcnConfig')
