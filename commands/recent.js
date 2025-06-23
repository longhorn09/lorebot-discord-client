"use strict";

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { graphqlClient } from '../utils/graphql.js';
import { CursorPaginationManager } from '../utils/pagination.js';

export const data = new SlashCommandBuilder()
  .setName('recent')
  .setDescription('Show recent entries with pagination')
  .addIntegerOption(option =>
    option.setName('limit')
      .setDescription('Number of recent entries to show (default: 10)')
      .setMinValue(1)
      .setMaxValue(25));

export async function execute(interaction) {
  await interaction.deferReply();

  const limit = interaction.options.getInteger('limit') || 10;

  try {
    // Example GraphQL query for recent entries - adjust based on your actual schema
    const query = `
      query GetRecentEntries($limit: Int!, $cursor: String) {
        recentEntries(first: $limit, after: $cursor) {
          edges {
            node {
              id
              title
              description
              createdAt
              updatedAt
            }
            cursor
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    const variables = {
      limit: limit,
    };

    const result = await graphqlClient.query(query, variables);
    
    if (!result.recentEntries || result.recentEntries.edges.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('📝 No Recent Entries')
        .setDescription('No recent entries found.')
        .setTimestamp();
      
      return await interaction.editReply({ embeds: [embed] });
    }

    // Create pagination manager
    const items = result.recentEntries.edges.map(edge => edge.node);
    const pageInfo = result.recentEntries.pageInfo;
    
    const paginationManager = new CursorPaginationManager(
      items,
      pageInfo.endCursor,
      pageInfo.hasNextPage,
      pageInfo.hasPreviousPage,
      async (cursor, direction) => {
        const newVariables = {
          ...variables,
          cursor: cursor,
        };
        
        const newResult = await graphqlClient.query(query, newVariables);
        return {
          items: newResult.recentEntries.edges.map(edge => edge.node),
          cursor: newResult.recentEntries.pageInfo.endCursor,
          hasNextPage: newResult.recentEntries.pageInfo.hasNextPage,
          hasPreviousPage: newResult.recentEntries.pageInfo.hasPreviousPage,
        };
      }
    );

    // Override formatPageContent for better display
    paginationManager.formatPageContent = (pageItems) => {
      return pageItems.map((item, index) => {
        const createdDate = new Date(item.createdAt).toLocaleDateString();
        const updatedDate = new Date(item.updatedAt).toLocaleDateString();
        const isUpdated = item.createdAt !== item.updatedAt;
        
        return `${index + 1}. **${item.title}**\n${item.description}\n*Created: ${createdDate}${isUpdated ? ` | Updated: ${updatedDate}` : ''}*`;
      }).join('\n\n');
    };

    const pageContent = paginationManager.getCurrentPageContent();
    
    const embed = new EmbedBuilder()
      .setColor(0x2196F3)
      .setTitle('📝 Recent Entries')
      .setDescription(pageContent.content)
      .setFooter({ text: pageContent.pageInfo })
      .setTimestamp();

    const navigationRow = paginationManager.createNavigationRow();
    
    const message = await interaction.editReply({ 
      embeds: [embed], 
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
        const newEmbed = EmbedBuilder.from(embed)
          .setDescription(newPageContent.content)
          .setFooter({ text: newPageContent.pageInfo });

        const newNavigationRow = paginationManager.createNavigationRow();
        
        await i.update({ 
          embeds: [newEmbed], 
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
    console.error('Recent command error:', error);
    
    const embed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle('❌ Error')
      .setDescription('An error occurred while fetching recent entries. Please try again.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
} 