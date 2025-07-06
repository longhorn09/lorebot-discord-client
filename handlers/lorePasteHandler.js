"use strict";

import { MessageFlags } from 'discord.js';
import { graphqlClient } from '../utils/graphql.js';
import moment from 'moment';

/**
 * Lore data object - holds the parsed attributes of the lore paste readying for sending via GraphQL to the database
 * @type {Object}
 */
/*

/**
 * Handle lore paste operations when Object 'content' pattern is detected
 * @param {Object} message - The Discord message object
 * @param {string} capturedContent - The content captured from the regex pattern
 */
export async function handleLorePaste(message, capturedContent) {
  try {
    //console.log(`Processing lore paste message: ${capturedContent}`);
    let isValid = true;
    let graphqlQuery = null;
    let result = null;
    
    // ========================================
    // MESSAGE PARSING LOGIC
    // ========================================
    
    // Parse the full message content for lore data
    // message.author.globalName  is the best bet for the name of the user
      // message.author.tag         is the tag of the user
      // message.author.displayName is the display name of the user

    let tmp = message.content.trim();
    tmp = tmp.substring(tmp.indexOf("Object '"));
    //const parsedLoreData = await parseLoreMessage(message.content, capturedContent, message.author.tag);
    const parsedLoreData = await parseLoreMessage(tmp, capturedContent, message.author.tag);
    
    if (!parsedLoreData) {
      //console.log('Failed to parse lore message data');
      await message.reply({ 
        content: 'Unable to parse lore message data. Please check the format.',
        flags: [MessageFlags.Ephemeral]
      });
      //return;
      isValid = false;
    }
    
    //console.log('Parsed lore data:', JSON.stringify(parsedLoreData, null, 2));
    
    // ========================================
    // GRAPHQL QUERY CONSTRUCTION 
    // ========================================
    
    if (isValid) {
      // Check if any lore data fields were successfully parsed
      if (parsedLoreData.loreData.itemType !== null || 
          parsedLoreData.loreData.matClass !== null || 
          parsedLoreData.loreData.material !== null || 
          parsedLoreData.loreData.weight !== null || 
          parsedLoreData.loreData.value !== null ||
          parsedLoreData.loreData.speed !== null || 
          parsedLoreData.loreData.power !== null || 
          parsedLoreData.loreData.accuracy !== null || 
          parsedLoreData.loreData.effects !== null || 
          parsedLoreData.loreData.itemIs !== null ||
          parsedLoreData.loreData.charges !== null || 
          parsedLoreData.loreData.spell !== null || 
          parsedLoreData.loreData.restricts !== null || 
          parsedLoreData.loreData.immune !== null || 
          parsedLoreData.loreData.apply !== null ||
          parsedLoreData.loreData.weapClass !== null || 
          parsedLoreData.loreData.damage !== null || 
          parsedLoreData.loreData.affects !== null || 
          parsedLoreData.loreData.containerSize !== null || 
          parsedLoreData.loreData.capacity !== null) {
        // At least one field was parsed successfully, continue with GraphQL update
        graphqlQuery = constructLoreUpdateQuery(parsedLoreData);
        isValid = true; 
        //console.log('graphqlQuery: ', graphqlQuery);
      } 
      else {
        isValid = false;
        await message.reply({ 
          content: 'Unable to parse lore message data. Please check the format.',
          flags: [MessageFlags.Ephemeral]
        });
        
      }
    }
    
    if (!graphqlQuery) {
      console.log('Failed to construct GraphQL query');
      await message.reply({ 
        content: 'Unable to construct update query. Please check the parsed data.',
        flags: [MessageFlags.Ephemeral]
      });
      //return;
      isValid = false;
    }
    

    //console.log('GraphQL Query:', graphqlQuery.query);
    //console.log('GraphQL Variables:', JSON.stringify(graphqlQuery.variables, null, 2));
    
    // ========================================
    // GRAPHQL API CALL 
    // ========================================
    
    if (isValid) {
      result = await executeLoreUpdate(graphqlQuery);
    }
    
    if (!result) {
      console.log('lorePasteHandler.handleLorePaste(): GraphQL update failed');
      await message.reply({ 
        content: 'Failed to update lore data on the backend.',
        flags: [MessageFlags.Ephemeral]
      });
      isValid = false;
    }

    // ========================================
    // SUCCESS RESPONSE
    // ========================================
    
    //console.log('Lore data updated successfully:', parsedLoreData);
    await message.reply({ 
      content: `Object '${parsedLoreData.objectName || 'object'}' updated.`,
      flags: [MessageFlags.Ephemeral]
    });
    
  } catch (error) {
    console.error('Error handling lore paste message:', error);
    await message.reply({ 
      content: 'An error occurred while processing the lore message.',
      flags: [MessageFlags.Ephemeral]
    });
  }
}

