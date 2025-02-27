export function parseHeadersText(text: string) {
  return text
    .split('\r\n')
    .filter((header) => header)
    .reduce((acc, current) => {
      const [key, value] = current.split(': ')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)
}

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
