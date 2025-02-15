<script lang="ts" generics="T extends any[]">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes, UIEventHandler } from 'svelte/elements'
  import { getVirtualizedRange } from './virtual'

  let {
    data,
    itemKey,
    itemHeight,
    height,
    grid,
    child,
    ...props
  }: {
    data: T
    itemKey: keyof T[number]
    height: number
    itemHeight: number
    grid?: {
      column: number
      gutter?: number | string
    }
    child: Snippet<[T[number]]>
  } & HTMLAttributes<HTMLElement> = $props()

  let scrollTop = $state(0)
  const rangeData = $derived.by(() => {
    const viewportHeight = height
    const count = data.length
    const r = getVirtualizedRange({
      itemHeight,
      count,
      viewportHeight,
      top: scrollTop,
      columns: grid?.column,
    })
    return {
      ...r,
      data: data.slice(r.start, r.end),
    }
  })

  const handleScroll: UIEventHandler<HTMLElement> = (event) => {
    const target = event.target as HTMLElement
    const top = target.scrollTop
    requestAnimationFrame(() => {
      scrollTop = top
    })
    props.onscroll?.(event)
  }

  const style = $derived.by(() => {
    const container = ['overflow-y: auto', `height: ${height}px`]
    if (grid) {
      container.push(
        `display: grid;`,
        `grid-template-columns: repeat(${grid?.column ?? 1}, minmax(0, 1fr));`,
      )
      if (typeof grid.gutter === 'number') {
        container.push(`column-gap: ${grid.gutter}px;`)
      } else if (typeof grid.gutter === 'string') {
        container.push(`column-gap: ${grid.gutter};`)
      }
    }
    return {
      container: container.join(';'),
      paddingTop: [
        'grid-column: 1 / -1',
        `height: ${rangeData.paddingTop}px`,
      ].join(';'),
      paddingBottom: [
        'grid-column: 1 / -1',
        `height: ${rangeData.paddingBottom}px`,
      ].join(';'),
    }
  })
</script>

<div
  {...props}
  onscroll={handleScroll}
  class={props.class}
  style={style.container}
>
  <div style={style.paddingTop}></div>
  {#each rangeData.data as item (item[itemKey])}
    <div style="height: {itemHeight}px">
      {@render child(item)}
    </div>
  {/each}
  <div style={style.paddingBottom} class="col-span-full"></div>
</div>
