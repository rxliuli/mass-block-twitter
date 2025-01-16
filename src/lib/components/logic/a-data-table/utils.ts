import { Component } from "svelte";

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
