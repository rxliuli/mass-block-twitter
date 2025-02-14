<script lang="ts">
  import { navigate, RouterLink } from '$lib/components/logic/router'
  import * as Avatar from '$lib/components/ui/avatar'
  import { SERVER_URL } from '$lib/constants'
  import { createQuery } from '@tanstack/svelte-query'
  import type { ModList } from 'packages/mass-block-twitter-server/src/lib'
  import { fakerZH_CN as faker } from '@faker-js/faker'
  import { Card } from '$lib/components/ui/card'
  import { QueryError, QueryLoading } from '$lib/components/logic/query'
  import Button from '$lib/components/ui/button/button.svelte'
  import ModLists from './components/ModLists.svelte'
  import ModListEdit from './components/ModListEdit.svelte'

  const query = createQuery({
    queryKey: ['modlists'],
    queryFn: async () => {
      return Array.from({ length: 100 }, () => ({
        id: faker.string.uuid(),
        name: faker.lorem.words(5),
        description: faker.lorem.paragraph(),
        avatar: faker.image.url(),
        userCount: faker.number.int({ min: 100, max: 1000 }),
        subscriptionCount: faker.number.int({ min: 100, max: 1000 }),
        localUserId: faker.string.uuid(),
        twitterUserId: faker.string.uuid(),
        createdAt: faker.date.recent(),
        updatedAt: faker.date.recent(),
      })) satisfies ModList[]
      // const res = await fetch(`${SERVER_URL}/api/modlists/search`)
      // return (await res.json()) as {
      //   code: string
      //   data: ModList[]
      // }
    },
  })

  function onGotoDetail(id: string) {
    navigate(`/modlists/detail?id=${id}`)
  }

</script>

<header>
  <nav class="flex gap-2">
    <RouterLink href="/modlists/created">
      <Button variant="secondary">Created</Button>
    </RouterLink>
    <RouterLink href="/modlists/subscribe">
      <Button variant="secondary">Subscribed</Button>
    </RouterLink>
  </nav>
</header>

<ModLists query={$query} />

