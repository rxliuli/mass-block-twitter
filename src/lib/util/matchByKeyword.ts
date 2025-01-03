export function matchByKeyword(value: string, keyword: string) {
  if (!value || !keyword) {
    return false
  }
  if (value.includes(keyword)) {
    return true
  }
  return new RegExp(keyword).test(value)
}
