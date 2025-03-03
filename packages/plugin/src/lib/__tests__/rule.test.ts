import { getRuleFileds, visit } from '$lib/rule'
import { describe, expect, it } from 'vitest'
import { z, ZodArray, ZodEnum } from 'zod'

describe('getRuleFileds', () => {
  it('should return the correct fields', () => {
    const fields = getRuleFileds()
    expect(fields).toMatchSnapshot()
  })
})

describe('visit', () => {
  it('should visit the correct fields', () => {
    const fields: string[] = []
    visit(
      z.object({
        a: z.string(),
        b: z.object({
          c: z.number(),
        }),
        d: z.array(z.boolean()),
      }),
      (it, path) => {
        if (it instanceof ZodArray) {
          return false
        }
        fields.push(path.join('.'))
      },
    )
    expect(fields).toEqual(['a', 'b', 'b.c'])
  })
  it('should visit optional fields', () => {
    const fields: string[] = []
    visit(
      z.object({
        a: z.enum(['a', 'b']).optional(),
      }),
      (it, path) => {
        fields.push(path.join('.'))
        if (it instanceof ZodEnum) {
          return false
        }
      },
    )
    expect(fields).toEqual(['a'])
  })
})
