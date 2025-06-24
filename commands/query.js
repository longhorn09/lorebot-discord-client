"use strict";

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { graphqlClient } from '../utils/graphql.js';
import { CursorPaginationManager } from '../utils/pagination.js';

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

  const searchTerm = interaction.options.getString('search');
  const limit = interaction.options.getInteger('limit') || 10;

  try {
    // Example GraphQL query - adjust based on your actual schema
    const query = `
      query SearchData($search: String!, $limit: Int!, $cursor: String) {
        searchData(search: $search, first: $limit, after: $cursor) {
          edges {
            node {
              id
              title
              description
              createdAt
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
      search: searchTerm,
      limit: limit,
    };

    const result = await graphqlClient.query(query, variables);
    
    if (!result.searchData || result.searchData.edges.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('🔍 No Results Found')
        .setDescription(`No data found for search term: "${searchTerm}"`)
        .setTimestamp();
      
      return await interaction.editReply({ embeds: [embed] });
    }

    // Create pagination manager
    const items = result.searchData.edges.map(edge => edge.node);
    const pageInfo = result.searchData.pageInfo;
    
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
          items: newResult.searchData.edges.map(edge => edge.node),
          cursor: newResult.searchData.pageInfo.endCursor,
          hasNextPage: newResult.searchData.pageInfo.hasNextPage,
          hasPreviousPage: newResult.searchData.pageInfo.hasPreviousPage,
        };
      }
    );

    // Override formatPageContent for better display
    paginationManager.formatPageContent = (pageItems) => {
      return pageItems.map(item => 
        `**${item.title}**\n${item.description}\n*Created: ${new Date(item.createdAt).toLocaleDateString()}*`
      ).join('\n\n');
    };

    const pageContent = paginationManager.getCurrentPageContent();
    
    const embed = new EmbedBuilder()
      .setColor(0x4CAF50)
      .setTitle(`🔍 Search Results for "${searchTerm}"`)
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
        const newEmbed = EmbedBuilder.from(embed)
          .setDescription(newPageContent.content)
          .setFooter({ text: newPageContent.pageInfo });

        const newNavigationRow = paginationManager.createNavigationRow();
        
        await i.update({ 
          embeds: [newEmbed], 
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
    console.error('Query command error:', error);
    
    const embed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle('❌ Error')
      .setDescription('An error occurred while processing your query. Please try again.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
} 