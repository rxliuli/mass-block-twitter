// Copy from https://github.com/iSarabjitDhiman/XClientTransaction/blob/master/x_client_transaction/transaction.py
import { once } from '$lib/util/once'
import { fetchAsset } from '../twitter/utils'
import { Cubic } from './cubic'
import { interpolate } from './interpolate'
import { convertRotationToMatrix } from './rotation'
import { floatToHex, isOdd, base64Encode, jsRound } from './utils'

export class ClientTransaction {
  private static readonly ADDITIONAL_RANDOM_NUMBER = 3
  private static readonly DEFAULT_KEYWORD = 'obfiowerehiring'

  private homePageResponse!: Document
  private defaultRowIndex: number | null = null
  private defaultKeyBytesIndices: number[] | null = null
  private key!: string
  private keyBytes!: number[]
  private animationKey!: string

  async initResponse() {
    const html = await fetchAsset('https://x.com/home')
    this.homePageResponse = new DOMParser().parseFromString(html, 'text/html')
  }

  initialize = once(async (): Promise<void> => {
    await this.initResponse()
    const indices = await this.getIndices(this.homePageResponse)
    this.defaultRowIndex = indices[0]
    this.defaultKeyBytesIndices = indices[1]
    this.key = this.getKey(this.homePageResponse)
    this.keyBytes = this.getKeyBytes(this.key)
    this.animationKey = this.getAnimationKey(
      this.keyBytes,
      this.homePageResponse,
    )
  })

