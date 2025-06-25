"use strict";

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { graphqlClient } from '../utils/graphql.js';
import { CursorPaginationManager } from '../utils/pagination.js';
import moment from 'moment';

export const data = new SlashCommandBuilder()
  .setName('stat')
  .setDescription('Display statistics and detailed lore information')
  .addStringOption(option =>
    option.setName('item')
      .setDescription('Search term for lore items (optional)')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('limit')
      .setDescription('Number of items to show per page (default: 3)')
      .setMinValue(1)
      .setMaxValue(5));

export async function execute(interaction) {
  //await interaction.deferReply();
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });    // need to pass ephemeral flag so the message is private to user

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

    /**
     * copied directly from original version of lorebot.js 
     * at https://github.com/longhorn09/lorebot/blob/master/lorebot.js
     * @param {*} pArg 
     * @returns 
     */
    const formatAffects = (pArg) => {
      let retvalue = "";
      let affectsArr = [];
      let sb = "";
      //let affectBy = /([A-Za-z_\s]+)\s*by\s*([-+]?\d+)/;
      let affectBy = /^([A-Za-z_\s]+)\s*by\s*(.+)$/;
      let match = null;
    
      affectsArr = pArg.trim().split(",");
      for (let i = 0;i<affectsArr.length;i++){
        if (affectBy.test(affectsArr[i].toString().trim()) )
        {
          match = affectBy.exec(affectsArr[i].toString().trim());
          //console.log("matched: " + affectsArr[i]);
          //console.log(match[1].toUpperCase().padEnd(14) + "by " + match[2]);
          if (match[1].trim() === "casting level" ||
              match[1].trim() === "spell slots" ) //keep these lower case
          {
              sb += "Affects".padEnd(9) + ": " + match[1].trim().padEnd(14) + "by " + match[2] + "\n";
          }
          else if (match[1].trim().toLowerCase().startsWith("skill ")) {  // lore formatting for skills
              sb += "Affects".padEnd(9) + ": " + match[1].trim().toLowerCase().padEnd(20) + "by " + match[2] + "\n";
          }
          else if (match[1].trim().length >= 13) {
            sb += "Affects".padEnd(9) + ": " + match[1].trim().toLowerCase() + " by  " + match[2] + "\n"; // note: 2 trailing spaces after by
          }
          else {
            sb += "Affects".padEnd(9) + ": " + match[1].trim().toUpperCase().padEnd(14) + "by " + match[2] + "\n";
          }
        }
        else {
          //console.log("didn't match: " + affectsArr[i]);       //this is going to be single lines like : regeneration 14%
          sb += "Affects".padEnd(9) + ": " + affectsArr[i].toString().trim() + "\n";
        }
      }
      retvalue = sb;
      return retvalue;
    }

    // Debug logging
    if (process.env.DEBUG === 'true' || process.env.DEBUG === '1') {
      console.log('=== STAT COMMAND DEBUG ===');
      console.log('GraphQL Query:', query);
      console.log('Variables:', JSON.stringify(variables, null, 2));
      //console.log('Search term:', searchTerm);  // redundant with variables
      console.log('==========================');
    }

    const result = await graphqlClient.query(query, variables);
    
    if (!result.allLorePaginated || result.allLorePaginated.edges.length === 0) {
      return await interaction.editReply({ 
        content: `\`\`\`No lore items found${searchTerm ? ` matching '${searchTerm}'` : ''}.\`\`\``,
        flags: [MessageFlags.Ephemeral]
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
        //if (item.SUBMITTER) details +=                     `Submitter: ${item.SUBMITTER}\n`;// (${moment(item.CREATE_DATE).format('ddd MMM DD YYYY HH:mm a')})\n`;
        if (item.SUBMITTER) details +=                     `Submitter: ${item.SUBMITTER} (${moment(Number(item.CREATE_DATE)).format('ddd MMM DD YYYY HH:MM')})\n`;
        //if (item.CREATE_DATE) details += `Created: ${new Date(item.CREATE_DATE).toLocaleDateString()}\n`;
        
        return details;
      }).join('\n');
    };

    const pageContent = paginationManager.getCurrentPageContent();
    
    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);
    
    // Create the message content with search term, total count and page info
    const messageContent = `${searchTerm ? `${totalCount} items found for '${searchTerm}'.` : ''} \n\`\`\`\n${pageContent.content}\n\`\`\`\nPage ${pageContent.pageInfo.split(' ')[1]} of ${totalPages}`;
    
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
        const newMessageContent = `**Lore Statistics${searchTerm ? ` - Search: '${searchTerm}'` : ''} (${totalCount} total)**\n\`\`\`\n${newPageContent.content}\n\`\`\`\nPage ${newPageContent.pageInfo.split(' ')[1]} of ${totalPages}`;
        
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
    console.error('Stat command error:', error);
    
    await interaction.editReply({ 
      content: "```Error: Failed to fetch lore item(s). Please try again.```",
      flags: [MessageFlags.Ephemeral]
    });
  }
}