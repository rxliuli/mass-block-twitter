import { beforeEach, describe, expect, it } from 'vitest'
import { analyzeUser, getPrompt, getClient } from '../../src/lib/llm'
import { CloudflareTestContext, createCloudflareTestContext } from '../utils'

const normalData: Parameters<typeof getPrompt>[0] = {
  user: {
    id: '123',
    screenName: 'rxliuli',
    name: '琉璃',
    description: '放下助人情节，尊重他人命运！#ts #go #日本語初心者',
    profileImageUrl:
      'https://pbs.twimg.com/profile_images/896290684298174464/Yk3siS2C_normal.jpg',
    accountCreatedAt: '2017-07-21T18:28:28.000Z',
    followersCount: 1630,
    followingCount: 360,
    blueVerified: false,
    defaultProfile: false,
    defaultProfileImage: false,
    url: 'https://blog.rxliuli.com',
    location: null,
  },
  tweets: [
    {
      text: '最近很烦人的 比特币飞扬 的主账号似乎是 https://x.com/TraderFeiyang 可以向 twitter 报告它',
      publishedAt: '2024-12-30T06:16:57.000Z',
      media: null,
    },
    {
      text: '吾辈听说这个人有 200 个账号根本就屏蔽不完，嗯，直到吾辈写了个插件🥴',
      publishedAt: '2024-12-30T10:14:22.000Z',
      media: [
        {
          url: 'https://pbs.twimg.com/ext_tw_video_thumb/1873673941312749569/pu/img/NJg138pGsvhyEmL_.jpg',
          type: 'video',
        },
      ],
    },
    {
      text: '🌐 Mass Block Twitter v0.16.0 已发布！\n\n本次更新：\n✨ 支持在审核列表中创建自定义规则 - 使用强大的规则匹配任何用户或推文\n✨ 关键词屏蔽新增地理位置过滤\n🚀 性能优化：通过排除 ID 更新优化 SQL upsert 操作\n\n立即安装：\nhttps://chromewebstore.google.com/detail/mass-block-twitter/eaghpebepefbcadjdppjjopoagckdhej\n\n#ChromeExtension #Twitter #MassBlock',
      publishedAt: '2025-03-03T09:58:18.000Z',
      media: [
        {
          url: 'https://pbs.twimg.com/ext_tw_video_thumb/1896500106796691456/pu/img/XkNE7GMhcQlzMaVR.jpg',
          type: 'video',
        },
      ],
    },
  ],
}

const spamData: Parameters<typeof getPrompt>[0] = {
  user: {
    id: '123',
    screenName: 'Angel9776389364',
    name: 'Amabelle ⬇️',
    accountCreatedAt: '2025-01-26T03:12:12.000Z',
    followersCount: 1,
    followingCount: 0,
    blueVerified: false,
    defaultProfile: true,
    defaultProfileImage: false,
    description: 'Wait   ⬇️   👇👇👇',
    url: 'https://Spicry.com/MidnightFlame88',
    location: '',
    profileImageUrl:
      'https://pbs.twimg.com/profile_images/1883452510611865600/57Pv2p-i_normal.jpg',
  },
  tweets: [],
}

it('getPrompt', () => {
  const prompt = getPrompt(normalData)
  expect(prompt).toMatchSnapshot()
})

let c: CloudflareTestContext
let options: Parameters<typeof analyzeUser>[1]
beforeEach(async () => {
  c = await createCloudflareTestContext()
  options = {
    baseUrl: c.env.OPENAI_BASE_URL,
    apiKey: c.env.OPENAI_API_KEY,
    model: c.env.OPENAI_MODEL,
  }
})

describe.skip('analyzeUser', () => {
  it('spam user', async () => {
    const score = await analyzeUser(spamData, options)
    expect(score.result?.rating).eq(5)
  })
  it('normal user', async () => {
    const score = await analyzeUser(normalData, options)
    expect(score.result?.rating).lte(2)
  })
})

describe.skip('getClient', () => {
  it('grok', async () => {
    const client = getClient({
      baseUrl: c.env.OPENAI_BASE_URL,
      apiKey: c.env.OPENAI_API_KEY,
      model: c.env.OPENAI_MODEL,
    })
    const resp = await client('Hello, how are you?')
    expect(resp.choices[0].message.content).not.undefined
  })
})