  private async getIndices(
    homePageResponse?: Document,
  ): Promise<[number, number[]]> {
    let keyByteIndices: number[] = []
    const response = homePageResponse || this.homePageResponse

    const html = response.documentElement.outerHTML
    const onDemandFileRegex =
      /['|"]{1}ondemand\.s['|"]{1}:\s*['|"]{1}([\w]*)['|"]{1}/gm
    const match = onDemandFileRegex.exec(html)

    if (match) {
      const onDemandFileUrl = `https://abs.twimg.com/responsive-web/client-web/ondemand.s.${match[1]}a.js`

      try {
        const scriptContent = await fetchAsset(onDemandFileUrl)
        const indicesRegex = /\(\w{1}\[(\d{1,2})\],\s*16\)/gm
        let indicesMatch

        while ((indicesMatch = indicesRegex.exec(scriptContent)) !== null) {
          keyByteIndices.push(parseInt(indicesMatch[1], 10))
        }
      } catch (error) {
        console.error('Error fetching ondemand file:', error)
      }
    }

    if (keyByteIndices.length === 0) {
      throw new Error("Couldn't get KEY_BYTE indices")
    }

    return [keyByteIndices[0], keyByteIndices.slice(1)]
  }

  private getKey(response?: Document): string {
    const doc = response || this.homePageResponse
    const element = doc.querySelector("[name='twitter-site-verification']")

    if (!element) {
      throw new Error("Couldn't get key from the page source")
    }

    return element.getAttribute('content') || ''
  }

  private getKeyBytes(key: string): number[] {
    // Base64解码
    const binaryString = atob(key)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return Array.from(bytes)
  }

  private getFrames(response?: Document): Element[] {
    const doc = response || this.homePageResponse
    return Array.from(doc.querySelectorAll("[id^='loading-x-anim']"))
  }

  private get2dArray(keyBytes: number[], frames: Element[]): number[][] {
    const frameIndex = keyBytes[5] % 4
    if (frameIndex < 0 || frameIndex >= frames.length) {
      throw new Error(
        `Calculated frame index ${frameIndex} is out of bounds for frames array of length ${frames.length}`,
      )
    }
    const selectedFrame = frames[frameIndex]

    if (!selectedFrame.childNodes || selectedFrame.childNodes.length === 0) {
      throw new Error(
        `Selected frame at index ${frameIndex} has no child nodes.`,
      )
    }
    const firstChildOfFrame = selectedFrame.childNodes[0]

    if (
      !firstChildOfFrame ||
      !firstChildOfFrame.childNodes ||
      firstChildOfFrame.childNodes.length < 2
    ) {
      throw new Error(
        'First child of selected frame does not have at least two child nodes.',
      )
    }
    const targetNode = firstChildOfFrame.childNodes[1]

    if (!(targetNode instanceof Element)) {
      throw new Error(
        "The targeted node (frame.childNodes[0].childNodes[1]) is not an Element and cannot have a 'd' attribute.",
      )
    }
    const pathElement = targetNode as Element // 类型断言，因为我们已经检查过
    const pathData = pathElement.getAttribute('d')

    if (pathData === null || pathData === undefined) {
      throw new Error("The 'd' attribute was not found on the target element.")
    }

    if (pathData.length < 9) {
      throw new Error(
        `Path data length (${pathData.length}) is less than 9, cannot substring from index 9.`,
      )
    }
    const pathParts = pathData.substring(9).split('C')

    return pathParts.map((item, partIndex) => {
      const cleanedItem = item.replace(/[^\d]+/g, ' ').trim()

      if (cleanedItem === '') {
        return []
      }

      const numberStrings = cleanedItem.split(' ')

      return numberStrings.map((numStr, strIndex) => {
        if (numStr === '') {
          throw new Error(
            `Attempted to parse an empty string to integer at part ${partIndex}, string index ${strIndex}. Original item: "${item}"`,
          )
        }

        const num = parseInt(numStr, 10)

        if (isNaN(num)) {
          throw new Error(
            `Failed to parse "${numStr}" as an integer at part ${partIndex}, string index ${strIndex}. Original item: "${item}"`,
          )
        }

        return num
      })
    })
  }

  private solve(
    value: number,
    minVal: number,
    maxVal: number,
    rounding: boolean,
  ): number {
    const result = (value * (maxVal - minVal)) / 255 + minVal
    return rounding ? Math.floor(result) : Math.round(result * 100) / 100
  }

  private animate(frames: number[], targetTime: number): string {
    const fromColor: number[] = [...frames.slice(0, 3).map(Number), 1]
    const toColor: number[] = [...frames.slice(3, 6).map(Number), 1]
    const fromRotation: number[] = [0.0]
    const toRotation: number[] = [this.solve(frames[6], 60.0, 360.0, true)]

    const curvesFrames = frames.slice(7)
    const curves = curvesFrames.map((item, counter) =>
      this.solve(Number(item), isOdd(counter), 1.0, false),
    )

    const cubic = new Cubic(curves)
    const val = cubic.getValue(targetTime)

    let color = interpolate(fromColor, toColor, val)
    color = color.map((value) => Math.max(0, Math.min(255, value)))

    const rotation = interpolate(fromRotation, toRotation, val)
    const matrix = convertRotationToMatrix(rotation[0])

    const strArr: string[] = color
      .slice(0, -1)
      .map((value) => Math.round(value).toString(16))

    for (const value of matrix) {
      let rounded = Math.round(value * 100) / 100
      if (rounded < 0) {
        rounded = -rounded
      }

      let hexValue = floatToHex(rounded)
      if (hexValue.startsWith('.')) {
        strArr.push(`0${hexValue}`.toLowerCase())
      } else {
        strArr.push(hexValue || '0')
      }
    }

    strArr.push('0', '0')
    const animationKey = strArr.join('').replace(/[.-]/g, '')
    return animationKey
  }

  private getAnimationKey(keyBytes: number[], response: Document): string {
    const totalTime = 4096

    const rowIndex = keyBytes[this.defaultRowIndex!] % 16
    const frameTime = this.defaultKeyBytesIndices!.reduce(
      (num1, num2) => num1 * (keyBytes[num2] % 16),
      1,
    )

    const roundedFrameTime = jsRound(frameTime / 10) * 10
    const arr = this.get2dArray(keyBytes, this.getFrames(response))
    const frameRow = arr[rowIndex]

    const targetTime = roundedFrameTime / totalTime
    return this.animate(frameRow, targetTime)
  }

  public async generateTransactionId(
    method: string,
    path: string,
    response?: Document,
    key?: string,
    animationKey?: string,
    timeNow?: number,
  ): Promise<string> {
    await this.initialize()
    timeNow = timeNow || Math.floor((Date.now() - 1682924400 * 1000) / 1000)
    const timeNowBytes = [0, 1, 2, 3].map((i) => (timeNow! >> (i * 8)) & 0xff)

    key = key || this.key || this.getKey(response)
    const keyBytes = this.getKeyBytes(key)
    animationKey =
      animationKey ||
      this.animationKey ||
      this.getAnimationKey(keyBytes, response || this.homePageResponse)

    const text = `${method}!${path}!${timeNow}${ClientTransaction.DEFAULT_KEYWORD}${animationKey}`
    return await this.sha256ThenProcess(text, keyBytes, timeNowBytes)
  }

  private async sha256ThenProcess(
    text: string,
    keyBytes: number[],
    timeNowBytes: number[],
  ): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)

    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashBytes = Array.from(new Uint8Array(hashBuffer))

    const randomNum = Math.floor(Math.random() * 256)
    const bytesArr = [
      ...keyBytes,
      ...timeNowBytes,
      ...hashBytes.slice(0, 16),
      ClientTransaction.ADDITIONAL_RANDOM_NUMBER,
    ]

    const out = new Uint8Array([
      randomNum,
      ...bytesArr.map((item) => item ^ randomNum),
    ])
    return base64Encode(out).replace(/=/g, '')
  }
}
