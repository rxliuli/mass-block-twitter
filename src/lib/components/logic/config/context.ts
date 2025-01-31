import { Context } from 'runed'

export const shadcnConfig = new Context<{
  portal?: HTMLElement
}>('shadcn-config')
