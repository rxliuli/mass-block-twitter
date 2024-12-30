<script lang="ts">
  import { difference } from 'lodash-es'
  import { blockUser, getUserRecords, UserRecord } from './api'
  import { store } from './store.svelte'

  let processMessage = $state('')

  async function onBlock() {
    const userRecords = getUserRecords()
    const list = store.value.startsWith('[')
      ? (JSON.parse(store.value) as UserRecord[]).map((it) => ({
          ...it,
          blocking: userRecords[it.screen_name].blocking,
        }))
      : store.value
          .split('\n')
          .map((it) => it.trim())
          .filter((it) => it.length > 0)
          .map((screen_name) => {
            const user = userRecords[screen_name]
            return {
              screen_name,
              id: user?.id,
              blocking: user?.blocking,
            } satisfies UserRecord
          })

    const success: string[] = []
    for (let i = 0; i < list.length; i++) {
      const user = list[i]
      processMessage = `[${i + 1}/${list.length}] blocking ${user.screen_name} ${user?.id}`
      if (user) {
        if (user.blocking) {
          success.push(user.screen_name)
          continue
        }
        try {
          await blockUser(user.id)
          success.push(user.screen_name)
        } catch {}
      }
    }
    store.value = difference(
      list.map((it) => it.screen_name),
      success,
    ).join('\n')
    processMessage = `${success.length} users blocked, ${list.length - success.length} failed`
    alert(
      `${success.length} users blocked, ${list.length - success.length} failed`,
    )
    location.reload()
  }

  function onClose() {
    document.getElementById('mass-block-editor')?.remove()
  }
</script>

<nav>
  <button onclick={onBlock}>Block</button>
  <button onclick={onClose}>Close</button>
</nav>
<p>{processMessage}</p>
<textarea bind:value={store.value} rows={10}></textarea>
