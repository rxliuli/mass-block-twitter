import { render } from 'vitest-browser-svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ModListCreator from '../ModListCreator.svelte'
import { PageTest } from '$lib/components/test'
import { useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
import { tick } from 'svelte'
import { dbApi } from '$lib/db'
import {
  ModListCreateRequest,
  ModListGetCreatedResponse,
} from '@mass-block-twitter/server'
import { router } from '$lib/components/logic/router'

describe('ModListCreator', () => {
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (new URL(input.toString()).pathname === '/api/modlists/created') {
        return new Response(
          JSON.stringify([] satisfies ModListGetCreatedResponse),
        )
      }
      throw new Error()
    })
  })
  it('should render', async () => {
    const screen = render(PageTest, {
      component: ModListCreator,
    })
    const modCreatorBtn = screen.getByTestId('modlist-creator')
    await expect.element(modCreatorBtn).toBeInTheDocument()
    expect((modCreatorBtn.element() as HTMLButtonElement).disabled).true
    const authInfo = useAuthInfo()
    authInfo.value = {
      email: 'test@test.com',
      id: '1',
      isPro: false,
      token: '123',
    }
    await tick()
    expect((modCreatorBtn.element() as HTMLButtonElement).disabled).false
    authInfo.value = null
    await tick()
    expect((modCreatorBtn.element() as HTMLButtonElement).disabled).true
  })
  async function openModal() {
    const screen = render(PageTest, {
      props: {
        component: ModListCreator,
      },
    })
    const authInfo = useAuthInfo()
    await tick()
    authInfo.value = {
      email: 'test@test.com',
      id: '1',
      isPro: false,
      token: '123',
    }
    await tick()
    const modCreatorBtn = screen.getByTestId('modlist-creator')
    expect((modCreatorBtn.element() as HTMLButtonElement).disabled).false
    await modCreatorBtn.click()
    await tick()
    await expect
      .element(screen.getByText('New Moderation List'))
      .toBeInTheDocument()
    return screen
  }
  it('should open modal', openModal)
  describe('save modlist', () => {
    beforeEach(async () => {
      const div = document.createElement('div')
      div.innerText = `"id_str":"123"`
      document.body.appendChild(div)
      await dbApi.users.record([
        {
          id: '123',
          name: 'test',
          description: 'test',
          screen_name: 'test',
          blocking: false,
          updated_at: new Date().toISOString(),
        },
      ])
    })
    it('should save modlist', async () => {
      const screen = await openModal()
      const f = vi
        .spyOn(window, 'fetch')
        .mockImplementation(async (input, init) => {
          return new Response(JSON.stringify({ id: '1' }))
        })
      await screen.getByText('Save').click()
      expect(f).not.toHaveBeenCalled()
      await screen.getByLabelText('List Name').fill('test')
      await screen.getByText('Save').click()
      expect(f).toHaveBeenCalled()
      const body = JSON.parse(f.mock.calls[0][1]?.body as string)
      expect(body).toEqual({
        name: 'test',
        visibility: 'protected',
        twitterUser: (await dbApi.users.get('123'))!,
      } satisfies ModListCreateRequest)
      expect(router.path).toBe('/modlists/detail?id=1')
    })
    it('should save modlist error', async () => {
      const screen = await openModal()
      const f = vi
        .spyOn(window, 'fetch')
        .mockImplementation(async (input, init) => {
          return new Response(null, {
            status: 500,
          })
        })
      await screen.getByLabelText('List Name').fill('test')
      await screen.getByText('Save').click()
      await expect
        .element(screen.getByText('Failed to create modlist'))
        .toBeInTheDocument()
    })
    it('should modlist default visibility is protected and support modify', async () => {
      const screen = await openModal()
      const f = vi
        .spyOn(window, 'fetch')
        .mockImplementation(async (input, init) => {
          return new Response(JSON.stringify({ id: '1' }))
        })
      await screen.getByLabelText('List Name').fill('test')
      await screen.getByLabelText('Public').click()
      await screen.getByText('Save').click()
      expect(f).toHaveBeenCalled()
      const body = JSON.parse(f.mock.calls[0][1]?.body as string)
      expect(body).toEqual({
        name: 'test',
        visibility: 'public',
        twitterUser: (await dbApi.users.get('123'))!,
      } satisfies ModListCreateRequest)
    })
  })
})
