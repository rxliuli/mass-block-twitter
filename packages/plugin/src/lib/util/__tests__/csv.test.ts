import { describe, expect, it } from 'vitest'
import { generateCSV, parseCSV } from '../csv'
import { User } from '$lib/db'

describe('generateCSV', () => {
  it('should generate csv', () => {
    const csv = generateCSV([{ id: 1, name: 'test' }], {
      fields: ['id', 'name'],
    })
    expect(csv).eq('id,name\r\n1,test')
    expect(parseCSV(csv)).toEqual([{ id: '1', name: 'test' }])
  })
  it('should generate csv with break line', () => {
    const csv = generateCSV([{ id: 1, name: 'test\ntest' }], {
      fields: ['id', 'name'],
    })
    expect(csv).eq('id,name\r\n1,"test\ntest"')
    expect(parseCSV(csv)).toEqual([{ id: '1', name: 'test\ntest' }])
  })
  it('should generate csv with undefined', () => {
    const csv = generateCSV([{ id: 1, name: undefined, description: 'test' }], {
      fields: ['id', 'name', 'description'],
    })
    expect(csv).toBe('id,name,description\r\n1,,test')
    expect(parseCSV(csv)).toEqual([
      { id: '1', name: undefined, description: 'test' },
    ])
  })
  it('should generate csv with null', () => {
    const csv = generateCSV([{ id: 1, name: null, description: 'test' }], {
      fields: ['id', 'name', 'description'],
    })
    expect(csv).toBe('id,name,description\r\n1,,test')
    expect(parseCSV(csv)).toEqual([
      { id: '1', name: undefined, description: 'test' },
    ])
  })
  it('should generate csv with empty string', () => {
    const csv = generateCSV([{ id: 1, name: '', description: 'test' }], {
      fields: ['id', 'name', 'description'],
    })
    expect(csv).toBe('id,name,description\r\n1,,test')
    expect(parseCSV(csv)).toEqual([
      { id: '1', name: undefined, description: 'test' },
    ])
  })
  it('should generate csv with array', () => {
    const data = [
      {
        id: '1601169426530844677',
        screen_name: 'Chrisflxco',
        name: '︎︎︎︎︎︎ ︎︎︎︎︎︎🇨🇲',
        profile_image_url:
          'https://pbs.twimg.com/profile_images/1708894994222743552/qXf4aNbH_normal.jpg',
      },
      {
        id: '3008307598',
        screen_name: 'evest03',
        name: 'hasSten',
        profile_image_url:
          'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
      },
    ] as User[]
    const csv = generateCSV(data, {
      fields: ['id', 'screen_name', 'name', 'description', 'profile_image_url'],
    })
    expect(csv).toBe(
      `id,screen_name,name,description,profile_image_url\r\n1601169426530844677,Chrisflxco,\uFE0E\uFE0E\uFE0E\uFE0E\uFE0E\uFE0E \uFE0E\uFE0E\uFE0E\uFE0E\uFE0E\uFE0E🇨🇲,,https://pbs.twimg.com/profile_images/1708894994222743552/qXf4aNbH_normal.jpg\r\n3008307598,evest03,hasSten,,https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png`,
    )
    const parsed = parseCSV(csv)
    expect(parsed).toEqual(data)
  })
})
