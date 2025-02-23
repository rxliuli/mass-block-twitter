import { z, ZodTypeAny } from 'zod'

/**
 * @link https://github.com/colinhacks/zod/issues/2461#issuecomment-1712769467
 * @param zodPipe
 * @returns
 */
export const zodStringNumber = () =>
  z
    .string()
    .optional()
    .refine((value) => !value || !isNaN(Number(value)), {
      message: 'Invalid number',
    })
    .transform((value) => {
      return value ? Number(value) : undefined
    })
    .pipe(z.number())
