let open = $state(false)

function lockScroll() {
  document.documentElement.style.overflowY = 'hidden'
  document.documentElement.style.marginRight = '0px'
}

function unlockScroll() {
  document.documentElement.style.overflowY = 'scroll'
  document.documentElement.style.marginRight = ''
}

export function useOpen(initial?: boolean) {
  if (initial !== undefined) {
    open = initial
  }
  return {
    get open() {
      return open
    },
    openModal() {
      if (open) {
        return
      }
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth
      document.documentElement.style.setProperty(
        '--scrollbar-width',
        `${scrollbarWidth}px`,
      )
      document.documentElement.classList.add('modal-open')
      lockScroll()
      open = true
    },
    closeModal() {
      if (!open) {
        return
      }
      document.documentElement.classList.remove('modal-open')
      unlockScroll()
      open = false
    },
  }
}
