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
    /*
    if (isDirectMessage) {
      console.log(`[DM RECEIVED] From: ${message.author.globalName || message.author.username} (${message.author.id})`);
    } else if (isGuildMessage) {
      console.log(`[GUILD MESSAGE] Channel: ${message.channel.name}, Guild: ${message.guild.name}`);
    }
    */
    
    /** 
     * Don't do the regex handling - too restrictive 
     * need to account for lores being pasted in the middle of a message or multiple lores in a single message
     */ 
    if (message.content.trim().indexOf("Object '") >= 0 ) {
      // message.author.globalName  is the best bet for the name of the user
      // message.author.tag         is the tag of the user
      // message.author.displayName is the display name of the user
      const userName = isDirectMessage ? (message.author.globalName || message.author.username) : message.author.globalName;
      //console.log(`[PATTERN 1 MATCHED] User: ${userName} (${message.author.id})`);
      //console.log(`[PATTERN 1 MATCHED] Captured: "${match1[1]}"`);
      //console.log(`[PATTERN 1 MATCHED] Timestamp: ${message.createdAt.toISOString()}`);
      //console.log(`[PATTERN 1 MATCHED] Message Type: ${isDirectMessage ? 'Direct Message' : 'Guild Message'}`);
      
      // Call handler for Lore paste
      await handleLorePaste(message, match1[1]);
      
    } 
    /**
     * Look at a person - eq capture
     */    
    else if (message.content.trim().indexOf(" is using:") >0 ) 
    {
      const userName = isDirectMessage ? (message.author.globalName || message.author.username) : message.author.globalName;
      //console.log(`[PATTERN 2 MATCHED] User: ${userName} (${message.author.id})`);
      //console.log(`[PATTERN 2 MATCHED] Captured: "${match2[1]}"`);
      //console.log(`[PATTERN 2 MATCHED] Timestamp: ${message.createdAt.toISOString()}`);
      //console.log(`[PATTERN 2 MATCHED] Message Type: ${isDirectMessage ? 'Direct Message' : 'Guild Message'}`);
      
      let lookArr = null
      let cleanArr = []
      let charName = null;

      // do not use a ^ or \s* in the regex, it will not match 2nd char - considering multi-line for multiple characters
      lookArr = message.content.trim().split(/([A-Z][a-z]+) is using:/); 

      /**
       * This logic supports the paste and parsing of multiple characters in a single message
       * Split the message into an array of strings - basically each element in the array is an individual character
       * 
       * The first element is the character name
       * The rest of the elements are the look log
       * 
       * The real world use case is very very rare, most people only paste one character at a time
       */ 
      for (let i = 0; i < lookArr.length; i++) {
        if  (/^([A-Z][a-z]+)$/.test(lookArr[i].trim())) {
          charName = lookArr[i].trim();
        }
        else if (lookArr[i].trim().indexOf("<") === 0 && charName != null && charName.length > 0)
        {
          cleanArr.push(`${charName} is using:\n${lookArr[i].trim()}`);
          charName = null;
        }
        else {
          charName = null;
        }
      }
      //console.log(`cleanArr.length: ${cleanArr.length}`);
      for (let i = 0; i < cleanArr.length; i++){
        //console.log(`cleanArr[${i}]: ${cleanArr[i]}`);
        await handleLookLogPattern(message.author.username, cleanArr[i]);
        //ParseEqLook(message.author.username,cleanArr[i]);
      }
  
  
      cleanArr = null;
      lookArr = null;      
      
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