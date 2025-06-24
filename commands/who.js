"use strict";

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { graphqlClient } from '../utils/graphql.js';
import { CursorPaginationManager } from '../utils/pagination.js';

export const data = new SlashCommandBuilder()
  .setName('who')
  .setDescription('Shows character information')
  .addStringOption(option =>
    option.setName('character')
      .setDescription('Character name to search for (e.g., Drunoob)')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('limit')
      .setDescription('Number of items to show per page (default: 10)')
      .setMinValue(1)
      .setMaxValue(25));

export async function execute(interaction) {
  await interaction.deferReply();

  const characterName = interaction.options.getString('character');
  const limit = interaction.options.getInteger('limit') || 10;

  try {
    // GraphQL query for character information - placeholder structure
    const query = `
      query GetCharacterInfo($characterName: String!, $first: Int, $after: String) {
        characterInfo(
          characterName: $characterName,
          first: $first,
          after: $after
        ) {
          edges {
            node {
              CHARACTER_ID
              CHARACTER_NAME
              LEVEL
              CLASS
              RACE
              ALIGNMENT
              EXPERIENCE
              GOLD
              BANK
              HITPOINTS
              MANA
              MOVEMENT
              STRENGTH
              INTELLIGENCE
              WISDOM
              DEXTERITY
              CONSTITUTION
              CHARISMA
              ARMOR_CLASS
              HITROLL
              DAMROLL
              SAVING_THROW
              LAST_LOGIN
              CREATED_DATE
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
    `;

    const variables = {
      characterName: characterName,
      first: limit,
      after: null,
    };

    // Debug logging
    if (process.env.DEBUG === 'true' || process.env.DEBUG === '1') {
      console.log('=== WHO COMMAND DEBUG ===');
      console.log('GraphQL Query:', query);
      console.log('Variables:', JSON.stringify(variables, null, 2));
      console.log('Character name:', characterName);
      console.log('==========================');
    }

    const result = await graphqlClient.query(query, variables);
    
    if (!result.characterInfo || result.characterInfo.edges.length === 0) {
      return await interaction.editReply({ 
        content: `\`\`\`No character information found for '${characterName}'.\`\`\``,
        flags: [MessageFlags.Ephemeral] 
      });
    }

    // Create pagination manager
    const items = result.characterInfo.edges.map(edge => edge.node);
    const pageInfo = result.characterInfo.pageInfo;
    const totalCount = result.characterInfo.totalCount;
    
    const paginationManager = new CursorPaginationManager(
      items,
      pageInfo.endCursor,
      pageInfo.hasNextPage,
      pageInfo.hasPreviousPage,
      async (cursor, direction) => {
        const newVariables = {
          ...variables,
          after: cursor,
        };
        
        const newResult = await graphqlClient.query(query, newVariables);
        return {
          items: newResult.characterInfo.edges.map(edge => edge.node),
          cursor: newResult.characterInfo.pageInfo.endCursor,
          hasNextPage: newResult.characterInfo.pageInfo.hasNextPage,
          hasPreviousPage: newResult.characterInfo.pageInfo.hasPreviousPage,
        };
      }
    );

    // Override formatPageContent to show character information
    paginationManager.formatPageContent = (pageItems) => {
      return pageItems.map((character, index) => {
        const charNumber = index + 1;
        let details = `**${charNumber}. ${character.CHARACTER_NAME}**\n`;
        
        if (character.LEVEL) details += `Level: ${character.LEVEL}\n`;
        if (character.CLASS) details += `Class: ${character.CLASS}\n`;
        if (character.RACE) details += `Race: ${character.RACE}\n`;
        if (character.ALIGNMENT) details += `Alignment: ${character.ALIGNMENT}\n`;
        if (character.EXPERIENCE) details += `Experience: ${character.EXPERIENCE}\n`;
        if (character.GOLD) details += `Gold: ${character.GOLD}\n`;
        if (character.BANK) details += `Bank: ${character.BANK}\n`;
        if (character.HITPOINTS) details += `HP: ${character.HITPOINTS}\n`;
        if (character.MANA) details += `Mana: ${character.MANA}\n`;
        if (character.MOVEMENT) details += `Movement: ${character.MOVEMENT}\n`;
        if (character.STRENGTH) details += `STR: ${character.STRENGTH}\n`;
        if (character.INTELLIGENCE) details += `INT: ${character.INTELLIGENCE}\n`;
        if (character.WISDOM) details += `WIS: ${character.WISDOM}\n`;
        if (character.DEXTERITY) details += `DEX: ${character.DEXTERITY}\n`;
        if (character.CONSTITUTION) details += `CON: ${character.CONSTITUTION}\n`;
        if (character.CHARISMA) details += `CHA: ${character.CHARISMA}\n`;
        if (character.ARMOR_CLASS) details += `AC: ${character.ARMOR_CLASS}\n`;
        if (character.HITROLL) details += `Hitroll: ${character.HITROLL}\n`;
        if (character.DAMROLL) details += `Damroll: ${character.DAMROLL}\n`;
        if (character.SAVING_THROW) details += `Saving Throw: ${character.SAVING_THROW}\n`;
        if (character.LAST_LOGIN) details += `Last Login: ${new Date(character.LAST_LOGIN).toLocaleDateString()}\n`;
        if (character.CREATED_DATE) details += `Created: ${new Date(character.CREATED_DATE).toLocaleDateString()}\n`;
        
        return details;
      }).join('\n');
    };

    const pageContent = paginationManager.getCurrentPageContent();
    
    // Calculate total pages based on total count and limit
    const totalPages = Math.ceil(totalCount / limit);
    
    // Create the message content with character name, total count and page info
    const messageContent = `**Character Information for '${characterName}' (${totalCount} total)**\n\`\`\`\n${pageContent.content}\n\`\`\`\nPage ${pageContent.pageInfo.split(' ')[1]} of ${totalPages}`;
    
    const navigationRow = paginationManager.createNavigationRow();
    
    const message = await interaction.editReply({ 
      content: messageContent,
      components: [navigationRow],
      flags: [MessageFlags.Ephemeral] 
    });

    // Store pagination manager for button interactions
    interaction.client.paginationManagers = interaction.client.paginationManagers || new Map();
    interaction.client.paginationManagers.set(message.id, paginationManager);

    // Set up button collector
    const collector = message.createMessageComponentCollector({ time: 300000 }); // 5 minutes

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: 'This pagination is not for you!', flags: [MessageFlags.Ephemeral] });
        return;
      }

      const paginationManager = interaction.client.paginationManagers.get(message.id);
      if (!paginationManager) return;

      let success = false;
      if (i.customId === 'next') {
        success = await paginationManager.nextPage();
      } else if (i.customId === 'previous') {
        success = await paginationManager.previousPage();
      }

      if (success) {
        const newPageContent = paginationManager.getCurrentPageContent();
        const newMessageContent = `**Character Information for '${characterName}' (${totalCount} total)**\n\`\`\`\n${newPageContent.content}\n\`\`\`\nPage ${newPageContent.pageInfo.split(' ')[1]} of ${totalPages}`;
        
        const newNavigationRow = paginationManager.createNavigationRow();
        
        await i.update({ 
          content: newMessageContent,
          components: [newNavigationRow] 
        });
      } else {
        await i.reply({ content: 'No more pages available!', flags: [MessageFlags.Ephemeral] });
      }
    });

    collector.on('end', () => {
      interaction.client.paginationManagers.delete(message.id);
    });

  } catch (error) {
    console.error('Who command error:', error);
    
    await interaction.editReply({ 
      content: `\`\`\`Error: Failed to fetch character information for '${characterName}'. Please try again.\`\`\``,
      flags: [MessageFlags.Ephemeral] 
    });
  }
} 