import { blockUser } from '@/lib/api'
import Editor from '@/lib/Editor.svelte'
import { store } from '@/lib/store.svelte'
import { mount } from 'svelte'

function createEditor(users: string[]) {
  if (document.getElementById('mass-block-editor')) {
    return
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
    props: {
      users,
    },
  })
  store.value = users.join('\n')
  document.body.appendChild(container)
}

export default defineUnlistedScript(async () => {
  const users = [...document.querySelectorAll('span')]
    .map((it) => it?.textContent)
    .filter((it) => it?.startsWith('@'))
    .map((it) => it!.slice(1)) as string[]
  createEditor(users)
})
