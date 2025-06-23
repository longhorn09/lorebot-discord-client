"use strict";

import { SlashCommandBuilder } from 'discord.js';
import { graphqlClient } from '../utils/graphql.js';
import { CursorPaginationManager } from '../utils/pagination.js';

export const data = new SlashCommandBuilder()
  .setName('brief')
  .setDescription('Shows brief list of lore items matching the search term')
  .addStringOption(option =>
    option.setName('item')
      .setDescription('Item to search for (e.g., ring, mithril.rapier, large.bronze.shield)')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('limit')
      .setDescription('Number of items to show per page (default: 10)')
      .setMinValue(1)
      .setMaxValue(25));

export async function execute(interaction) {
  await interaction.deferReply();

  const itemSearch = interaction.options.getString('item');
  const limit = interaction.options.getInteger('limit') || 10;

  try {
    // GraphQL query for allLoreConnection with cursor pagination (no filtering yet)
    const query = `
      query GetAllLoreConnection($first: Int!, $after: String) {
        allLoreConnection(first: $first, after: $after) {
          edges {
            node {
              LORE_ID
              OBJECT_NAME
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
      first: limit,
    };

    // Debug logging
    if (process.env.DEBUG === 'true' || process.env.DEBUG === '1') {
      console.log('=== BRIEF COMMAND DEBUG ===');
      console.log('GraphQL Query:', query);
      console.log('Variables:', JSON.stringify(variables, null, 2));
      console.log('Search term (ignored for now):', itemSearch);
      console.log('==========================');
    }

    const result = await graphqlClient.query(query, variables);
    
    if (!result.allLoreConnection || result.allLoreConnection.edges.length === 0) {
      return await interaction.editReply({ 
        content: `\`\`\`No lore items found matching '${itemSearch}'.\`\`\``,
        ephemeral: true 
      });
    }

    // Create pagination manager
    const items = result.allLoreConnection.edges.map(edge => edge.node);
    const pageInfo = result.allLoreConnection.pageInfo;
    const totalCount = result.allLoreConnection.totalCount;
    
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
          items: newResult.allLoreConnection.edges.map(edge => edge.node),
          cursor: newResult.allLoreConnection.pageInfo.endCursor,
          hasNextPage: newResult.allLoreConnection.pageInfo.hasNextPage,
          hasPreviousPage: newResult.allLoreConnection.pageInfo.hasPreviousPage,
        };
      }
    );

    // Override formatPageContent to show OBJECT_NAME values
    paginationManager.formatPageContent = (pageItems) => {
      return pageItems.map(item => `Object '${item.OBJECT_NAME}'`).join('\n');
    };

    const pageContent = paginationManager.getCurrentPageContent();
    
    // Calculate total pages based on total count and limit
    const totalPages = Math.ceil(totalCount / limit);
    
    // Create the message content with search term, total count and page info
    const messageContent = `**Lore Items matching '${itemSearch}' (${totalCount} total)**\n\`\`\`\n${pageContent.content}\n\`\`\`\nPage ${pageContent.pageInfo.split(' ')[1]} of ${totalPages}`;
    
    const navigationRow = paginationManager.createNavigationRow();
    
    const message = await interaction.editReply({ 
      content: messageContent,
      components: [navigationRow] 
    });

    // Store pagination manager for button interactions
    interaction.client.paginationManagers = interaction.client.paginationManagers || new Map();
    interaction.client.paginationManagers.set(message.id, paginationManager);

    // Set up button collector
    const collector = message.createMessageComponentCollector({ time: 300000 }); // 5 minutes

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: 'This pagination is not for you!', ephemeral: true });
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
        const newMessageContent = `**Lore Items matching '${itemSearch}' (${totalCount} total)**\n\`\`\`\n${newPageContent.content}\n\`\`\`\nPage ${newPageContent.pageInfo.split(' ')[1]} of ${totalPages}`;
        
        const newNavigationRow = paginationManager.createNavigationRow();
        
        await i.update({ 
          content: newMessageContent,
          components: [newNavigationRow] 
        });
      } else {
        await i.reply({ content: 'No more pages available!', ephemeral: true });
      }
    });

    collector.on('end', () => {
      interaction.client.paginationManagers.delete(message.id);
    });

  } catch (error) {
    console.error('Brief command error:', error);
    
    await interaction.editReply({ 
      content: `\`\`\`Error: Failed to fetch lore items for '${itemSearch}'. Please try again.\`\`\``,
      ephemeral: true 
    });
  }
}