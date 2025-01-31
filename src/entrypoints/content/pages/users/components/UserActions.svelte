<script lang="ts">
  import { dbApi, type User } from '$lib/db'
  import {
    DownloadIcon,
    ImportIcon,
    ShieldCheckIcon,
    ShieldBanIcon,
  } from 'lucide-svelte'
  import { Parser } from '@json2csv/plainjs'
  import saveAs from 'file-saver'
  import { toast } from 'svelte-sonner'
  import { fileSelector } from '$lib/util/fileSelector'
  import { parse } from 'csv-parse/browser/esm/sync'
  import { Button } from '$lib/components/ui/button'
  import { userMutation } from '$lib/query'
  import { Snippet } from 'svelte'
  import { groupBy } from 'lodash-es'

  const props: {
    selectedRows: User[]
    search: Snippet
    class?: string
  } = $props()

  const mutation = userMutation()

  function onExport() {
    const users = props.selectedRows
    const parser = new Parser({
      fields: ['id', 'screen_name', 'name', 'description', 'profile_image_url'],
    })
    const csv = parser.parse(users)
    saveAs(new Blob([csv]), `block_list_${new Date().toISOString()}.csv`)
    toast.success(`Exported ${users.length} users`, { duration: 5000 })
  }

  async function onImportBlockList() {
    const files = await fileSelector({
      accept: '.csv',
    })
    if (!files) return
    const csv = await files[0].text()
    const users = (
      parse(csv, {
        columns: [
          'id',
          'screen_name',
          'name',
          'description',
          'profile_image_url',
        ],
      }) as User[]
    ).slice(1)
    const allUsers = await dbApi.users.getAll()
    const allIds = new Set(
      allUsers.filter((it) => it.blocking).map((it) => it.id),
    )
    const newUsers = users.filter((it) => !allIds.has(it.id))
    await dbApi.users.record(
      newUsers.map(
        (it) =>
          ({
            ...it,
            blocking: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }) as User,
      ),
    )
    await $mutation.mutateAsync({ users: newUsers, action: 'block' })
    toast.info(
      `Imported ${newUsers.length} users, ignored ${users.length - newUsers.length} users`,
    )
  }

  function onBlock() {
    const users = props.selectedRows.filter((it) => !it.blocking)
    const grouped = groupBy(users, (it) => it.following)
    let blockList: User[] = users
    if (grouped.true.length > 0) {
      const confirmed = confirm(
        'You are trying to block following users, do you want to include them?',
      )
      if (!confirmed) {
        blockList = grouped.false ?? []
      }
    }
    $mutation.mutateAsync({ users: blockList, action: 'block' })
  }

  function onUnblock() {
    const users = props.selectedRows.filter((it) => it.blocking)
    $mutation.mutateAsync({ users, action: 'unblock' })
  }
</script>

<div class="flex gap-2 {props.class}">
  {@render props.search()}
  <Button
    variant={'outline'}
    size={'icon'}
    title="Block Selected"
    onclick={onBlock}
  >
    <ShieldBanIcon color={'red'} class="w-4 h-4" />
  </Button>
  <Button
    variant={'outline'}
    size={'icon'}
    title="Unblock Selected"
    onclick={onUnblock}
  >
    <ShieldCheckIcon color={'gray'} class="w-4 h-4" />
  </Button>
  <Button
    variant={'outline'}
    size={'icon'}
    title="Export Selected"
    onclick={onExport}
  >
    <DownloadIcon class="w-4 h-4" />
  </Button>
  <Button
    variant={'outline'}
    size={'icon'}
    title="Import Block List"
    onclick={onImportBlockList}
  >
    <ImportIcon class="w-4 h-4" />
  </Button>
</div>
