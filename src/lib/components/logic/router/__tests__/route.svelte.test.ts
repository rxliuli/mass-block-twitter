import { router, useRoute, defineAsyncComponent } from '$lib/route.svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import HomeView from './components/HomeView.svelte'
import AboutView from './components/AboutView.svelte'

describe('useRoute', () => {
  beforeEach(() => {
    router.path = '/'
    router.routes = []
  })
  it('simple', () => {
    const route = useRoute()
    expect(route.path).toBe('/')
    router.path = '/home'
    router.routes = [
      {
        path: '/home',
        component: HomeView,
      },
      { path: '/about', component: AboutView },
    ]
    expect(route.path).toBe('/home')
    expect(route.matched).toBe(router.routes[0])
    router.path = '/about'
    expect(route.path).toBe('/about')
    expect(route.matched).toBe(router.routes[1])
  })
  it('async', () => {
    const route = useRoute()
    expect(route.path).toBe('/')
    router.path = '/home'
    router.routes = [
      { path: '/home', component: defineAsyncComponent(() => import('./components/HomeView.svelte')) },
      { path: '/about', component: defineAsyncComponent(() => import('./components/AboutView.svelte')) },
    ]
    expect(route.path).toBe('/home')
    expect(route.matched).toBe(router.routes[0])
    router.path = '/about'
    expect(route.path).toBe('/about')
    expect(route.matched).toBe(router.routes[1])
  })
})
