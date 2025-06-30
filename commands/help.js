"use strict";

import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Shows available commands and their usage');

export async function execute(interaction) {
  const helpMsg = 
    "** Discord Lorebot v" + process.env.npm_package_version + " **\n" +
    "/help    - Lists the different commands available\n" +
    "/stat    - syntax: /stat <item>, example: /stat huma.shield\n" +
    "/brief   - syntax: /brief <item>, example: /brief huma.shield\n" +
    "/who     - shows character info, example: /who Drunoob\n" +
    "/whoall  - shows all characters\n" +
    //"!gton    - turn on output group chat\n" +
    //"!gtoff   - turn off output to group chat\n" +
    "/query   - multi criteria with &, example: /query affects=damroll by 2\n" +
    "/recent  - shows latest lores and looks\n\n" 
   +"===================================================================\n" +
    "Github client: https://github.com/longhorn09/lorebot-discord-client\n" +
    "Github server: https://github.com/longhorn09/lorebot-graphql-api\n" + 
    "gofundme     : https://gofund.me/e8bafa7b" ;
    //"/version - shows version history\n";

  await interaction.reply({ 
    content: "```" + helpMsg + "```", 
    //content: "```" + helpMsg + "```\n\n📚 [View Source Code](https://github.com/longhorn09/lorebot-discord-client)"
     //+"\n\n📚 [View Source Code](https://github.com/longhorn09/lorebot-discord-client)", 
    flags: [MessageFlags.Ephemeral] 
  });
} 