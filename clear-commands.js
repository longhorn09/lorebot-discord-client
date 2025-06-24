"use strict";

import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';

// Load environment variables
config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
/**
 * https://discordjs.guide/slash-commands/deleting-commands.html#deleting-specific-commands
 * https://v13.discordjs.guide/creating-your-bot/deleting-commands.html#deleting-specific-commands
 */
(async () => {
  try {
    console.log('🗑️  Clearing all application (/) commands...');

    // Clear all guild commands
    		// for guild-based commands 
		const data = await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: [] })
    .then(() => console.log('✅ Successfully cleared all application (/) commands.'))
    .catch(console.error);

    console.log('📝 You can now run "npm run deploy" to register the current commands.');
    
  } catch (error) {
    console.error('❌ Error clearing commands:', error);
  }
})(); 