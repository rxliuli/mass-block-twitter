# How to Use

<!-- ## Video Tutorial -->

## Operation Dashboard

Click the extension icon to display the extension panel. The homepage shows statistics for the past week.

![dashboard](/docs/dashboard.png)

The operation dashboard provides the following features:

- **Data Overview**: Shows the number of filtered tweets and blocked accounts in the past week
- **Daily Trends**: Visualizes daily filtering activity trends through charts
- **Recent Operations**: Lists recent blocking, muting, and filtering actions
- **Effectiveness Statistics**: Analyzes the effectiveness of different filtering rules and lists

## Batch Operations

Batch operations allow you to manage multiple Twitter accounts at once, improving content management efficiency.

### Batch Blocking

1. Click the "Batch Operations" tab in the extension panel
2. Enter keywords in the search box
3. The system will display a list of Twitter accounts matching the criteria
4. Use checkboxes to select accounts to block
5. Click the "Block Selected Users" button to execute batch blocking

![batch blocking](/docs/batch-block.png)

### Advanced Filtering

Batch operations support various advanced filtering conditions:

- Whether the account is blocked
- Whether it's a verified account
- Whether you're following them

By combining these conditions, you can precisely target potential spam accounts.

## Moderation Lists

> This feature requires login, which can be done using email registration.

Moderation lists are powerful community content management tools that allow users to create and subscribe to various filter rule collections.

### Creating a Moderation List

1. Navigate to the **Moderation Lists** tab
2. Click the **Create new list** icon in the top right
3. Enter the list name and description
4. After saving, you'll enter the list details page

![create moderation list](/docs/modlist-create.png)

### Adding Users to a List

1. Click the **Add people** button
2. Search for Twitter users to add
3. Check relevant users (multiple selection supported)
4. Click **Add** to confirm

### Adding Rules to a List

1. On the moderation list details page, click the Rules tab
2. Click the **Add rule** button
3. Select matching fields, such as **Username, Description, Tweet Text**, etc.
4. Set matching conditions and application scope
5. Save the rule to the list

### Subscribing to Others' Moderation Lists

1. Browse public moderation lists in **Moderation Lists**
2. Click on an interesting list to view details
3. Click the **Subscribe** button
4. Choose application method:
   - Mute (only hide content)
   - Block (completely prevent interaction)
5. Confirm subscription

![subscribe to moderation list](/docs/modlist-subscribe.png)

### Managing Subscriptions

In the **Subscribed** section, you can:

- View all subscribed moderation lists
- Modify application method (mute/block)
- Cancel unwanted subscriptions

## Quick Block

The Quick Block feature allows you to quickly handle suspicious accounts directly on the Twitter interface without secondary confirmation or popups. It blocks immediately, and related tweets will be removed from your timeline.

![quick block](/docs/quick-block.png)

## Keyword Blocking

Keyword blocking allows you to automatically filter Twitter content based on specific words or phrases, with the option to automatically execute Block operations.

### Setting Up Keywords

1. Click the **Muted Words** tab in the extension panel
2. Click the **Add new word** icon in the top right
3. Enter the keyword or phrase to block
4. Select application scope:
   - Tweet content only
   - Username
   - User bio
   - User location
5. Choose action type:
   - Mute (hide content)
   - Block (prevent account)
6. Save settings

![keyword blocking](/docs/keyword-filter.png)

### Managing Keywords

You can:

- Add/remove specific keywords
- Edit matching conditions for existing keywords

### Contributing

When you block spam accounts, it will automatically be submitted to the remote shared database. Your contribution will help other users avoid the same spam content. You can opt out of the shared blacklist feature at any time.

## Settings

The plugin offers rich customization options to meet different users' needs.

### General Settings

- **Interface Theme**: Choose light/dark/follow system
- **Language**: Select extension language

### Filter Settings

- **Hide Suspicious Accounts**: Hide suspicious accounts
- **Hide Spam Accounts**: Hide spam accounts
- **Hide Mute Words**: Hide keywords
- **Hide Moderation Lists**: Hide moderation lists
- **Hide Blue Verified Accounts**: Hide blue checkmark accounts
- **Hide Languages**: Hide tweets in specified languages

![settings page](/docs/settings/filter-control.png)

By adjusting these settings, you can create a Twitter purification tool that matches your usage habits.
