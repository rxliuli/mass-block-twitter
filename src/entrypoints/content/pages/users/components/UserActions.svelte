<script lang="ts">
  import TableExtraButton from '$lib/components/logic/TableExtraButton.svelte'
  import { dbApi, User } from '$lib/db'
  import {
    ShieldBan,
    DownloadIcon,
    ImportIcon,
    SettingsIcon,
  } from 'lucide-svelte'
  import { Parser } from '@json2csv/plainjs'
  import saveAs from 'file-saver'
  import { toast } from 'svelte-sonner'
  import { fileSelector } from '$lib/util/fileSelector'
  import { parse } from 'csv-parse/browser/esm/sync'
  import { Button } from '$lib/components/ui/button'
  import { router } from '$lib/components/logic/router/route.svelte'
  import { userMutation } from '$lib/query'
  import { Snippet } from 'svelte'

  const props: {
    selectedRows: User[]
    search: Snippet
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
    $mutation.mutateAsync({ users, action: 'block' })
  }

  function onUnblock() {
    const users = props.selectedRows.filter((it) => it.blocking)
    $mutation.mutateAsync({ users, action: 'unblock' })
  }
</script>

<div class="flex gap-2">
  {@render props.search()}
  <TableExtraButton onclick={onBlock} text="Block Selected">
    {#snippet icon()}
      <ShieldBan color={'red'} class="w-4 h-4" />
    {/snippet}
  </TableExtraButton>
  <TableExtraButton onclick={onUnblock} text="Unblock Selected">
    {#snippet icon()}
      <ShieldBan color={'gray'} class="w-4 h-4" />
    {/snippet}
  </TableExtraButton>
  <TableExtraButton onclick={onExport} text="Export Selected">
    {#snippet icon()}
      <DownloadIcon class="w-4 h-4" />
    {/snippet}
  </TableExtraButton>
  <TableExtraButton onclick={onImportBlockList} text="Import Block List">
    {#snippet icon()}
      <ImportIcon class="w-4 h-4" />
    {/snippet}
  </TableExtraButton>
  <Button
    variant="outline"
    size="icon"
    onclick={() => (router.path = '/settings')}
  >
    <SettingsIcon class="w-4 h-4" />
  </Button>
</div>
