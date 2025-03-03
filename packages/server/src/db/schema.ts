import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { ulid } from 'ulidx'

// User table
export const user = sqliteTable(
  'User',
  {
    id: text('id').primaryKey(),
    screenName: text('screenName').notNull(),
    name: text('name'),
    description: text('description'),
    profileImageUrl: text('profileImageUrl'),
    accountCreatedAt: text('accountCreatedAt').$defaultFn(() =>
      new Date().toISOString(),
    ),
    spamReportCount: integer('spamReportCount').default(0).notNull(),
    createdAt: text('createdAt')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updatedAt')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    followersCount: integer('followersCount').default(0).notNull(),
    followingCount: integer('followingCount').default(0).notNull(),
    blueVerified: integer('blueVerified', { mode: 'boolean' })
      .default(false)
      .notNull(),
    defaultProfile: integer('defaultProfile', { mode: 'boolean' })
      .default(true)
      .notNull(),
    defaultProfileImage: integer('defaultProfileImage', {
      mode: 'boolean',
    })
      .default(true)
      .notNull(),
  },
  (table) => [index('user_spamReportCount_idx').on(table.spamReportCount)],
)

// Tweet table
export const tweet = sqliteTable(
  'Tweet',
  {
    id: text('id').primaryKey(),
    text: text('text'),
    media: text('media', { mode: 'json' }),
    publishedAt: text('publishedAt').$defaultFn(() => new Date().toISOString()),
    userId: text('userId')
      .references(() => user.id)
      .notNull(),
    conversationId: text('conversationId'),
    inReplyToStatusId: text('inReplyToStatusId'),
    quotedStatusId: text('quotedStatusId'),
    lang: text('lang').default('en'),
    createdAt: text('createdAt')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updatedAt')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    spamReportCount: integer('spamReportCount').default(0),
  },
  (table) => [index('tweet_spamReportCount_idx').on(table.spamReportCount)],
)

// SpamReport table
export const spamReport = sqliteTable(
  'SpamReport',
  {
    id: text('id').primaryKey().$defaultFn(ulid),
    spamUserId: text('spamUserId')
      .references(() => user.id)
      .notNull(),
    reportUserId: text('reportUserId')
      .references(() => user.id)
      .notNull(),
    spamTweetId: text('spamTweetId')
      .references(() => tweet.id)
      .notNull(),
    pageType: text('pageType', {
      enum: ['timeline', 'tweetDetail', 'other'],
    }),
    pageUrl: text('pageUrl'),
    createdAt: text('createdAt')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updatedAt')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    uniqueIndex('spamReport_unique').on(
      table.spamUserId,
      table.reportUserId,
      table.spamTweetId,
    ),
    index('spamUser_idx').on(table.spamUserId),
    index('reportUser_idx').on(table.reportUserId),
    index('spamUser_report_idx').on(table.spamUserId, table.reportUserId),
    index('createdAt_idx').on(table.createdAt),
  ],
)

// Payment table
export const payment = sqliteTable('Payment', {
  id: text('id').primaryKey(),
  localUserId: text('localUserId')
    .references(() => localUser.id)
    .notNull(),
  type: text('type').notNull(),
  amount: real('amount').notNull(),
  status: text('status', { enum: ['pending', 'success', 'failed'] }).notNull(),
  countryCode: text('countryCode').notNull(),
  createdAt: text('createdAt')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updatedAt')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
})

// LocalUser table
export const localUser = sqliteTable('LocalUser', {
  id: text('id').primaryKey().$defaultFn(ulid),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  createdAt: text('createdAt')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updatedAt')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  lastLogin: text('lastLogin')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  isPro: integer('isPro', { mode: 'boolean' })
    .notNull()
    .$defaultFn(() => false),
  emailVerified: integer('emailVerified', { mode: 'boolean' })
    .notNull()
    .$defaultFn(() => false),
})

// ModList table
export const modList = sqliteTable(
  'ModList',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    avatar: text('avatar'),
    userCount: integer('userCount')
      .notNull()
      .$defaultFn(() => 0),
    subscriptionCount: integer('subscriptionCount')
      .notNull()
      .$defaultFn(() => 0),
    localUserId: text('localUserId')
      .references(() => localUser.id)
      .notNull(),
    visibility: text('visibility', { enum: ['public', 'protected'] })
      .default('public')
      .notNull(),
    twitterUserId: text('twitterUserId')
      .references(() => user.id)
      .notNull(),
    createdAt: text('createdAt')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updatedAt')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index('modList_name_idx').on(table.name),
    index('modList_description_idx').on(table.description),
  ],
)

