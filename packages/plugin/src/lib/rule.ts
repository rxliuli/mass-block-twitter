import {
  z,
  ZodArray,
  ZodBoolean,
  ZodEnum,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  ZodType,
} from 'zod'
import { languages } from './constants/languages'
import { get } from 'es-toolkit/compat'

const ruleDataSchema = z.object({
  user: z
    .object({
      id: z.string(),
      screen_name: z.string(),
      name: z.string(),
      description: z.string().optional(),
      location: z.string().optional(),
      url: z.string().optional(),
      profile_image_url: z.string().optional(),
      created_at: z.string().optional(),
      is_blue_verified: z.boolean().optional(),
      followers_count: z.number().optional(),
      friends_count: z.number().optional(),
      default_profile: z.boolean().optional(),
      default_profile_image: z.boolean().optional(),
    })
    .optional(),
  tweet: z
    .object({
      id: z.string(),
      text: z.string(),
      created_at: z.string(),
      lang: z
        .enum(languages.map((it) => it.value) as [string, ...string[]])
        .optional(),
      media: z
        .array(
          z.object({
            type: z.union([
              z.literal('photo'),
              z.literal('video'),
              z.literal('animated_gif'),
            ]),
            url: z.string(),
          }),
        )
        .optional(),
      conversation_id_str: z.string(),
      in_reply_to_status_id_str: z.string().optional(),
      quoted_status_id_str: z.string().optional(),
    })
    .optional(),
})
export type RuleData = z.infer<typeof ruleDataSchema>

type StringCondition = {
  field: string
  operator: 'eq' | 'neq' | 'cont' | 'notCont' | 'regex'
  value: string
}
type NumberCondition = {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  value: number
}
type BooleanCondition = {
  field: string
  operator: 'eq'
  value: boolean
}
type Condition = StringCondition | NumberCondition | BooleanCondition
export interface Rule {
  or: {
    and: Condition[]
  }[]
}

type RuleField =
  | {
      field: string
      type: 'string'
      operator: {
        value: StringCondition['operator']
        label: string
      }[]
      enum?: {
        value: string
        label: string
      }[]
    }
  | {
      field: string
      type: 'number'
      operator: {
        value: NumberCondition['operator']
        label: string
      }[]
    }
  | {
      field: string
      type: 'boolean'
      operator: {
        value: BooleanCondition['operator']
        label: string
      }[]
    }

export function visit(
  schema: ZodType,
  iter: (value: ZodType, path: string[]) => void | false,
) {
  function f(schema: unknown, path: string[]) {
    if (!(schema instanceof ZodType)) {
      return
    }
    if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
      f(schema.unwrap(), path)
      return
    }
    if (path.length !== 0) {
      const result = iter(schema, path)
      if (result === false) {
        return
      }
    }
    if (schema instanceof ZodObject) {
      Object.entries(schema.shape).forEach(([key, value]) => {
        f(value, [...path, key])
      })
      return
    }
    if (
      schema instanceof ZodBoolean ||
      schema instanceof ZodNumber ||
      schema instanceof ZodString
    ) {
      return
    }

    throw new Error(`Unsupported schema: ${schema.constructor.name}`)
  }
  f(schema, [])
}

export function getRuleFileds(): RuleField[] {
  const fields: RuleField[] = []
  visit(ruleDataSchema, (it, path) => {
    if (it instanceof ZodArray) {
      return false
    }
    if (it instanceof ZodEnum) {
      if (path.join('.') !== 'tweet.lang') {
        throw new Error('Enum field must be tweet.lang')
      }
      fields.push({
        field: path.join('.'),
        type: 'string',
        operator: [{ value: 'eq', label: 'Equal' }],
        enum: languages,
      })
      return false
    }
    if (it instanceof ZodString) {
      fields.push({
        field: path.join('.'),
        type: 'string',
        operator: [
          { value: 'eq', label: 'Equal' },
          { value: 'neq', label: 'Not Equal' },
          { value: 'cont', label: 'Contains' },
          { value: 'notCont', label: 'Not Contains' },
          { value: 'regex', label: 'Regex' },
        ],
      })
      return
    }
    if (it instanceof ZodNumber) {
      fields.push({
        field: path.join('.'),
        type: 'number',
        operator: [
          { value: 'eq', label: 'Equal' },
          { value: 'neq', label: 'Not Equal' },
          { value: 'gt', label: 'Greater Than' },
          { value: 'gte', label: 'Greater Than or Equal' },
          { value: 'lt', label: 'Less Than' },
          { value: 'lte', label: 'Less Than or Equal' },
        ],
      })
    }
    if (it instanceof ZodBoolean) {
      fields.push({
        field: path.join('.'),
        type: 'boolean',
        operator: [{ value: 'eq', label: 'Equal' }],
      })
    }
  })
  return fields
}

function matchCondition(cond: Condition, data: any) {
  const { field, operator, value } = cond
  const fieldValue = get(data, field)
  if (fieldValue === undefined || fieldValue === null) {
    return false
  }
  switch (operator) {
    case 'eq':
      return fieldValue === value
    case 'neq':
      return fieldValue !== value
    case 'cont':
      return fieldValue.includes(value)
    case 'notCont':
      return !fieldValue.includes(value)
    case 'gt':
      return fieldValue > value
    case 'gte':
      return fieldValue >= value
    case 'lt':
      return fieldValue < value
    case 'lte':
      return fieldValue <= value
    case 'regex':
      if (typeof value === 'string') {
        return new RegExp(value).test(fieldValue)
      }
      return false
    default:
      console.error(`Unknown operator: ${operator}`)
  }
  return false
}

export function matchRule(rules: Rule[], data: any) {
  return rules.some((rule) =>
    rule.or.some((or) => or.and.every((cond) => matchCondition(cond, data))),
  )
}
