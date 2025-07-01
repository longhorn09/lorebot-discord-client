"use strict";

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { graphqlClient } from '../utils/graphql.js';

export const data = new SlashCommandBuilder()
  .setName('query')
  .setDescription('Search for specific data using GraphQL')
  .addStringOption(option =>
    option.setName('criteria')
      .setDescription('example: WEIGHT=2&APPLY=5')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('limit')
      .setDescription('Number of results to return (default: 10)')
      .setMinValue(1)
      .setMaxValue(25));

// TODO: Implement GraphQL query construction function for FlexQuery
function buildFlexQuery(flexCriteria, first = 10, after = null, submitter) {
  const query = `
    query FlexQuery($first: Int, $after: String, $submitter: String!, $flexCriteria: String!) {
      FlexQuery(
        first: $first
        after: $after
        submitter: $submitter
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
    submitter,
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
    const limit = interaction.options.getInteger('limit') || 10;

    // TODO: Add validation logic for criteria parameter
    // Placeholder validation checks - replace with actual validation logic
    if (!criteria || criteria.trim() === '') {
      isValid = false;
      errorMessage = '```Error: Criteria cannot be empty```';
    }

    isValid = false;
    errorMessage = '```Coming soon...```';

    // TODO: Add more specific validation checks here
    // Examples of validation you might want to add:
    // - Check if criteria follows expected format (e.g., KEY=VALUE&KEY2=VALUE2)
    // - Validate specific keys are allowed
    // - Validate value ranges for specific keys
    // - Check for malicious input patterns
    
    // Placeholder validation - replace with actual logic
    if (isValid && !validateCriteriaFormat(criteria)) {
      isValid = false;
      errorMessage = '```Error: Invalid criteria format. Expected format: KEY=VALUE&KEY2=VALUE2```';
    }

    // TODO: Add validation for specific criteria values
    if (isValid && !validateCriteriaValues(criteria)) {
      isValid = false;
      errorMessage = '```Error: Invalid criteria values```';
    }

    // Build and execute GraphQL query after validation
    if (isValid) {
      try {
        // Build the GraphQL query
        const { query, variables } = buildFlexQuery(criteria, limit, null, interaction.user.username);
        
        // Execute the GraphQL query
        const result = await graphqlClient.query(query, variables);
        
        // TODO: Process and format the response
        // TODO: Handle pagination if needed
        
        await interaction.editReply({ 
          content: '```GraphQL query executed successfully. Response processing coming soon...```',
          flags: [MessageFlags.Ephemeral] 
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

// TODO: Implement these validation functions with your specific logic
function validateCriteriaFormat(criteria) {
  // Placeholder implementation - replace with actual format validation
  // Example: Check if criteria follows KEY=VALUE&KEY2=VALUE2 pattern
  const formatRegex = /^[A-Z_]+=\d+(&[A-Z_]+=\d+)*$/;
  return formatRegex.test(criteria);
}

function validateCriteriaValues(criteria) {
  // Placeholder implementation - replace with actual value validation
  // Example: Check if specific keys have valid value ranges
  const pairs = criteria.split('&');
  
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    
    // TODO: Add specific validation rules for each key
    // Example: if (key === 'WEIGHT' && (value < 1 || value > 10)) return false;
    // Example: if (key === 'APPLY' && (value < 0 || value > 100)) return false;
  }
  
  return true; // Placeholder - replace with actual validation
} 