// ModListUser table
export const modListUser = sqliteTable(
  'ModListUser',
  {
    id: text('id').primaryKey().$defaultFn(ulid),
    modListId: text('modListId')
      .references(() => modList.id)
      .notNull(),
    twitterUserId: text('twitterUserId')
      .references(() => user.id)
      .notNull(),
    createdAt: text('createdAt')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updatedAt')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  () => [modListUserUnique],
)
export const modListUserUnique = uniqueIndex('modListUser_unique').on(
  modList.id,
  modListUser.twitterUserId,
)

export type ModListConditionItem = {
  field: string
  operator: string
  value: string | number | boolean
}
export const modListRule = sqliteTable(
  'ModListRule',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    modListId: text('modListId')
      .references(() => modList.id)
      .notNull(),
    condition: text('condition', {
      mode: 'json',
    })
      .notNull()
      .$type<{
        or: {
          and: ModListConditionItem[]
        }[]
      }>(),
    createdAt: text('createdAt')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updatedAt')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [index('modListRule_modListId_idx').on(table.modListId)],
)

// ModListSubscription table
export const modListSubscription = sqliteTable(
  'ModListSubscription',
  {
    id: text('id').primaryKey(),
    modListId: text('modListId')
      .references(() => modList.id)
      .notNull(),
    localUserId: text('localUserId')
      .references(() => localUser.id)
      .notNull(),
    createdAt: text('createdAt')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updatedAt')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    action: text('action', { enum: ['block', 'hide'] }).$defaultFn(
      () => 'hide',
    ),
  },
  (table) => [
    uniqueIndex('modListSubscription_unique').on(
      table.modListId,
      table.localUserId,
    ),
  ],
)

// Relations
export const userRelations = relations(user, ({ many }) => ({
  tweets: many(tweet),
  spamReportsAsSpam: many(spamReport, { relationName: 'spamUser' }),
  spamReportsAsReporter: many(spamReport, { relationName: 'reportUser' }),
  modLists: many(modList),
  modListUsers: many(modListUser),
}))

export const tweetRelations = relations(tweet, ({ one, many }) => ({
  user: one(user, {
    fields: [tweet.userId],
    references: [user.id],
  }),
  spamReports: many(spamReport),
}))

export const spamReportRelations = relations(spamReport, ({ one }) => ({
  spamUser: one(user, {
    fields: [spamReport.spamUserId],
    references: [user.id],
    relationName: 'spamUser',
  }),
  reportUser: one(user, {
    fields: [spamReport.reportUserId],
    references: [user.id],
    relationName: 'reportUser',
  }),
  spamTweet: one(tweet, {
    fields: [spamReport.spamTweetId],
    references: [tweet.id],
  }),
}))

export const localUserRelations = relations(localUser, ({ many }) => ({
  payments: many(payment),
  modLists: many(modList),
  modListSubscriptions: many(modListSubscription),
}))

export const paymentRelations = relations(payment, ({ one }) => ({
  localUser: one(localUser, {
    fields: [payment.localUserId],
    references: [localUser.id],
  }),
}))

export const modListRelations = relations(modList, ({ one, many }) => ({
  localUser: one(localUser, {
    fields: [modList.localUserId],
    references: [localUser.id],
  }),
  twitterUser: one(user, {
    fields: [modList.twitterUserId],
    references: [user.id],
  }),
  modListUsers: many(modListUser),
  modListSubscriptions: many(modListSubscription),
}))

export const modListUserRelations = relations(modListUser, ({ one }) => ({
  modList: one(modList, {
    fields: [modListUser.modListId],
    references: [modList.id],
  }),
  twitterUser: one(user, {
    fields: [modListUser.twitterUserId],
    references: [user.id],
  }),
}))

export const modListSubscriptionRelations = relations(
  modListSubscription,
  ({ one }) => ({
    modList: one(modList, {
      fields: [modListSubscription.modListId],
      references: [modList.id],
    }),
    localUser: one(localUser, {
      fields: [modListSubscription.localUserId],
      references: [localUser.id],
    }),
  }),
)
