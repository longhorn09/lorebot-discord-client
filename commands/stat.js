"use strict";

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { graphqlClient } from '../utils/graphql.js';
import { CursorPaginationManager } from '../utils/pagination.js';

export const data = new SlashCommandBuilder()
  .setName('stat')
  .setDescription('Display statistics and detailed lore information')
  .addStringOption(option =>
    option.setName('item')
      .setDescription('Search term for lore items (optional)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('limit')
      .setDescription('Number of items to show per page (default: 3)')
      .setMinValue(1)
      .setMaxValue(10));

export async function execute(interaction) {
  await interaction.deferReply();

  const searchTerm = interaction.options.getString('item');
  const limit = interaction.options.getInteger('limit') || 3;

  try {
    // GraphQL query for SearchLore with detailed fields
    const query = `
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
              ITEM_TYPE
              ITEM_IS
              SUBMITTER
              AFFECTS
              APPLY
              RESTRICTS
              CREATE_DATE
              CLASS
              MAT_CLASS
              MATERIAL
              ITEM_VALUE
              EXTRA
              IMMUNE
              EFFECTS
              WEIGHT
              CAPACITY
              ITEM_LEVEL
              CONTAINER_SIZE
              CHARGES
              SPEED
              ACCURACY
              POWER
              DAMAGE
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
      searchToken: searchTerm,
      first: limit,
      after: null,
    };

    // Debug logging
    if (process.env.DEBUG === 'true' || process.env.DEBUG === '1') {
      console.log('=== STAT COMMAND DEBUG ===');
      console.log('GraphQL Query:', query);
      console.log('Variables:', JSON.stringify(variables, null, 2));
      console.log('Search term:', searchTerm);
      console.log('==========================');
    }

    const result = await graphqlClient.query(query, variables);
    
    if (!result.allLorePaginated || result.allLorePaginated.edges.length === 0) {
      return await interaction.editReply({ 
        content: `\`\`\`No lore items found${searchTerm ? ` matching '${searchTerm}'` : ''}.\`\`\``,
        ephemeral: true 
      });
    }

    // Create pagination manager
    const items = result.allLorePaginated.edges.map(edge => edge.node);
    const pageInfo = result.allLorePaginated.pageInfo;
    const totalCount = result.allLorePaginated.totalCount;
    
    const paginationManager = new CursorPaginationManager(
      items,
      pageInfo.endCursor,
      pageInfo.hasNextPage,
      pageInfo.hasPreviousPage,
      async (cursor, direction) => {
        const newVariables = {
          searchToken: searchTerm,
          first: limit,
          after: cursor,
        };
        
        const newResult = await graphqlClient.query(query, newVariables);
        return {
          items: newResult.allLorePaginated.edges.map(edge => edge.node),
          cursor: newResult.allLorePaginated.pageInfo.endCursor,
          hasNextPage: newResult.allLorePaginated.pageInfo.hasNextPage,
          hasPreviousPage: newResult.allLorePaginated.pageInfo.hasPreviousPage,
        };
      }
    );

    // Override formatPageContent to show detailed lore information
    paginationManager.formatPageContent = (pageItems) => {
      return pageItems.map((item, index) => {
        const itemNumber = index + 1;
        let details = `**${itemNumber}. ${item.OBJECT_NAME}**\n`;
        
        if (item.ITEM_TYPE) details += `Type: ${item.ITEM_TYPE}\n`;
        if (item.ITEM_IS) details += `Item: ${item.ITEM_IS}\n`;
        if (item.CLASS) details += `Class: ${item.CLASS}\n`;
        if (item.MATERIAL) details += `Material: ${item.MATERIAL}\n`;
        if (item.ITEM_LEVEL) details += `Level: ${item.ITEM_LEVEL}\n`;
        if (item.ITEM_VALUE) details += `Value: ${item.ITEM_VALUE}\n`;
        if (item.WEIGHT) details += `Weight: ${item.WEIGHT}\n`;
        if (item.AFFECTS) details += `Affects: ${item.AFFECTS}\n`;
        if (item.EFFECTS) details += `Effects: ${item.EFFECTS}\n`;
        if (item.SUBMITTER) details += `Submitted by: ${item.SUBMITTER}\n`;
        if (item.CREATE_DATE) details += `Created: ${new Date(item.CREATE_DATE).toLocaleDateString()}\n`;
        
        return details;
      }).join('\n');
    };

    const pageContent = paginationManager.getCurrentPageContent();
    
    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);
    
    // Create the message content with search term, total count and page info
    const messageContent = `**Lore Statistics${searchTerm ? ` - Search: '${searchTerm}'` : ''} (${totalCount} total)**\n\`\`\`\n${pageContent.content}\n\`\`\`\nPage ${pageContent.pageInfo.split(' ')[1]} of ${totalPages}`;
    
    const navigationRow = paginationManager.createNavigationRow();
    
    const message = await interaction.editReply({ 
      content: messageContent,
      components: [navigationRow],
      ephemeral: true 
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
        const newMessageContent = `**Lore Statistics${searchTerm ? ` - Search: '${searchTerm}'` : ''} (${totalCount} total)**\n\`\`\`\n${newPageContent.content}\n\`\`\`\nPage ${newPageContent.pageInfo.split(' ')[1]} of ${totalPages}`;
        
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
    console.error('Stat command error:', error);
    
    await interaction.editReply({ 
      content: "```Error: Failed to fetch lore statistics. Please try again.```",
      ephemeral: true 
    });
  }
}