import { expect, it } from 'vitest'
import SvelteQueryTest from './SvelteQuery.test.svelte'
import { render } from 'vitest-browser-svelte'
import { PageTest } from '$lib/components/test'
import { tick } from 'svelte'

it('should work', async () => {
  const screen = render(PageTest, {
    props: {
      component: SvelteQueryTest,
    },
  })
  await tick()
  await expect.element(screen.getByText('[]')).toBeInTheDocument()
})
