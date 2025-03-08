export function matchByKeyword(
  keyword: string,
  values: (string | undefined)[],
) {
  return values.some((value) => {
    if (!value || !keyword) {
      return false
    }
    if (value.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())) {
      return true
    }
    return new RegExp(keyword).test(value)
  })
}
