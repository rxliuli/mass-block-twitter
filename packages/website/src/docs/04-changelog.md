# Changelog

## 0.18.9

- ✨ Added floating action button on the right side of page
- ✨ Now supports blocking all followers from community lists
- 🐛 Fixed server authentication error
- 🐛 Fixed issue where plugin changed Twitter language to English [kaisermann/svelte-i18n#265](https://github.com/kaisermann/svelte-i18n/pull/265)
- 🐛 Fixed theme mismatch when closing floating button [svecosystem/mode-watcher#105](https://github.com/svecosystem/mode-watcher/pull/105)

## 0.18.3

- 🐛 fix(plugin): refresh modlist after subscription changes

## 0.18.2

- 🐛 fix: fix visibility field being null

## 0.18.1

- 🐛 fix(plugin): fix permission error

## 0.18.0

- ✨ Support importing users in moderation lists from JSON/CSV files
- ✨ Support batch blocking users in moderation lists
- ✨ Support sharing moderation lists

## 0.17.0

- ✨ Start trying to analyze whether a user is a spam account based on LLM
- 🚀 Performance optimization: Only update users and tweets when necessary

## 0.16.0

- ✨ Support creating custom rules in moderation lists - Use powerful rule matching for any user or tweet
- ✨ Added location filtering to keyword blocking
- 🚀 Performance optimization: Optimized SQL upsert operations by excluding ID updates

## 0.15.0

- ✨ Added dashboard
- ✨ Support viewing operation records
- 🐛 Fixed style issues

## 0.14.3

- ✨ Support username-based keyword matching and automatic blocking
- 🎯 Added operation options for moderation list subscriptions: hide/block

## 0.13.0

- ✨ Extended content filtering to notifications
- ✨ Support filtering timeline by tweet language

## 0.12.1

- ✨ Support creating and subscribing to content moderation lists - Automatically hide tweets from listed users
- 🎯 Integrated user login system
- 🐛 Fixed auto-scroll issues with virtual scrolling tables

## 0.10.2

- ✨ Added option to hide blue V certified accounts
- 🐛 Fix the issue of filtering rules mistakenly affecting one's own tweets
- 📝 Update user documentation

## 0.10.0

- ✨ Optimize table performance - Sidebar switching is smoother
- 🎯 Supports clearing local cache data
- ⚡️ Fix the issue of clicking on the mobile sidebar overlay

## 0.9.0

- ✨ Update the overall UI interface, add sidebar navigation
- 🎯 Automatically hide suspicious accounts (no profile picture, bio, or followers)
- 🔒 Enhanced keyword filtering: supports detection of profiles, usernames, and tweet content
- ⚡️ New option: Remote sharing blacklist can be disabled
- 📦 Release Edge version <https://microsoftedge.microsoft.com/addons/detail/jfmhejlgepjmbgeceljmdeimmdolfadf>

## 0.8.0

- ✨ Introduce a reporting-based shared blacklist mechanism
- 🎯 Highlight users who have been reported multiple times
- 🔒 Automatically hide accounts that are frequently reported
- ⚡️ One-click block: Click now to directly block the account

## 0.7.0

- 🐛 Fix known issues
- 📦 Release Firefox version <https://addons.mozilla.org/firefox/addon/mass-block-twitter/>
- 💬 Create Telegram discussion group <https://t.me/MassBlockTwitter>

## 0.6.0

- ✨ Support for keyword-based automatic background blocking
- 🐛 Will not automatically block followed users
- 📦 Released on ProductHunt <https://www.producthunt.com/products/mass-block-twitter>

## 0.5.1

- ✨ Supports mobile use, click the plugin icon to open

## 0.5.0

- ✨ Supports batch unblocking; if you accidentally make a mistake, you can also batch restore

## 0.4.0

- ✨ Support regular expression search in tables, quickly share your search keywords!
- 🎯 Supports the import and export of blacklist features, see which spam you have blocked

## 0.3.0

- ✨ Support direct username search
- 🎯 Support manual selection of users to be blocked
- 🔄 Resolve the false positive issue

## 0.2.0

- 📦 Release Chrome Web Store version <https://chromewebstore.google.com/detail/mass-block-twitter/eaghpebepefbcadjdppjjopoagckdhej>

## 0.1.0

- ✨ Initial version
