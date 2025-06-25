"use strict";

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { graphqlClient } from '../utils/graphql.js';
import { CursorPaginationManager } from '../utils/pagination.js';

export const data = new SlashCommandBuilder()
  .setName('whoall')
  .setDescription('Shows all characters')
  .addIntegerOption(option =>
    option.setName('limit')
      .setDescription('Number of items to show per page (default: 39)')
      .setMinValue(1)
      .setMaxValue(42));

export async function execute(interaction) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  // default 20 items if not explicitly specified by user in discord option upon slash command invocation
  const limit = interaction.options.getInteger('limit') || 39;    

  try {
    // GraphQL query for all characters - only PERSON_ID and CHARNAME fields
    const query = `
      query GetAllPersons($first: Int, $after: String) {
        allPersonsConnection(
          first: $first
          after: $after
          # orderBy: CREATE_DATE_DESC
        ) {
          edges {
            node {
              PERSON_ID
              CHARNAME              
              CREATE_DATE
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
      after: null,
    };

    // Debug logging
    if (process.env.DEBUG === 'true' || process.env.DEBUG === '1') {
      console.log('=== WHOALL COMMAND DEBUG ===');
      console.log('GraphQL Query:', query);
      console.log('Variables:', JSON.stringify(variables, null, 2));
      console.log('===========================');
    }

    const result = await graphqlClient.query(query, variables);
    
    if (!result.allPersonsConnection || result.allPersonsConnection.edges.length === 0) {
      return await interaction.editReply({ 
        content: `\`\`\`No characters found.\`\`\``,
        flags: [MessageFlags.Ephemeral] 
      });
    }

    // Create pagination manager
    const items = result.allPersonsConnection.edges.map(edge => edge.node);
    const pageInfo = result.allPersonsConnection.pageInfo;
    const totalCount = result.allPersonsConnection.totalCount;
    
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
          items: newResult.allPersonsConnection.edges.map(edge => edge.node),
          cursor: newResult.allPersonsConnection.pageInfo.endCursor,
          hasNextPage: newResult.allPersonsConnection.pageInfo.hasNextPage,
          hasPreviousPage: newResult.allPersonsConnection.pageInfo.hasPreviousPage,
        };
      }
    );

    // Override formatPageContent to show character list
    paginationManager.formatPageContent = (pageItems) => {
      const formattedNames = pageItems.map(character => {
        // Format character name: first letter uppercase, rest lowercase
        return character.CHARNAME.charAt(0).toUpperCase() + character.CHARNAME.slice(1).toLowerCase();
      });
      
      // Group names into rows of 3 with even spacing
      const rows = [];
      for (let i = 0; i < formattedNames.length; i += 3) {
        const row = formattedNames.slice(i, i + 3);
        // Pad the row to ensure even spacing (max 3 names per row)
        while (row.length < 3) {
          row.push(''); // Add empty string for spacing
        }
        
        // Use padEnd to ensure proper column alignment
        // First column: pad to accommodate longest name in first column
        // Second column: pad to accommodate longest name in second column
        const paddedRow = [
          row[0].padEnd(20), // Adjust 20 based on your longest expected name
          row[1].padEnd(20), // Adjust 20 based on your longest expected name
          row[2] // Last column doesn't need padding
        ];
        
        rows.push(paddedRow.join(''));
      }
      
      return rows.join('\n');
    };

    const pageContent = paginationManager.getCurrentPageContent();
    
    // Calculate total pages based on total count and limit
    const totalPages = Math.ceil(totalCount / limit);
    
    // Create the message content with total count and page info
    const messageContent = `**All characters (${totalCount} total)**\n\`\`\`\n${pageContent.content}\n\`\`\`\nPage ${pageContent.pageInfo.split(' ')[1]} of ${totalPages}`;
    
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
        const newMessageContent = `**All Characters (${totalCount} total)**\n\`\`\`\n${newPageContent.content}\n\`\`\`\nPage ${newPageContent.pageInfo.split(' ')[1]} of ${totalPages}`;
        
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
    console.error('Whoall command error:', error);
    
    await interaction.editReply({ 
      content: `\`\`\`Error: Failed to fetch character list. Please try again.\`\`\``,
      flags: [MessageFlags.Ephemeral] 
    });
  }
} 