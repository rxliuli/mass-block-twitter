<script lang="ts">
  import { getLocalTimeZone, CalendarDate } from '@internationalized/date'
  import { cn } from '$lib/utils'
  import { buttonVariants } from '$lib/components/ui/button'
  import { Calendar } from '$lib/components/ui/calendar'
  import * as Popover from '$lib/components/ui/popover'
  import dayjs from 'dayjs'
  import { CalendarIcon } from 'lucide-svelte'
  import { shadcnConfig } from '$lib/components/logic/config'

  let {
    value = $bindable(),
    onChange,
  }: {
    value?: Date
    onChange?: (value: Date | undefined) => void
  } = $props()

  const localDate = $derived.by(() => {
    if (value) {
      return new CalendarDate(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
      )
    }
  })
  let open = $state(false)
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child()}
      <div
        class={cn(
          buttonVariants({ variant: 'outline' }),
          'group w-36 text-left font-normal flex items-center justify-between gap-2 px-2',
          !value && 'text-muted-foreground',
        )}
      >
        <span>{value ? dayjs(value).format('YYYY-MM-DD') : 'Pick a date'}</span>
        <CalendarIcon class="w-4 h-4" />
      </div>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0" align="start">
    <Calendar
      type="single"
      value={localDate}
      onValueChange={(v) => {
        value = v ? v.toDate(getLocalTimeZone()) : undefined
        onChange?.(value)
        open = false
      }}
    />
  </Popover.Content>
</Popover.Root>
