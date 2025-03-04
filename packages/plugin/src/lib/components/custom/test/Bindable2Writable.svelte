<script lang="ts" generics="T extends Component">
  import type { Component } from 'svelte'

  let {
    component,
    ...props
  }: {
    component: Component<any>
  } & Record<string, any> = $props()

  const bindableProps = $derived(
    Object.entries(props).reduce(
      (acc, [key, value]) => {
        if (
          value &&
          typeof value === 'object' &&
          'subscribe' in value &&
          'set' in value &&
          'update' in value
        ) {
          // TODO how to bind the value from writable?
          acc[`bind:${key}`] = value
        } else {
          acc[key] = value
        }
        return acc
      },
      {} as Record<string, any>,
    ),
  )
</script>

<svelte:component this={component} {...bindableProps} />