/**
 * Parse the lore message content to extract relevant data
 * @param {string} messageContent - Multi-line the full message content - need split('\n')
 * @param {string} capturedContent - This is the regex captured object name, ie. 'shield training'
 * @param {string} pSubmitter - This is the tag of the user who submitted the lore
 * @returns {Object|null} Parsed lore data or null if parsing fails
 */
async function parseLoreMessage(messageContent, capturedContent, pSubmitter) {
  try {
    //console.log("in parseLoreMessage()");
    //console.log('Parsing lore message:', messageContent);
    //console.log('Captured content:', capturedContent);
    let affects = null, objName = null, tmpStr = null;
    let pLore = messageContent;
    let attribName = null,attribName2 = null,attribValue2 = null,attribValue = null,attribValueX = null;
    /*
    let itemType = null,matClass = null,material = null,weight = null,value = null,speed = null, power = null
                 ,accuracy = null,effects = null,itemIs  = null,charges = null, containerSize = null, capacity = null;
     */
    //let spell = null; // level
    //let restricts = null,immune = null,apply = null,weapClass = null,damage = null;
    let extra = null;// ##################### NOT YET CODED OUT ##############################
    let isUpdateSuccess = false;
    let hasBlankLine = false;
    let match = null;
    let splitArr = [];
    let is2part = false;
    let attribRegex = /^([A-Z][0-9A-Za-z\s]+)\:(.+)$/;   //do not use /g here or matching issues
    let objRegex = /^Object\s'(.+)'$/;  //removed g flag
    let isValid = false;
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
    //The behavior associated with the 'g' flag is different when the .exec() method is used.
    // need to still do regex text in case of: https://github.com/longhorn09/lorebot/issues/9

    
    // ========================================
    // YOUR MESSAGE PARSING LOGIC GOES HERE
    // ========================================
    
    // Initialize parsed data structure
    const MYSQL_DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss"; // for use with moment().format(MYSQL_DATETIME_FORMAT)
    const parsedData = {
      objectName: capturedContent,
      timestamp: moment().format(MYSQL_DATETIME_FORMAT), // MySQL 8.4 handles ISO 8601 format well
      // Alternative: new Date().toISOString().slice(0, 19).replace('T', ' ') // MySQL DATETIME format
      loreData: {
        objName: capturedContent,
        itemType: null,
        matClass: null,
        material: null,
        weight: null,
        value: null,
        speed: null,
        power: null,
        accuracy: null,
        effects: null,
        itemIs: null,
        charges: null,
        containerSize: null,
        capacity: null,
        spell: null,
        restricts: null,
        immune: null,
        apply: null,
        weapClass: null,
        damage: null,
        affects: null, // affects is built up as a comma separated string if multiple affects are found
        extra: null, // Not yet implemented in the original logic.
        submitter: pSubmitter
        // Add more fields as needed
      } 
    };
    
    // ========================================
    // SINGLE PARSING FUNCTION - Replace with your actual logic
    // ========================================
    
    // Extract object name from captured content
    parsedData.objectName = capturedContent || null;
    parsedData.loreData.objName = capturedContent || null;    // admittedly duplicative in the JSON
    
    // Extract full lore content from message
    //const objectMatch = messageContent.match(/Object\s*'([^']+)'\s*(.*)/s);
    //parsedData.loreContent = objectMatch ? objectMatch[2].trim() : null;
    
    // ========================================
    // COMPREHENSIVE PARSING LOGIC
    // ========================================
    
    if (objRegex.test(pLore.trim().split("\n")[0].trim())) {
        //console.log(`matched: ${pLore.trim().split("\n")[0].trim()}`);
        match = objRegex.exec(pLore.trim().split("\n")[0].trim());
        objName = match[1];

        //we don't need to start loop at item[0] because we already matched the Object name in row[0]
        splitArr = messageContent.trim().split("\n");
        for (let i = 1; i < splitArr.length; i++)        {
            //make sure to reset capture variables to null each loop
            attribName = null, attribValue = null,
            attribName2 = null, attribValue2 = null;
            attribValueX = null;
            match = null;
            is2part = false;

            if (attribRegex.test(splitArr[i].toString().trim()) === true) {
                match = attribRegex.exec(splitArr[i].toString().trim());
                if (match !== null)
                {
                  attribName = match[1].trim();
                  if (match[2].trim().indexOf(":")>0)
                  {
                    if (/^(.+)\s+([A-Z][a-z\s]+)\:(.+)$/.test(match[2].trim())) //natural    Material:organic
                    {
                      is2part = true;
                      match = /^(.+)\s+([A-Z][a-z\s]+)\:(.+)$/.exec(match[2].trim()); //Make sure regex.exec() exactly matches regex.test() stmt 4 lines above
                      attribValue = match[1].trim();
                      attribName2 = match[2].trim();
                      attribValue2 = match[3].trim();
                    }
                    else {
                      //console.log(`No match on 2nd half: ${match[2].trim()}`);  // this shouldn't happen
                    }
                  }
                  else {    // 1-parter
                    attribValue = match[2].trim();
                  }
        
                  let levelRegex = /^Level\s+(\d+)$/;
                  if (levelRegex.test(attribName.trim())) {
                    let levelnumber = levelRegex.exec(attribName.trim());
                    attribName = "level";
                    attribValueX = levelnumber[1] + " : " + attribValue;
                  }
        
                  switch(attribName.toLowerCase().trim()){
                    case "item type":
                     // itemType = attribValue;
                      parsedData.loreData.itemType = attribValue;
                      break;
                    case "contains":
                      //containerSize = /^(\d+)$/g.test(attribValue)  ? Number.parseInt(attribValue.trim()) : null;
                      parsedData.loreData.containerSize = /^(\d+)$/g.test(attribValue)  ? Number.parseInt(attribValue.trim()) : null;
                      break;
                    case "capacity":
                      //capacity = /^(\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue.trim()) : null;
                      parsedData.loreData.capacity =  /^(\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue.trim()) : null;
                      break;
                    case "mat class":
                      //matClass = attribValue;
                      parsedData.loreData.matClass = attribValue;
                      break;
                    case "material":
                      //material = attribValue;
                      parsedData.loreData.material = attribValue;
                      break;
                    case "weight":
                      //weight = /^(\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue) : null;
                      parsedData.loreData.weight =  /^(\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue) : null;
                      break;
                    case "value":
                      //value  = /^(\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue.trim()) : null;
                      parsedData.loreData.value =  /^(\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue.trim()) : null;
                      break;
                    case "speed":
                      //speed  = /^(\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue.trim()) : null;
                      parsedData.loreData.speed =  /^(\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue.trim()) : null;
                      break;
                    case "power":
                      //power  = /^(\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue.trim()) : null;
                      parsedData.loreData.power =  /^(\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue.trim()) : null;
                      break;
                    case "accuracy":
                      //accuracy  = /^(\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue.trim()) : null;
                      parsedData.loreData.accuracy =  /^(\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue.trim()) : null;
                      break;
                    case "effects":
                      //effects = attribValue;
                      parsedData.loreData.effects = attribValue;
                      break;
                    case "item is":
                      //itemIs = attribValue;
                      parsedData.loreData.itemIs = attribValue;
                      break;
                    case "charges":
                      //charges  = /^(\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue.trim()) : null;
                      parsedData.loreData.charges = /^(\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue.trim()) : null;
                      break;
                    case "level":
                      //spell = attribValueX;    //varchar(80)
                      parsedData.loreData.spell = attribValueX;
                      break;
                    case "restricts":
                      //restricts = attribValue;
                      parsedData.loreData.restricts = attribValue;
                      break;
                    case "immune":
                      //immune = attribValue;
                      parsedData.loreData.immune = attribValue;
                      break;
                    case "apply":
                      //apply  = /^(-?\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue.trim()) : null;
                      parsedData.loreData.apply =  /^(-?\d+)$/g.test(attribValue) ?  Number.parseInt(attribValue.trim()) : null;
                      break;
                    case "class":      ///// weapon class?
                      //weapClass = attribValue;
                      parsedData.loreData.weapClass = attribValue;
                      break;
                    case "damage":
                      //damage = attribValue;
                      parsedData.loreData.damage = attribValue;
                      break;
                    case "affects":
                      if (affects === null) {
                        affects = attribValue + ",";
                      }
                      else {
                        affects += attribValue + ",";
                      }
                      break;
                  } //end of 1-parter
        
                  if (attribName2 !== null && attribValue2 !== null) { //2-parter
                    switch(attribName2.toLowerCase().trim()) {
                      case "item type":
                        //itemType = attribValue2.trim();
                        parsedData.loreData.itemType = attribValue2.trim();
                        break;
                      case "contains":
                        //containerSize  = /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        parsedData.loreData.containerSize =  /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        break;
                      case "capacity":
                        //capacity  =  /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        parsedData.loreData.capacity = /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        break;
                      case "mat class":
                        //matClass = attribValue2.trim();
                        parsedData.loreData.matClass =  attribValue2.trim();
                        break;
                      case "material":
                        //material = attribValue2.trim();
                        parsedData.loreData.material =  attribValue2.trim();
                        break;
                      case "weight":
                        //weight  =  /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        parsedData.loreData.weight = /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        break;
                      case "value":
                        //value  =  /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;    //varchar(10)
                        parsedData.loreData.value = /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;    //varchar(10)
                        break;
                      case "speed":
                        //speed =  /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        parsedData.loreData.speed = /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        break;
                      case "power":
                        //power =  /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        parsedData.loreData.power = /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        break;
                      case "accuracy":
                        //accuracy  =  /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        parsedData.loreData.accuracy =   /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        break;
                      case "effects":
                        //effects = attribValue2.trim();
                        parsedData.loreData.effects = attribValue2.trim();
                        break;
                      case "item is":
                        //itemIs = attribValue2.trim();
                        parsedData.loreData.itemIs = attribValue2.trim();
                        break;
                      case "charges":
                        //charges  =  /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        parsedData.loreData.charges = /^(\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        break;
                      case "level":
                        //spell = attribValue2.trim();
                        parsedData.loreData.spell = attribValue2.trim();
                        break;
                      case "restricts":
                        //restricts = attribValue2.trim();
                        parsedData.loreData.restricts = attribValue2.trim();
                        break;
                      case "immune":
                        //immune = attribValue2.trim();
                        parsedData.loreData.immune = attribValue2.trim();
                        break;
                      case "apply":
                        //apply  =  /^(-?\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        parsedData.loreData.apply = /^(-?\d+)$/g.test(attribValue2) ?  Number.parseInt(attribValue2.trim()) : null;
                        break;
                      case "class":      ///// weapon class?
                        //weapClass = attribValue2.trim();
                        parsedData.loreData.weapClass = attribValue2.trim();
                        break;
                      case "damage":
                        //damage = attribValue2.trim();
                        parsedData.loreData.damage = attribValue2.trim();
                        break;
                      case "affects":
                        // affects functions like a stringbuilder, keeps getting appended to
                        if (affects === null) {
                            affects = attribValue2.trim() + ",";
                        }
                        else {
                          affects +=  attribValue2.trim() + ",";
                        }
        
                        break;
                    }   //end of 2-parter
                  //console.log(`[${i}]: ${attribName}: ${attribValue} , ${attribName2}: ${attribValue2}`);
                  } //2-parter null test
                } //end if match[1] !== null
                else{ //usually empty line, but may be Extra to be captured here
                  console.log(`splitArr[${i}] no match: ${splitArr[i].trim()}`);
                }
              }   //end if regex.test on first pattern match            
        } // end for loop
                      
        // Do not comment the below out, the trimming of trailing comma is necessary and not just for debug purposes
        if (affects   != null) {
          affects = affects.substring(0,affects.length-1); //cull the trailing comma
        }
        parsedData.loreData.affects = affects;
    } // end of if (objRegex.test(pLore.trim().split("\n")[0].trim())) 

    // ========================================
    // VALIDATION
    // ========================================
    
    // Validate that required fields are present
    /*
    if (!parsedData.objectName) {
      console.log('Missing object name in parsed data');
      return null;
    }
    
    if (!parsedData.loreContent) {
      console.log('Missing lore content in parsed data');
      return null;
    }
    */
    // Add more validation as needed
    
    return parsedData;
    
  } catch (error) {
    console.error('Error parsing lore message:', error);
    return null;
  }
}

