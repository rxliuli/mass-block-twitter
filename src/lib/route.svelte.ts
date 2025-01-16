import { type Component } from 'svelte'

interface Route {
  path: string
  component: Component
}

export const router = $state<{
  path: string
  routes: Route[]
}>({
  path: '/',
  routes: [],
})
