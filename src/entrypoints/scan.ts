import Editor from '@/lib/Editor.svelte'
import { store } from '@/lib/store.svelte'
import { uniq } from 'lodash-es'
import { mount, unmount } from 'svelte'

async function createEditor(users: string[]) {
  store.value = users.join('\n')
  if (document.getElementById('mass-block-editor')) {
    await unmount(Editor)
  }
  const container = document.createElement('div')
  container.id = 'mass-block-editor'
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '0'
  container.style.width = '100%'
  container.style.height = '100%'
  container.style.zIndex = '9999'
  mount(Editor, {
    target: container,
  })
  document.body.appendChild(container)
}

export default defineUnlistedScript(async () => {
  const users = uniq(
    [...document.querySelectorAll('span')]
      .map((it) => it?.textContent)
      .filter((it) => it?.startsWith('@'))
      .map((it) => it!.slice(1)) as string[],
  )
  await createEditor(users)
})
