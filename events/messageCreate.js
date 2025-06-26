"use strict";

import { MessageFlags, ChannelType } from 'discord.js';
import { handleLorePaste } from '../handlers/lorePasteHandler.js';
import { handleLookLogPattern } from '../handlers/lookPasteHandler.js';

export const name = 'messageCreate';
export const once = false;

export async function execute(message) {
  // make sure not a bot message
  
  if (!message.author.bot) {

    // regex pattern definitions 
    const loreCapturePattern = /^\s*Object\s{1}'([^\']+)'\s*$/;
    const lookLogPattern = /^([A-Z][a-z]+) is using:$/g;
    const deprecatedDelimPattern = /^\!(:roll|stat|query|brief|mark|whoall|who|help).*/;
    
    // this exec will be retired, not really used here
    const messageContent = message.content.trim().split('\n')[0];
    
    const match1 = loreCapturePattern.exec(messageContent);
    const match2 = lookLogPattern.exec(messageContent);
    //const match3 = deprecatedDelimPattern.exec(messageContent);
    
    // ========================================
    // MESSAGE TYPE HANDLING
    // ========================================
    const isDirectMessage = message.channel.type === ChannelType.DM;
    const isGuildMessage = message.channel.type === ChannelType.GuildText;
    //console.log("message.channel.type: ", message.channel.type);
    // Log message type for debugging
    if (isDirectMessage) {
      console.log(`[DM RECEIVED] From: ${message.author.globalName || message.author.username} (${message.author.id})`);
    } else if (isGuildMessage) {
      console.log(`[GUILD MESSAGE] Channel: ${message.channel.name}, Guild: ${message.guild.name}`);
    }
    
    /** 
     * Don't do the regex handling - too restrictive 
     * need to account for lores being pasted in the middle of a message or multiple lores in a single message
     */ 
    //console.log(message.content.trim().indexOf("Object '") );
    if (message.content.trim().indexOf("Object '") >= 0 ) {
      // message.author.globalName  is the best bet for the name of the user
      // message.author.tag         is the tag of the user
      // message.author.displayName is the display name of the user
      const userName = isDirectMessage ? (message.author.globalName || message.author.username) : message.author.globalName;
      console.log(`[PATTERN 1 MATCHED] User: ${userName} (${message.author.id})`);
      console.log(`[PATTERN 1 MATCHED] Captured: "${match1[1]}"`);
      console.log(`[PATTERN 1 MATCHED] Timestamp: ${message.createdAt.toISOString()}`);
      console.log(`[PATTERN 1 MATCHED] Message Type: ${isDirectMessage ? 'Direct Message' : 'Guild Message'}`);
      
      // Call handler for Lore paste
      await handleLorePaste(message, match1[1]);
      
    } else if (lookLogPattern.test(messageContent)) {
      const userName = isDirectMessage ? (message.author.globalName || message.author.username) : message.author.globalName;
      console.log(`[PATTERN 2 MATCHED] User: ${userName} (${message.author.id})`);
      console.log(`[PATTERN 2 MATCHED] Captured: "${match2[1]}"`);
      console.log(`[PATTERN 2 MATCHED] Timestamp: ${message.createdAt.toISOString()}`);
      console.log(`[PATTERN 2 MATCHED] Message Type: ${isDirectMessage ? 'Direct Message' : 'Guild Message'}`);
      
      // Call handler for pattern 2
      await handleLookLogPattern(message, match2[1]);
      
    } else if (deprecatedDelimPattern.test(messageContent)) {
      const userName = isDirectMessage ? (message.author.globalName || message.author.username) : message.author.globalName;
      /*
      console.log(`[PATTERN 3 MATCHED] User: ${message.author.tag} (${message.author.id})`);
      console.log(`[PATTERN 3 MATCHED] Captured: "${match3[1]}"`);
      console.log(`[PATTERN 3 MATCHED] Timestamp: ${message.createdAt.toISOString()}`);
      console.log(`[PATTERN 3 MATCHED] Message Type: ${isDirectMessage ? 'Direct Message' : 'Guild Message'}`);
      */
      // Call handler for pattern 3
      //await handleDeprecatedDelimCommand(message, match3[1]);      
      await handleDeprecatedDelimCommand(message, deprecatedDelimPattern.exec(messageContent)[1]);
    }
  }   // end isBot
}

/**
 * Handle old deprecated ! delimited commands such as !stat, !who, !whoall, !query, etc.
 * @param {*} message 
 * @param {*} capturedContent 
 */
async function handleDeprecatedDelimCommand(message, capturedContent) {
  try {
    //console.log(`Processing pattern 3 message: ${capturedContent}`);
    
    await message.reply({ 
      content: "`!" + capturedContent + "` is deprecated. Please use `/" + capturedContent + "` instead."
      ,  flags: [MessageFlags.Ephemeral] // this does nothing because message object and not an interaction 
    });
  } catch (error) {
    console.error('Error handling pattern 3 message:', error);
  }
}