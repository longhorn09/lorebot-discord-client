# LoreBot Discord Client

A Node.js Discord bot built with Discord.js v14 and ES modules, featuring GraphQL integration for data retrieval and pagination support.

## Features

- **Modern Discord.js v14**: Built with the latest Discord.js library using ES modules
- **GraphQL Integration**: Seamless integration with GraphQL APIs for data retrieval
- **Pagination Support**: Built-in pagination with Next/Previous buttons for handling Discord's character limits
- **Slash Commands**: Modern slash command interface with proper error handling
- **Cursor-based Pagination**: Support for GraphQL cursor-based pagination
- **Embedded Responses**: Rich embedded messages with proper formatting

## Commands

- `/help` - Shows available commands and their usage
- `/query <search> [limit]` - Search for specific data using GraphQL
- `/recent [limit]` - Show recent entries with pagination
- `/stat` - Display statistics and metrics

## Prerequisites

- Node.js 18+ (for ES modules support)
- Discord Bot Token
- GraphQL API endpoint
- Discord Guild (Server) ID

## Installation

1. Clone the repository:
```bash
git clone https://github.com/longhorn09/lorebot-discord-client.git
cd lorebot-discord-client
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Create a `.env.template` file in the root directory with the following content:
   ```env
   # Discord Bot Configuration
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_discord_client_id_here
   GUILD_ID=your_discord_guild_id_here

   # GraphQL API Configuration
   GRAPHQL_ENDPOINT=your_graphql_api_endpoint_here
   GRAPHQL_TOKEN=your_graphql_auth_token_here
   ```
   - Rename `.env.template` to `.env`
   - Replace the placeholder values with your actual configuration

4. Deploy slash commands:
```bash
npm run deploy
```

5. Start the bot:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Environment Variables

Copy and paste this into your `.env` file:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
GUILD_ID=your_discord_guild_id_here

# GraphQL API Configuration
GRAPHQL_ENDPOINT=your_graphql_api_endpoint_here
GRAPHQL_TOKEN=your_graphql_auth_token_here
```

## Project Structure

```
lorebot-discord-client/
├── commands/           # Slash command implementations
│   ├── help.js        # Help command
│   ├── query.js       # Search query command
│   ├── recent.js      # Recent entries command
│   └── stat.js        # Statistics command
├── events/            # Discord event handlers
│   ├── ready.js       # Bot ready event
│   └── interactionCreate.js  # Command interaction handler
├── utils/             # Utility modules
│   ├── graphql.js     # GraphQL client
│   └── pagination.js  # Pagination utilities
├── index.js           # Main bot entry point
├── deploy-commands.js # Command deployment script
├── package.json       # Dependencies and scripts
├── .env.template      # Environment variables template (create this)
└── .env              # Environment variables (rename from .env.template)
```

## GraphQL Integration

The bot includes a flexible GraphQL client that supports:
- Query and mutation operations
- Authentication via Bearer tokens
- Error handling and logging
- Cursor-based pagination

Example GraphQL queries are included in the command files and can be customized based on your actual GraphQL schema.

## Pagination

The bot includes two pagination managers:
- **PaginationManager**: For simple array-based pagination
- **CursorPaginationManager**: For GraphQL cursor-based pagination

Both support:
- Next/Previous navigation buttons
- Automatic button state management
- User-specific pagination sessions
- Timeout cleanup

## Development

### Adding New Commands

1. Create a new file in the `commands/` directory
2. Export `data` (SlashCommandBuilder) and `execute` (function)
3. The command will be automatically loaded on startup

### Adding New Events

1. Create a new file in the `events/` directory
2. Export `name`, `once` (boolean), and `execute` (function)
3. The event will be automatically registered on startup

## License

ISC License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions, please use the GitHub issues page.