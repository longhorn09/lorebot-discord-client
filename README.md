# LoreBot Discord Client

A Node.js Discord bot built with Discord.js v14 and ES modules, featuring GraphQL integration for data retrieval and pagination support.

## Features

- **Modern Discord.js v14**: Built with the latest Discord.js library using ES modules
- **GraphQL Integration**: Seamless integration with GraphQL APIs for data retrieval
- **Pagination Support**: Built-in pagination with Next/Previous buttons for handling Discord's character limits
- **Slash Commands**: Modern slash command interface with proper error handling
- **Cursor-based Pagination**: Support for GraphQL cursor-based pagination
- **Ephemeral Responses**: All responses are private to the user for cleaner channels
- **Debug Logging**: Comprehensive debug output when `DEBUG=true`
- **Moment.js Integration**: Human-readable date formatting for timestamps

## Commands

- `/help` - Shows available commands and their usage
- `/brief <item> [limit]` - Shows brief list of lore items matching the search term (default: 20 items)
- `/stat [search] [limit]` - Shows detailed lore statistics and information (default: 3 items)
- `/who <character> [limit]` - Shows character information and stats
- `/query <search> [limit]` - Search for specific data using GraphQL
- `/recent [limit]` - Show recent entries with pagination

## Prerequisites

- Node.js 18+ (for ES modules support)
- Discord Bot Token
- GraphQL API endpoint ([source code](https://github.com/longhorn09/lorebot-graphql-api))
- Discord Guild (Server) ID

## Installation

```bash
# Clone the repository
git clone https://github.com/longhorn09/lorebot-discord-client.git
cd lorebot-discord-client

npm install            # Install dependencies

# Set up environment variables (copy template and edit)
cp .env.template .env
vim .env               # Replace placeholder values with your actual configuration
npm run clear          # Clear existing commands (if needed)
npm run deploy         # Deploy slash commands globally (works in DMs)
npm start              # Start the bot
npm run dev            # For development with auto-restart
```

## Project Structure

```
lorebot-discord-client/
├── commands/           # Slash command implementations
│   ├── help.js        # Help command
│   ├── brief.js       # Brief lore items command
│   ├── stat.js        # Detailed statistics command
│   ├── who.js         # Character information command
│   ├── whoall.js      # All characters information command
│   ├── query.js       # Search query command
│   └── recent.js      # Recent entries command
├── events/            # Discord event handlers
│   ├── ready.js       # Bot ready event
│   ├── interactionCreate.js  # Command interaction handler
│   └── messageCreate.js      # Message event handler (lore/look paste detection)
├── handlers/          # Message content handlers
│   ├── lorePasteHandler.js   # Lore parsing handler
│   └── lookPasteHandler.js   # Equipment parsing handler
├── utils/             # Utility modules
│   ├── graphql.js     # GraphQL client utility
│   └── pagination.js  # Pagination utilities (PaginationManager, CursorPaginationManager)
├── index.js           # Main bot entry point
├── deploy-commands.js # Command deployment script (global commands for DMs)
├── clear-commands.js  # Command cleanup script
├── package.json       # Dependencies and scripts
├── package-lock.json  # Dependency lock file
├── .gitignore         # Git ignore patterns
├── LICENSE            # MIT License
├── .env.template      # Environment variables template
└── .env              # Environment variables (create from template)
```

## GraphQL Integration

The bot includes a flexible GraphQL client that supports:
- Query and mutation operations
- Authentication via Bearer tokens
- Error handling and logging
- Cursor-based pagination
- Debug logging for development

### Example GraphQL Queries

The bot uses standardized GraphQL queries with cursor pagination:

```graphql
query SearchLore($searchToken: String!, $first: Int, $after: String) {
  allLorePaginated(
    searchToken: $searchToken,
    first: $first,
    after: $after
  ) {
    edges {
      node {
        LORE_ID
        OBJECT_NAME
        # ... additional fields
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

## Pagination

The bot includes two pagination managers:
- **PaginationManager**: For simple array-based pagination
- **CursorPaginationManager**: For GraphQL cursor-based pagination

Both support:
- Next/Previous navigation buttons
- Automatic button state management
- User-specific pagination sessions
- Timeout cleanup (5 minutes)
- Page counting (Page X of Y format)

## Command Details

### `/brief <item> [limit]`
- **Purpose**: Shows brief list of lore items matching the search term
- **Default limit**: 20 items per page
- **Format**: `Object 'item_name'` format
- **Example**: `/brief ring`, `/brief mithril.rapier limit:10`

### `/stat [search] [limit]`
- **Purpose**: Shows detailed lore statistics and information
- **Default limit**: 3 items per page
- **Features**: Comprehensive item details with formatted affects
- **Example**: `/stat`, `/stat ring limit:5`

### `/who <character> [limit]`
- **Purpose**: Shows character information and stats
- **Default limit**: 10 items per page
- **Features**: Character stats, levels, equipment, etc.
- **Example**: `/who Drunoob`, `/who Drunoob limit:5`

## Development

### Adding New Commands

1. Create a new file in the `commands/` directory
2. Export `data` (SlashCommandBuilder) and `execute` (function)
3. Include `MessageFlags` import for ephemeral responses
4. The command will be automatically loaded on startup

### Adding New Events

1. Create a new file in the `events/` directory
2. Export `name`, `once` (boolean), and `execute` (function)
3. The event will be automatically registered on startup

### Debug Mode

For additional logging during development, toggle `DEBUG` flag in `.env`

```env
DEBUG=true
```

## Epilogue
- For support, please use the [issues page](https://github.com/longhorn09/lorebot-discord-client/issues).
- License: MIT
- Contribute: Submit a [pull request](https://github.com/longhorn09/lorebot-discord-client/pulls)
- Donate: Any donation amount greatly appreciated [gofundme](https://gofund.me/e00951cc)