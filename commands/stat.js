"use strict";

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { graphqlClient } from '../utils/graphql.js';

export const data = new SlashCommandBuilder()
  .setName('stat')
  .setDescription('Display statistics and metrics');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    // Example GraphQL query for statistics - adjust based on your actual schema
    const query = `
      query GetStatistics {
        statistics {
          totalEntries
          totalUsers
          entriesThisWeek
          entriesThisMonth
          averageEntriesPerDay
          mostActiveCategory
          recentActivity {
            timestamp
            action
            count
          }
        }
      }
    `;

    const result = await graphqlClient.query(query);
    
    if (!result.statistics) {
      const embed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('📊 No Statistics Available')
        .setDescription('Statistics are not currently available.')
        .setTimestamp();
      
      return await interaction.editReply({ embeds: [embed] });
    }

    const stats = result.statistics;
    
    // Calculate some additional stats
    const avgPerDay = stats.averageEntriesPerDay?.toFixed(2) || 'N/A';
    const weeklyGrowth = stats.entriesThisWeek > 0 ? '📈' : '📉';
    const monthlyGrowth = stats.entriesThisMonth > 0 ? '📈' : '📉';

    const embed = new EmbedBuilder()
      .setColor(0x9C27B0)
      .setTitle('📊 LoreBot Statistics')
      .setDescription('Here are the current statistics and metrics:')
      .addFields(
        { 
          name: '📝 Total Entries', 
          value: stats.totalEntries?.toString() || '0', 
          inline: true 
        },
        { 
          name: '👥 Total Users', 
          value: stats.totalUsers?.toString() || '0', 
          inline: true 
        },
        { 
          name: '📅 This Week', 
          value: `${weeklyGrowth} ${stats.entriesThisWeek?.toString() || '0'}`, 
          inline: true 
        },
        { 
          name: '📅 This Month', 
          value: `${monthlyGrowth} ${stats.entriesThisMonth?.toString() || '0'}`, 
          inline: true 
        },
        { 
          name: '📊 Daily Average', 
          value: avgPerDay, 
          inline: true 
        },
        { 
          name: '🏆 Most Active Category', 
          value: stats.mostActiveCategory || 'N/A', 
          inline: true 
        }
      )
      .setFooter({ text: 'Statistics updated in real-time' })
      .setTimestamp();

    // Add recent activity if available
    if (stats.recentActivity && stats.recentActivity.length > 0) {
      const activityText = stats.recentActivity
        .slice(0, 5) // Show last 5 activities
        .map(activity => {
          const date = new Date(activity.timestamp).toLocaleDateString();
          return `• ${activity.action}: ${activity.count} (${date})`;
        })
        .join('\n');
      
      embed.addFields({
        name: '🕒 Recent Activity',
        value: activityText,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Stat command error:', error);
    
    const embed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle('❌ Error')
      .setDescription('An error occurred while fetching statistics. Please try again.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
} 