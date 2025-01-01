export async function fileSelector(options?: {
  accept?: string
  multiple?: boolean
}): Promise<FileList | null> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = options?.accept || 'image/png, image/jpeg'
  input.multiple = options?.multiple || false
  return await new Promise<FileList | null>((resolve) => {
    input.addEventListener('change', () => {
      resolve(input.files)
      input.remove()
    })
    input.addEventListener('cancel', () => {
      resolve(null)
      input.remove()
    })
    input.click()
  })
}
