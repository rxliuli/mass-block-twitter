<!-- ref: https://github.com/bvaughn/react-virtualized-auto-sizer -->
<script lang="ts">
  import { onMount, type Snippet } from 'svelte'

  const {
    child: children,
    defaultHeight = 0,
    defaultWidth = 0,
  }: {
    child: Snippet<[{ height: number; width: number }]>
    defaultHeight?: number
    defaultWidth?: number
  } = $props()

  let childEl = $state<HTMLElement>()
  const size = $state({
    width: defaultWidth,
    height: defaultHeight,
  })

  let _parentNode = $state<HTMLElement>()

  onMount(() => {
    const parentNode = childEl?.parentNode
    if (
      !(
        parentNode &&
        parentNode.ownerDocument &&
        parentNode.ownerDocument.defaultView &&
        parentNode instanceof parentNode.ownerDocument.defaultView.HTMLElement
      )
    ) {
      return
    }
    _parentNode = parentNode

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(handleResize)
    })
    observer.observe(parentNode)
    handleResize()

    return () => {
      observer.unobserve(parentNode)
    }
  })

  function handleResize() {
    if (!_parentNode) {
      return
    }
    const style = window.getComputedStyle(_parentNode) || {}
    const paddingLeft = parseFloat(style.paddingLeft || '0')
    const paddingRight = parseFloat(style.paddingRight || '0')
    const paddingTop = parseFloat(style.paddingTop || '0')
    const paddingBottom = parseFloat(style.paddingBottom || '0')

    const rect = _parentNode.getBoundingClientRect()
    const scaledHeight = rect.height - paddingTop - paddingBottom
    const scaledWidth = rect.width - paddingLeft - paddingRight

    const height = _parentNode.offsetHeight - paddingTop - paddingBottom
    const width = _parentNode.offsetWidth - paddingLeft - paddingRight

    size.width = width
    size.height = height
  }
</script>

<div bind:this={childEl}>
  {#if size.width !== 0 && size.height !== 0}
    {@render children(size)}
  {/if}
</div>
