<script>
  import { List } from '$lib'
  import AutoSizer from '$lib/AutoSizer.svelte'
  import { faker } from '@faker-js/faker'

  const data = $state(
    Array.from({ length: 10000 }, () => ({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
    })),
  )
</script>

<div class="h-[400px]">
  <AutoSizer>
    {#snippet child({ width, height })}
      <List
        {data}
        itemKey="id"
        itemHeight={20}
        grid={{
          column: width > 768 ? 3 : width > 576 ? 2 : 1,
          gutter: 10,
        }}
        {height}
      >
        {#snippet child(item)}
          <div class="bg-red-100">
            <div class="text-sm font-medium">{item.name}</div>
          </div>
        {/snippet}
      </List>
    {/snippet}
  </AutoSizer>
</div>
