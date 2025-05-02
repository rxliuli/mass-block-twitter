<script lang="ts">
  import { xClientTransaction } from '$lib/api'
  import {
    searchPeople,
    getBlockedUsers,
    blockUser,
    unblockUser,
    getCommunityMembers,
    getCommunityInfo,
    getUserFollowers,
    getUserFollowing,
    getUserBlueVerifiedFollowers,
    getUserByScreenName,
  } from '$lib/api/twitter'
  import { Button } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'
  import { Loader2, ChevronDown } from 'lucide-svelte'
  import { cn } from '$lib/utils'

  interface Task {
    name: string
    fn: () => Promise<any>
    status: 'idle' | 'running' | 'success' | 'error'
    collapsibled: boolean
    result?: any
    error?: Error
  }

  const _tasks: Pick<Task, 'name' | 'fn'>[] = [
    {
      name: 'getXTransactionId',
      fn: () =>
        xClientTransaction.generateTransactionId(
          'POST',
          'https://x.com/i/api/1.1/blocks/create.json',
        ),
    },
    {
      name: 'getBlockedUsers',
      fn: () => getBlockedUsers({ count: 10 }),
    },
    {
      name: 'blockUser',
      fn: () => blockUser({ id: '25073877' }),
    },
    {
      name: 'unblockUser',
      fn: () => unblockUser('25073877'),
    },
    {
      name: 'searchPeople',
      fn: () =>
        searchPeople({
          term: 'trump',
          count: 10,
        }),
    },
    {
      name: 'getCommunityInfo',
      fn: () => getCommunityInfo({ communityId: '1900366536683987325' }),
    },
    {
      name: 'getCommunityMembers',
      fn: () => getCommunityMembers({ communityId: '1900366536683987325' }),
    },
    {
      name: 'getUserBlueVerifiedFollowers',
      fn: () => getUserBlueVerifiedFollowers({ userId: '736267842681602048' }),
    },
    {
      name: 'getUserFollowers',
      fn: () => getUserFollowers({ userId: '736267842681602048' }),
    },
    {
      name: 'getUserFollowing',
      fn: () => getUserFollowing({ userId: '736267842681602048' }),
    },
    {
      name: 'getUserByScreenName',
      fn: () => getUserByScreenName('rxliuli'),
    },
  ]

  const tasks: Task[] = $state(
    _tasks.map((task) => ({ ...task, status: 'idle', collapsibled: true })),
  )

  let isRunning = $state(false)
  let currentTaskIndex = $state(0)

  async function runAllTasks() {
    isRunning = true
    currentTaskIndex = 0

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      currentTaskIndex = i
      task.status = 'running'

      try {
        task.result = await task.fn()
        task.status = 'success'
      } catch (error) {
        task.error = error as Error
        task.status = 'error'
      }
    }

    isRunning = false
  }
  onMount(runAllTasks)

  function getStatusColor(status: Task['status']) {
    switch (status) {
      case 'idle':
        return cn('bg-gray-500 hover:bg-gray-600')
      case 'running':
        return cn('bg-blue-500 hover:bg-blue-600')
      case 'success':
        return cn('bg-green-500 hover:bg-green-600')
      case 'error':
        return cn('bg-red-500 hover:bg-red-600')
    }
  }

  function getStatusText(status: Task['status']) {
    switch (status) {
      case 'idle':
        return 'Not Started'
      case 'running':
        return 'Running'
      case 'success':
        return 'Success'
      case 'error':
        return 'Failed'
    }
  }
</script>

<div class="container mx-auto p-4 space-y-4">
  <div class="flex items-center justify-end">
    <Button
      onclick={runAllTasks}
      disabled={isRunning}
      class="flex items-center gap-2"
      variant="secondary"
    >
      {#if isRunning}
        <Loader2 class="w-4 h-4 animate-spin" />
        Running...
      {:else}
        Run All Tasks
      {/if}
    </Button>
  </div>

  <div class="space-y-2">
    {#each tasks as task, index}
      <div class="border rounded-lg p-2">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium flex-1">
            {index + 1}. {task.name}
          </span>
          <Badge class={getStatusColor(task.status)}>
            {getStatusText(task.status)}
          </Badge>
          {#if task.status === 'success'}
            <button
              class="p-1 hover:bg-gray-100 rounded-full"
              onclick={() => (task.collapsibled = !task.collapsibled)}
            >
              <ChevronDown class="w-4 h-4 text-gray-500" />
            </button>
          {/if}
        </div>

        {#if task.status === 'success' && !task.collapsibled}
          <div class="mt-2 bg-gray-50 rounded p-2 overflow-x-auto">
            <pre class="text-sm">{JSON.stringify(task.result, null, 2)}</pre>
          </div>
        {:else if task.status === 'error'}
          <div class="text-sm text-red-500 mt-2">
            {task.error?.message || 'Unknown error'}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
