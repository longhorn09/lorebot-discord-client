"use strict";

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { graphqlClient } from '../utils/graphql.js';
import moment from 'moment';

export const data = new SlashCommandBuilder()
  .setName('recent')
  .setDescription('Show recent lore entries')
  .addStringOption(option =>
    option.setName('user')
      .setDescription('Discord user to filter recent entries for (optional)')
      .setRequired(false));

  const MYSQL_DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss"; // for use with moment().format(MYSQL_DATETIME_FORMAT)

/**
 * Format the recent entries content for display
 * @param {Array} items - Array of recent lore entries
 * @returns {string} Formatted content string
 */
function formatRecentContent(items) {
  // TODO: Flesh out this formatting function
  // This is a placeholder implementation that can be enhanced later
  
  return items.map((item, index) => {
    const createdDate = moment(Number(item.CREATE_DATE)).format(MYSQL_DATETIME_FORMAT);
    
    if (item.TBL_SRC === "Lore") {
      return `${createdDate}: Object '${item.DESCRIPTION}'`;
    } else {
      return `${createdDate}: !who ${item.DESCRIPTION}`;
    }
  }).join('\n');
}

export async function execute(interaction) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  try {
    // Get the user argument if provided, otherwise use the interaction user's tag
    const userArg = interaction.options.getString('user');
    const discordUser = userArg || interaction.user.tag;

    // GraphQL query for recent entries with user filter
    const query = `
      query Recent($discordUser: String) {
        recent(DISCORD_USER: $discordUser) {
          TBL_SRC
          DESCRIPTION
          CREATE_DATE
          submitter
        }
      }
    `;

    const variables = {
      discordUser: discordUser
    };

    const result = await graphqlClient.query(query, variables);
    
    if (!result.recent || result.recent.length === 0) {
      const userMessage = userArg ? ` for user '${userArg}'` : '';
      return await interaction.editReply({ 
        content: `\`\`\`No recent entries found.\`\`\``,
        flags: [MessageFlags.Ephemeral] 
      });
    }

    // Format content using the dedicated formatting function
    const formattedContent = "```" + formatRecentContent(  result.recent ) + "```";
    //mess
    //const userMessage = userArg ? ` for user '${userArg}'` : '';
    //const messageContent = `\`\`\`Recent entries${userMessage}:\n${formattedContent}\`\`\``;
    
    await interaction.editReply({ 
      content: formattedContent,
      flags: [MessageFlags.Ephemeral] 
    });

  } catch (error) {
    console.error('Recent command error:', error);
    
    await interaction.editReply({ 
      content: '```Error: Failed to fetch recent entries. Please try again.```',
      flags: [MessageFlags.Ephemeral] 
    });
  }
} 