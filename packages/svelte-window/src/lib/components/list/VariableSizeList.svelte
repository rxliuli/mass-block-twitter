<script lang="ts" generics="T extends any[]">
  import { type Snippet } from 'svelte'
  import type { HTMLAttributes, UIEventHandler } from 'svelte/elements'
  import { getVirtualizedRange } from '../../utils/virtual'

  let {
    data,
    itemKey,
    itemHeight,
    height,
    grid,
    child,
    dynamic,
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
    dynamic?: boolean
  } & HTMLAttributes<HTMLElement> = $props()

  let scrollTop = $state(0)
  let containerRef = $state<HTMLElement>()
  let _measuredHeights = $state<Record<number, number>>({})
  $effect(() => {
    if (!containerRef || !dynamic) {
      return
    }
    function onRectItems() {
      if (!containerRef) {
        return
      }
      const items = containerRef.childNodes
      items.forEach((it) => {
        const el = it as HTMLElement
        const height = el.getBoundingClientRect
          ? el.getBoundingClientRect().height
          : el.scrollHeight
        if (!el.dataset) {
          return
        }
        const globalIndex = Number.parseInt(el.dataset.globalIndex ?? '')
        if (Number.isInteger(globalIndex)) {
          _measuredHeights[globalIndex] = height
        }
      })
    }
    const observer = new MutationObserver(() =>
      requestAnimationFrame(onRectItems),
    )
    requestAnimationFrame(onRectItems)
    observer.observe(containerRef, {
      childList: true,
      subtree: true,
    })
    return () => observer.disconnect()
  })
  const getItemHeight = (index: number) => {
    if (!dynamic) {
      return itemHeight
    }
    return _measuredHeights[index] ?? itemHeight
  }
  const rangeData = $derived.by(() => {
    const viewportHeight = height
    const count = data.length
    const r = getVirtualizedRange({
      itemHeight: getItemHeight,
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

  const onScroll: UIEventHandler<HTMLElement> = (event) => {
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
  onscroll={onScroll}
  class={props.class}
  style={style.container}
  bind:this={containerRef}
>
  <div style={style.paddingTop}></div>
  {#each rangeData.data as item, index (item[itemKey])}
    <div
      style={!dynamic ? `height: ${getItemHeight(index)}px` : ''}
      data-global-index={rangeData.start + index}
    >
      {@render child(item)}
    </div>
  {/each}
  <div style={style.paddingBottom} class="col-span-full"></div>
</div>
