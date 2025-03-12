import { Column, renderComponent } from '$lib/components/logic/a-data-table'
import { User } from '$lib/db'
import AvatarWrapper from '../components/AvatarWrapper.svelte'
import TextWrapper from '../components/TextWrapper.svelte'
import BlockingWrapper from '../components/BlockingWrapper.svelte'
import VerifiedWrapper from '../components/VerifiedWrapper.svelte'

export const userColumns: Column<User>[] = [
  {
    title: 'Avatar',
    dataIndex: 'profile_image_url',
    render: (value, record) =>
      renderComponent(AvatarWrapper, {
        src: value,
        alt: 'Profile Image',
        screen_name: record.screen_name,
      }),
  },
  {
    title: 'Screen Name',
    dataIndex: 'screen_name',
    render: (value) =>
      renderComponent(TextWrapper, {
        class: 'w-40 truncate',
        title: value,
        children: value,
      }),
  },
  {
    title: 'Name',
    dataIndex: 'name',
    render: (value) =>
      renderComponent(TextWrapper, {
        class: 'w-40 truncate',
        title: value,
        children: value,
      }),
  },
  {
    title: 'Blocking',
    dataIndex: 'blocking',
    render: (value) => renderComponent(BlockingWrapper, { blocking: value }),
  },
  {
    title: 'Verified',
    dataIndex: 'is_blue_verified',
    render: (value) => renderComponent(VerifiedWrapper, { verified: value }),
  },
  {
    title: 'Description',
    dataIndex: 'description',
    render: (value) =>
      renderComponent(TextWrapper, {
        class: 'text-sm truncate',
        children: value,
      }),
  },
]