/**
 * Construct GraphQL mutation query for updating lore data
 * @param {Object} parsedData - The parsed lore data
 * @returns {Object|null} GraphQL query object or null if construction fails
 */
function constructLoreUpdateQuery(parsedData) {
  try {
    let isValid = false;
    //console.log('Constructing GraphQL query for:', parsedData.objectName);
    
    // ========================================
    // GRAPHQL QUERY CONSTRUCTION LOGIC
    // ========================================
    
    // GraphQL mutation aligned with Lore type and LoreInput
    const query = `
      mutation AddOrUpdateLore($input: LoreInput!) {
        addOrUpdateLore(input: $input) {
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
      }
    `;
    
    // Construct variables object aligned with LoreInput type
    const variables = {
      input: {
        OBJECT_NAME: parsedData.loreData.objName ? parsedData.loreData.objName.toString().replace("'","\\'") : null,
        ITEM_TYPE: parsedData.loreData.itemType ? parsedData.loreData.itemType.toString() : null,
        ITEM_IS: parsedData.loreData.itemIs ? parsedData.loreData.itemIs.toString() : null,
        SUBMITTER: parsedData.loreData.submitter ? parsedData.loreData.submitter.toString() : null,
        AFFECTS: parsedData.loreData.affects ? parsedData.loreData.affects.toString() : null,
        APPLY: parsedData.loreData.apply ? parsedData.loreData.apply : null,
        RESTRICTS: parsedData.loreData.restricts ? parsedData.loreData.restricts.toString() : null,
        CREATE_DATE: parsedData.timestamp,
        CLASS: parsedData.loreData.weapClass ? parsedData.loreData.weapClass.toString() : null,
        MAT_CLASS: parsedData.loreData.matClass ? parsedData.loreData.matClass.toString() : null,
        MATERIAL: parsedData.loreData.material ? parsedData.loreData.material.toString() : null,
        ITEM_VALUE: parsedData.loreData.value ? parsedData.loreData.value.toString() : null,
        EXTRA: parsedData.loreData.extra ? parsedData.loreData.extra.toString() : null,
        IMMUNE: parsedData.loreData.immune ? parsedData.loreData.immune.toString() : null,
        EFFECTS: parsedData.loreData.effects ? parsedData.loreData.effects.toString() : null,
        WEIGHT: parsedData.loreData.weight ? parsedData.loreData.weight: null,
        CAPACITY: parsedData.loreData.capacity ? parsedData.loreData.capacity : null,
        ITEM_LEVEL: parsedData.loreData.spell ? parsedData.loreData.spell.toString() : null,
        CONTAINER_SIZE: parsedData.loreData.containerSize ? parsedData.loreData.containerSize : null,
        CHARGES: parsedData.loreData.charges ? parsedData.loreData.charges : null,
        SPEED: parsedData.loreData.speed ? parsedData.loreData.speed : null,
        ACCURACY: parsedData.loreData.accuracy ? parsedData.loreData.accuracy: null,
        POWER: parsedData.loreData.power ? parsedData.loreData.power : null,
        DAMAGE: parsedData.loreData.damage ? parsedData.loreData.damage.toString() : null
      }
    };

    // ========================================
    // QUERY VALIDATION
    // ========================================
    
    // Validate query structure
    if (!query || !variables) {
      isValid = false;
    }
    else {
      isValid = true;
    }
    
    if (isValid) {
      return { query, variables };
    }
    else {
      console.log('lorePasteHandler.constructLoreUpdateQuery(): Invalid query or variables');
      return null;
    }
  } catch (error) {
    console.error('Error constructing GraphQL query:', error);
    return null;
  }
}

