"use strict";

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { graphqlClient } from '../utils/graphql.js';
import { formatAffects } from '../utils/formatting.js';
import { CursorPaginationManager } from '../utils/pagination.js';

export const data = new SlashCommandBuilder()
  .setName('query')
  .setDescription('Search for specific data using GraphQL')
  .addStringOption(option =>
    option.setName('criteria')
      .setDescription('example: weight=2&apply=5')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('limit')
      .setDescription('Number of results to return per page (default: 3)')
      .setMinValue(1)
      .setMaxValue(3));

// TODO: Implement GraphQL query construction function for FlexQuery
function buildFlexQuery(flexCriteria, first = 10, after = null, requestor) {
  const query = `
    query FlexQuery($first: Int, $after: String, $requestor: String!, $flexCriteria: String!) {
      FlexQuery(
        first: $first
        after: $after
        requestor: $requestor
        flexCriteria: $flexCriteria
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
    first,
    after,
    requestor,
    flexCriteria
  };

  return { query, variables };
}

export async function execute(interaction) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  let isValid = true;
  let errorMessage = '';

  try {
    const criteria = interaction.options.getString('criteria');
    const limit = interaction.options.getInteger('limit') || 3;

    // Validate criteria format using isValidCriteria function
    if (isValidCriteria(criteria) === false) {
      isValid = false;
      errorMessage = '```Error: Invalid criteria format.```';
    }

    // TODO: Add validation logic for criteria parameter
    // Placeholder validation checks - replace with actual validation logic
    if (!criteria || criteria.length === 0 || criteria.trim() === '') {
      isValid = false;
      errorMessage = '```Error: Criteria cannot be empty```';
    }

 

    // Build and execute GraphQL query after validation
    if (isValid) {
      try {
        // Build the GraphQL query
        const { query, variables } = buildFlexQuery(criteria, limit, null, interaction.user.username);
        
        // Execute the GraphQL query
        //console.log("query:", query);
        const result = await graphqlClient.query(query, variables);
        
                // Process and format the response with pagination
        if (!result.FlexQuery || result.FlexQuery.edges.length === 0) {
          await interaction.editReply({ 
            content: '```No items found matching your criteria.```',
            flags: [MessageFlags.Ephemeral] 
          });
          return;
        }

        // Create pagination manager similar to stat.js
        const items = result.FlexQuery.edges.map(edge => edge.node);
        const pageInfo = result.FlexQuery.pageInfo;
        const totalCount = result.FlexQuery.totalCount;
        
        const paginationManager = new CursorPaginationManager(
          items,
          pageInfo.endCursor,
          pageInfo.hasNextPage,
          pageInfo.hasPreviousPage,
          async (cursor, direction) => {
            const newVariables = {
              first: limit,
              after: cursor,
              requestor: interaction.user.username,
              flexCriteria: criteria,
            };
            
            const newResult = await graphqlClient.query(query, newVariables);
            return {
              items: newResult.FlexQuery.edges.map(edge => edge.node),
              cursor: newResult.FlexQuery.pageInfo.endCursor,
              hasNextPage: newResult.FlexQuery.pageInfo.hasNextPage,
              hasPreviousPage: newResult.FlexQuery.pageInfo.hasPreviousPage,
            };
          }
        );

        // Override formatPageContent to show detailed lore information like stat.js
        paginationManager.formatPageContent = (pageItems) => {
          return pageItems.map((item, index) => {
            const itemNumber = index + 1;
            let details = `Object '${item.OBJECT_NAME}'\n`;
            
            if (item.ITEM_TYPE)                   details +=   `Item Type: ${item.ITEM_TYPE}\n`;
            if (item.MAT_CLASS && item.MATERIAL) details +=    `Mat Class: ${(item.MAT_CLASS).padEnd(13)}Material : ${item.MATERIAL}\n`;
            if (item.WEIGHT && item.ITEM_VALUE) details    +=  `Weight   : ${(item.WEIGHT.toString()).padEnd(13)}Value    : ${item.ITEM_VALUE}\n`;
            if (item.AFFECTS) details +=                       `${formatAffects(item.AFFECTS)}`;
            if (item.SPEED) details +=                         `Speed    : ${item.SPEED}\n`;
            if (item.POWER) details +=                         `Power    : ${item.POWER}\n`;
            if (item.ACCURACY) details +=                      `Accuracy : ${item.ACCURACY}\n`;
            if (item.EFFECTS) details +=                       `Effects  : ${item.EFFECTS}\n`;
            if (item.ITEM_IS) details +=                       `Item is  : ${item.ITEM_IS.toUpperCase()}\n`;
            if (item.CHARGES) details +=                       `Charges  : ${item.CHARGES}\n`;
            if (item.ITEM_LEVEL) details +=                    `Level    : ${item.ITEM_LEVEL}\n`;
            if (item.RESTRICTS) details +=                     `Restricts: ${item.RESTRICTS.toUpperCase()}\n`;
            if (item.IMMUNE) details +=                        `Immune   : ${item.IMMUNE}\n`;
            if (item.APPLY) details +=                         `Apply    : ${item.APPLY}\n`;
            if (item.CLASS) details +=                         `Class    : ${item.CLASS}\n`;        
            if (item.DAMAGE) details +=                        `Damage   : ${item.DAMAGE}\n`;
            if (item.CONTAINER_SIZE) details +=                `Contains : ${item.CONTAINER_SIZE}\n`;
            if (item.CAPACITY) details +=                      `Capacity : ${item.CAPACITY}\n`;
            if (item.SUBMITTER) details +=                     `Submitter: ${item.SUBMITTER} (${new Date(Number(item.CREATE_DATE)).toLocaleString()})\n`;
            
            return details;
          }).join('\n');
        };

        const pageContent = paginationManager.getCurrentPageContent();
        
        // Calculate total pages
        const totalPages = Math.ceil(totalCount / limit);
        
        // Create the message content with criteria, total count and page info (stat.js style)
        const messageContent = `\`${totalCount}\` items found for criteria: '${criteria}'.\n\`\`\`\n${pageContent.content}\n\`\`\`\nPage ${pageContent.pageInfo.split(' ')[1]} of ${totalPages}`;
        
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
            const newMessageContent = `${totalCount} items found for criteria: '${criteria}'.\n\`\`\`\n${newPageContent.content}\n\`\`\`\nPage ${newPageContent.pageInfo.split(' ')[1]} of ${totalPages}`;
            
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
        
      } catch (graphqlError) {
        console.error('GraphQL query error:', graphqlError);
        await interaction.editReply({ 
          content: '```Error: Failed to execute GraphQL query```',
          flags: [MessageFlags.Ephemeral] 
        });
      }
    } else {
      await interaction.editReply({ 
        content: errorMessage,
        flags: [MessageFlags.Ephemeral] 
      });
    }

  } catch (error) {
    console.error('Query command error:', error);
    
    await interaction.editReply({ 
      content: '```Error: An error occurred while processing your request.```',
      flags: [MessageFlags.Ephemeral] 
    });
  }
}


