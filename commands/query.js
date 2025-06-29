"use strict";

import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('query')
  .setDescription('Search for specific data using GraphQL')
  .addStringOption(option =>
    option.setName('search')
      .setDescription('Search term to query for')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('limit')
      .setDescription('Number of results to return (default: 10)')
      .setMinValue(1)
      .setMaxValue(25));

export async function execute(interaction) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  try {
    await interaction.editReply({ 
      content: '```Coming soon```',
      flags: [MessageFlags.Ephemeral] 
    });

  } catch (error) {
    console.error('Query command error:', error);
    
    await interaction.editReply({ 
      content: '```Error: An error occurred while processing your request.```',
      flags: [MessageFlags.Ephemeral] 
    });
  }
} 