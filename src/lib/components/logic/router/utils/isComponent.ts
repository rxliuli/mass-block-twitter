import type { Component } from 'svelte'

export function isComponent(value: any): value is Component {
  return (
    typeof value === 'function' &&
    'prototype' in value &&
    Reflect.ownKeys(value).find((it) => typeof it === 'symbol')?.description === 'filename'
  )
}