/**
 * Validates if the criteria string contains valid key-value pairs
 * Supports operators: =, >, <, >=, <=
 * Multiple pairs separated by &
 * @param {string} criteria - The criteria string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidCriteria = (criteria) => {
  let isValid = true;
  
  // Check if criteria is empty or null
  //console.log("criteria:", criteria);
  if (!criteria || criteria.trim() === '') {
    isValid = false;
  } 
  else {
    // Split by & to get individual key-value pairs
    const pairs = criteria.split('&');
    
    // Check each pair
    for (const pair of pairs) {
      const trimmedPair = pair.trim();
      
      // Skip empty pairs
      if (trimmedPair.length === 0 || trimmedPair == '') {
        continue;
      }
      
      // Check if pair matches the pattern: key=value, key>value, key<value, key>=value, key<=value
      const patternRegex = /^([A-Za-z\_]+)(?:\=|\>|\<|\>=|\<=)\s*(?:[^\&\=\<\>])+\s*$/;
      
      if (!patternRegex.test(trimmedPair)) {
        isValid = false;
        break;
      }
      else {
        // make sure one of the expected key name pairs
        switch (patternRegex.exec(trimmedPair)[1].toLowerCase()) {
          case "speed":
          case "accuracy":
          case "power":
          case "charges":
          case "weight":
          case "item_value":
          case "apply":
          case "capacity":
          case "container_size":
          case "item_type":
          case "item_is":
          case "submitter":
          case "restricts":
          case "class":
          case "mat_class":
          case "material":
          case "immune":
          case "effects":
          case "damage":                      
          case "affects":            
          case "object_name":
            isValid = true;
            break;
          default:
            isValid = false;
            break;
          }
        }
    }
  }
  //console.log("in isValidCriteria():", isValid);
  return isValid;
} 