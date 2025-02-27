import { Component } from 'svelte'
import { RenderSnippetConfig } from './render-helpers'

export function isComponent(value: any): value is Component {
  return (
    typeof value === 'function' ||
    (typeof value === 'object' && 'component' in value && 'props' in value)
  )
}

export function isComponentConfig(
  value: any,
): value is { component: Component; props?: Record<string, any> } {
  return typeof value === 'object' && isComponent(value.component)
}

export function isSnippetConfig<TProps>(
  value: any,
): value is RenderSnippetConfig<TProps> {
  return value instanceof RenderSnippetConfig
}
