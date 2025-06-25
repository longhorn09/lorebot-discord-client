"use strict";

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { graphqlClient } from '../utils/graphql.js';
import { CursorPaginationManager } from '../utils/pagination.js';
import moment from 'moment';

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
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  const characterName = interaction.options.getString('character');
  const limit = interaction.options.getInteger('limit') || 10;

  try {
    // GraphQL query for character information
    const query = `
      query SearchPersonByNameSimple($charname: String, $first: Int, $after: String) {
        allPersonsConnection(
          first: $first
          after: $after
          filter: {
            CHARNAME: $charname
          }
        ) {
          edges {
            node {
              PERSON_ID
              CHARNAME
              LIGHT
              RING1
              RING2
              NECK1
              NECK2
              BODY
              HEAD
              LEGS
              FEET
              ARMS
              SLUNG
              HANDS
              SHIELD
              ABOUT
              WAIST
              POUCH
              RWRIST
              LWRIST
              PRIMARY_WEAP
              SECONDARY_WEAP
              HELD
              BOTH_HANDS
              SUBMITTER
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
      charname: characterName,
      first: limit,
      after: null,
    };

    // Debug logging
    if (process.env.DEBUG === 'true' || process.env.DEBUG === '1') {
      console.log('=== WHO COMMAND DEBUG ===');
      console.log('GraphQL Query:', query);
      console.log('Variables:', JSON.stringify(variables, null, 2));
      console.log('==========================');
    }

    const result = await graphqlClient.query(query, variables);
    
    if (!result.allPersonsConnection || result.allPersonsConnection.edges.length === 0) {
      return await interaction.editReply({ 
        content: `\`\`\`No character information found for '${characterName}'.\`\`\``,
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

    // Override formatPageContent to show character information
    paginationManager.formatPageContent = (pageItems) => {
      return pageItems.map((character, index) => {
        const charNumber = index + 1;
        // Format character name: first letter uppercase, rest lowercase
        const formattedName = character.CHARNAME.charAt(0).toUpperCase() + character.CHARNAME.slice(1).toLowerCase();
        let details = `${formattedName} is using:\n`;
        
        // Equipment information in the specific format
        if (character.RING1) details += `<worn on finger>           ${character.RING1}\n`;
        if (character.RING2) details += `<worn on finger>           ${character.RING2}\n`;
        if (character.NECK1) details += `<worn around neck>         ${character.NECK1}\n`;
        if (character.NECK2) details += `<worn around neck>         ${character.NECK2}\n`;
        if (character.BODY) details +=  `<worn on body>             ${character.BODY}\n`;
        if (character.HEAD) details +=  `<worn on head>             ${character.HEAD}\n`;
        if (character.LEGS) details +=  `<worn on legs>             ${character.LEGS}\n`;
        if (character.FEET) details +=  `<worn on feet>             ${character.FEET}\n`;
        if (character.HANDS) details += `<worn on hands>            ${character.HANDS}\n`;
        if (character.ABOUT) details += `<worn about body>          ${character.ABOUT}\n`;        
        if (character.ARMS) details +=  `<worn on arms>             ${character.ARMS}\n`;
        if (character.SLUNG) details += `<slung over shoulder>      ${character.SLUNG}\n`;
        if (character.WAIST) details += `<worn about waist>         ${character.WAIST}\n`;
        if (character.RWRIST) details +=`<worn around right wrist>  ${character.RWRIST}\n`;
        if (character.LWRIST) details +=`<worn around left wrist>   ${character.LWRIST}\n`;
        if (character.PRIMARY_WEAP) details += `<used in primary hand>     ${character.PRIMARY_WEAP}\n`;
        if (character.SECONDARY_WEAP) details += `<used in secondary hand>   ${character.SECONDARY_WEAP}\n`;
        if (character.HELD) details += `<held in secondary hand>   ${character.HELD}\n`;
        
        if (character.BOTH_HANDS) details += `<used in both hands>        ${character.BOTH_HANDS}\n`;
        if (character.SHIELD) details += `<worn as shield>           ${character.SHIELD}\n`;
        if (character.POUCH) details += `<worn in pouch>            ${character.POUCH}\n`;
        if (character.LIGHT) details += `<light source>             ${character.LIGHT}\n`;
        
        // Character information at the bottom
        //const MYSQL_DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss"; 
        if (character.SUBMITTER && character.CREATE_DATE) {
          //const createDate = moment(character.CREATE_DATE, moment.ISO_8601);
          //const formattedDate = createDate.format('YYYY-MM-DD');
          //const timestampInSeconds = character.CREATE_DATE; // Example timestamp in seconds
          //const timestampInMilliseconds = timestampInSeconds * 1000;
          //const formattedDate = moment(timestampInMilliseconds).format('YYYY-MM-DD HH:mm:ss');

          details += `\nSubmitter: ${character.SUBMITTER}`;
          //details += `\nSubmitter: ${character.SUBMITTER} (${formattedDate})`;
        } else if (character.SUBMITTER) {
          details += `\nSubmitter: ${character.SUBMITTER}`;
        } else if (character.CREATE_DATE) {
          //const createDate = moment(character.CREATE_DATE, moment.ISO_8601);
          //const formattedDate = createDate.format('YYYY-MM-DD');
          //details += `\nCreated: ${formattedDate}`;
        }
        
        return details;
      }).join('\n\n');
    };

    const pageContent = paginationManager.getCurrentPageContent();
    
    // Calculate total pages based on total count and limit
    const totalPages = Math.ceil(totalCount / limit);
    
    // Create the message content with character name, total count and page info
    const messageContent = `**Character information for '${characterName}' (${totalCount} total)**\n\`\`\`\n${pageContent.content}\n\`\`\`\nPage ${pageContent.pageInfo.split(' ')[1]} of ${totalPages}`;
    
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