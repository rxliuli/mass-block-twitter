import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import { ADataTable } from '..'

describe('ADataTable', () => {
  it('should be able to render', async () => {
    const screen = render(ADataTable, {
      columns: [
        {
          dataIndex: 'id',
          title: 'ID',
        },
        {
          dataIndex: 'name',
          title: 'Name',
        },
      ],
      dataSource: [
        {
          id: '1',
          name: 'John',
        },
        {
          id: '2',
          name: 'Jane',
        },
      ],
      rowKey: 'id',
      class: 'test-table',
    })
    const elem = document.querySelector('.test-table') as HTMLElement
    elem.style.height = '400px'
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(screen.baseElement.querySelectorAll('tbody > tr').length).toBe(2)
    await expect.element(screen.getByText('John')).toBeInTheDocument()
    await expect.element(screen.getByText('Jane')).toBeInTheDocument()
  })
  it.todo('should be able to render and select rows')
})
