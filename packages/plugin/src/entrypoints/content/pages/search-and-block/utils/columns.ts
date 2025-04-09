import { Column, renderComponent } from '$lib/components/logic/a-data-table'
import { User } from '$lib/db'
import AvatarWrapper from '../components/AvatarWrapper.svelte'
import { TextWrapper } from '$lib/components/custom/text'
import BlockingWrapper from '../components/BlockingWrapper.svelte'
import VerifiedWrapper from '../components/VerifiedWrapper.svelte'
import ScreenNameWrapper from '../components/ScreenNameWrapper.svelte'

export const userColumns: Column<User>[] = [
  {
    title: 'search-and-block.columns.avatar',
    dataIndex: 'profile_image_url',
    render: (value, record) =>
      renderComponent(AvatarWrapper, {
        src: value,
        alt: 'Profile Image',
        screen_name: record.screen_name,
      }),
  },
  {
    title: 'search-and-block.columns.screenName',
    dataIndex: 'screen_name',
    render: (value) =>
      renderComponent(ScreenNameWrapper, {
        class: 'w-40 truncate',
        title: value,
        children: value,
      }),
  },
  {
    title: 'search-and-block.columns.name',
    dataIndex: 'name',
    render: (value) =>
      renderComponent(TextWrapper, {
        class: 'w-40 truncate',
        title: value,
        children: value,
      }),
  },
  {
    title: 'search-and-block.columns.blocking',
    dataIndex: 'blocking',
    render: (value) => renderComponent(BlockingWrapper, { blocking: value }),
  },
  {
    title: 'search-and-block.columns.verified',
    dataIndex: 'is_blue_verified',
    render: (value) => renderComponent(VerifiedWrapper, { verified: value }),
  },
  {
    title: 'search-and-block.columns.description',
    dataIndex: 'description',
    render: (value) =>
      renderComponent(TextWrapper, {
        class: 'text-sm truncate',
        children: value,
      }),
  },
]
