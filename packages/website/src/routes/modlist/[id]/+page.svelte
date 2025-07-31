<script lang="ts">
  import type { ModListGetResponse } from '@mass-block-twitter/server'
  import { Button } from '$lib/components/ui/button'
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card'
  import { Badge } from '$lib/components/ui/badge'
  import { Users, Shield, ExternalLink } from 'lucide-svelte'
  import { onMount } from 'svelte'
  import { showInstallToast } from '@/showToast'

  const props: {
    data?: {
      modList: ModListGetResponse
    }
  } = $props()

  const data = $derived(props.data?.modList)

  function openExtension() {
    if (!data) {
      return
    }
    const meta = document.querySelector('meta[name="mass-block-twitter"]')
    if (!meta) {
      showInstallToast()
      return
    }
    document.dispatchEvent(
      new CustomEvent('OpenExtensionPath', {
        detail: `/modlists/detail?id=${data.id}`,
      }),
    )
    location.href = 'https://x.com/home'
  }
</script>

<div class="container mx-auto py-8">
  {#if !data}
    <div class="text-center text-muted-foreground">
      <p>Modlist not found</p>
    </div>
  {:else}
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="text-2xl font-bold">{data.name}</CardTitle>
            <CardDescription class="mt-2">
              Created by @{data.twitterUser.screenName}
            </CardDescription>
          </div>
          <Button variant="outline" onclick={openExtension}>
            <ExternalLink class="mr-2 h-4 w-4" />
            Open in Extension
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {#if data.description}
          <p class="text-muted-foreground mb-6">{data.description}</p>
        {/if}

        <div class="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center">
                <Users class="mr-2 h-5 w-5" />
                Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-2xl font-bold">{data.userCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="flex items-center">
                <Shield class="mr-2 h-5 w-5" />
                Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-2xl font-bold">{data.ruleCount ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        <div class="mt-6">
          <h3 class="text-lg font-semibold mb-2">Visibility</h3>
          <Badge variant="outline">
            {data.visibility === 'public' ? 'Public' : 'Protected'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  {/if}
</div>
