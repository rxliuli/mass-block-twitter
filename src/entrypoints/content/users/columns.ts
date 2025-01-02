import { renderComponent, renderSnippet } from '$lib/components/ui/data-table'
import type { ColumnDef } from '@tanstack/table-core'
import { createRawSnippet } from 'svelte'
import { Checkbox } from '$lib/components/ui/checkbox'
import { User } from '$lib/db'
import DataTableAvatar from './data-table-avatar.svelte'
import DataTableBlocking from './data-table-blocking.svelte'

export const columns: ColumnDef<User>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      renderComponent(Checkbox, {
        checked: table.getIsAllPageRowsSelected(),
        indeterminate:
          table.getIsSomePageRowsSelected() &&
          !table.getIsAllPageRowsSelected(),
        onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
        controlledChecked: true,
        'aria-label': 'Select all',
      }),
    cell: ({ row }) =>
      renderComponent(Checkbox, {
        checked: row.getIsSelected(),
        onCheckedChange: (value) => row.toggleSelected(!!value),
        controlledChecked: true,
        'aria-label': 'Select row',
      }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'profile_image_url',
    header: 'Profile Image',
    enableGlobalFilter: false,
    cell: ({ row }) => {
      return renderComponent(DataTableAvatar, {
        src: row.original.profile_image_url,
        title: row.original.name,
      })
    },
  },
  {
    accessorKey: 'screen_name',
    header: 'Screen Name',
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'blocking',
    header: 'Blocking',
    cell: ({ row }) => {
      return renderComponent(DataTableBlocking, { ...row.original })
    },
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => {
      const descCellSnippet = createRawSnippet<[string | undefined]>(
        (getDesc) => {
          const desc = getDesc()
          return {
            render: () =>
              `<div class="truncate max-w-[160px]" title="${desc}">${desc}</div>`,
          }
        },
      )

      return renderSnippet(descCellSnippet, row.original.description)
    },
  },
  // {
  //   id: 'actions',
  //   enableGlobalFilter: false,
  //   cell: ({ row }) => {
  //     // You can pass whatever you need from `row.original` to the component
  //     return renderComponent(DataTableActions, { ...row.original })
  //   },
  // },
]
