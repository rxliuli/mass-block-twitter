function getSettings() {
  const init = {
    language: 'en-US',
    theme: 'system',
  }
  if (typeof window === 'undefined') {
    return init
  }
  const settingStr = localStorage.getItem('settings')
  if (settingStr) {
    return {
      ...init,
      ...JSON.parse(settingStr),
    }
  }
  return init
}

export function useSettings() {
  let settings = $state(getSettings())

  return {
    get value() {
      return settings
    },
    sync() {
      localStorage.setItem('settings', JSON.stringify(settings))
    },
  }
}
