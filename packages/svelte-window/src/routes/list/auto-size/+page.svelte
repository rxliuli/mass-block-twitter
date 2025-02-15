<script>
  import { AutoSizer, List } from '$lib'
  import { faker } from '@faker-js/faker'

  const data = $state(
    Array.from({ length: 10000 }, () => ({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
    })),
  )
</script>

<AutoSizer>
  {#snippet child({ width, height })}
    <List
      {data}
      itemKey="id"
      itemHeight={20}
      {height}
      style={`width: ${width}px`}
    >
      {#snippet child(item)}
        <div class="flex items-center gap-2">
          <div class="text-sm font-medium">{item.name}</div>
          <div class="text-sm text-gray-500">{item.email}</div>
        </div>
      {/snippet}
    </List>
  {/snippet}
</AutoSizer>
