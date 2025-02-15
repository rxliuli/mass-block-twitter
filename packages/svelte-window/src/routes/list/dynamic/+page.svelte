<script>
  import { List } from '$lib'
  import { faker } from '@faker-js/faker'

  const data = $state(
    Array.from({ length: 100000 }, () => ({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      height: faker.number.int({ min: 20, max: 100 }),
    })),
  )
</script>

<List {data} itemKey="id" itemHeight={20} height={400} dynamic>
  {#snippet child(item)}
    <div class="flex items-center gap-2" style="height: {item.height}px">
      <div class="text-sm font-medium">{item.name}</div>
    </div>
  {/snippet}
</List>
