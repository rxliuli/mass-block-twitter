export type MenuItem = {
  title: string
  url: string
  icon: ConstructorOfATypedSvelteComponent
  to: 'content' | 'footer'
}