/**
 * Execute the GraphQL update mutation
 * @param {Object} graphqlQuery - The GraphQL query object with query and variables
 * @returns {Object|null} GraphQL result or null if execution fails
 */
async function executeLoreUpdate(graphqlQuery) {
  try {
    //console.log('Executing GraphQL update...');
    let isValid = true;
    
    // ========================================
    // YOUR GRAPHQL EXECUTION LOGIC GOES HERE
    // ========================================
    
    // Execute the GraphQL mutation
    const result = await graphqlClient.mutation(graphqlQuery.query, graphqlQuery.variables);
    
    // ========================================
    // RESULT VALIDATION
    // ========================================
    
    // Check for GraphQL errors
    if (result.errors && result.errors.length > 0) {
      console.error('GraphQL errors:', result.errors);
      //return null;
      isValid = false;
    }
    
    // Check for successful response with Lore data
    if (result.addOrUpdateLore) {
      //console.log('Lore updated successfully:', result.addOrUpdateLore);
      isValid = true;
      return result.addOrUpdateLore;
    }
    
    //console.error('No lore data returned from mutation');
    //return null;
    if (isValid) {
      return result.addOrUpdateLore;
    }
    else {
      return null;
    }    
  } catch (error) {
    console.error('Error executing GraphQL update:', error);
    return null;
  }
} 