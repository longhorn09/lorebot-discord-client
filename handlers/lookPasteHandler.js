"use strict";

import { MessageFlags } from 'discord.js';
import { graphqlClient } from '../utils/graphql.js';
import moment from 'moment';

const MYSQL_DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss"; // for use with moment().format(MYSQL_DATETIME_FORMAT) 
const lookEqData = {
  charName: null,
  timestamp: moment().format(MYSQL_DATETIME_FORMAT), // MySQL 8.4 handles ISO 8601 format well
  // Alternative: new Date().toISOString().slice(0, 19).replace('T', ' ') // MySQL DATETIME format
  equipment: {
    light: null,
    ring1: null,
    ring2: null,
    neck1: null,
    neck2: null,
    body: null,
    onchest: null,    // https://github.com/longhorn09/lorebot/issues/42
    head: null,
    legs: null,
    feet: null,
    arms: null,
    slung: null,
    hands: null,
    shield: null,
    about: null,
    waist: null,
    pouch: null,
    rwrist: null,
    lwrist: null,
    secondary: null,
    held: null, // affects is built up as a comma separated string if multiple affects are found
    both: null, // Not yet implemented in the original logic.
    submitter: null
    // Add more fields as needed
  } 
};

/**
 * Handle look log pattern operations when the look log pattern is detected
 * @param {string} pUser - The discord username of the user who is pasting the look log
 * @param {string} pOne_EqLook - The look log message
 */
export async function handleLookLogPattern(pUser, pOne_EqLook) {
  try {
    let isValid = true;
    //console.log(`Processing look log pattern message: ${capturedContent}`);
    
    // ========================================
    // MESSAGE PARSING LOGIC
    // ========================================
    
    // Parse the full message content for look data
    let parsedLookData = null;
    if (isValid) {
      parsedLookData = await parseLookMessage(pUser, pOne_EqLook);
    }
    
    if (parsedLookData === null) {
      isValid = false;
    }
    
    //console.log('Parsed look data:', JSON.stringify(parsedLookData, null, 2));
    
    // ========================================
    // GRAPHQL QUERY CONSTRUCTION
    // ========================================
    
    let graphqlQuery = null;
    graphqlQuery = constructLookUpdateQuery(parsedLookData);
    
    if (graphqlQuery === null) {
      isValid = false;      
    }
    
    //console.log('GraphQL Query:', graphqlQuery.query);
    //console.log('GraphQL Variables:', JSON.stringify(graphqlQuery.variables, null, 2));
    
    // ========================================
    // GRAPHQL API CALL
    // ========================================
    
    let result = null;
    //const result = await executeLookUpdate(graphqlQuery);
    
    if (!result) {
      isValid = false;  
      //console.log('GraphQL update failed');
      // Note: Cannot reply to message here as message object is not available
      //return;
    }
    // ========================================
    // SUCCESS RESPONSE
    // ========================================
    
    //console.log('Look data updated successfully:', result);
    // Note: Cannot reply to message here as message object is not available
    
  } catch (error) {
    console.error('Error in lookPasteHandler.handleLookLogPattern():', error);
    // Note: Cannot reply to message here as message object is not available
  }
}

/**
 * Parse the look message content to extract relevant data
 * @param {string} pSubmitter - The submitter name
 * @param {string} messageContent - The full message content
 * @returns {Object|null} Parsed look data or null if parsing fails
 */
async function parseLookMessage(pSubmitter, messageContent) {
  try {
    //console.log('Parsing look message:', messageContent);
    let splitArr = null;
    let match = null;
    let line = null;
    let isValid = true;
    let retvalue = null;

    
    // Reset lookEqData for new parsing
    lookEqData.charName = null;
    lookEqData.timestamp = moment().format(MYSQL_DATETIME_FORMAT);
    lookEqData.equipment = {
      light: null,
      ring1: null,
      ring2: null,
      neck1: null,
      neck2: null,
      body: null,
      onchest: null,
      head: null,
      legs: null,
      feet: null,
      arms: null,
      slung: null,
      hands: null,
      shield: null,
      about: null,
      waist: null,
      pouch: null,
      rwrist: null,
      lwrist: null,
      primary: null,
      secondary: null,
      held: null,
      both: null,
      submitter: null
    };
  
    // ========================================
    // YOUR MESSAGE PARSING LOGIC GOES HERE
    // ========================================
    lookEqData.equipment.submitter = pSubmitter;
    
    // ========================================
    // PARSING STEPS (placeholder structure)
    // ========================================
    
    splitArr = messageContent.split("\n");

    //console.log(`splitArr.length: ${splitArr.length}`);
    for (let i = 0; i < splitArr.length;i++) {
      line =  splitArr[i].trim();
      //wearWorn = null;
      if (/^([A-Z][a-z]+) is using:$/g.test( splitArr[i].trim())) {
        lookEqData.charName =  /^([A-Z][a-z]+) is using:$/.exec(line)[1];
        //console.log (`ParseEqLook(charName): ${charName}`);
      }
      else if ( /^<([a-z\s]+)>\s+(.+)$/.test(line)  ) {
        match = /^<([a-z\s]+)>\s+(.+)$/.exec(line);
        //console.log(`matched <${/^<([a-z\s]+)>\s+(.+)$/.exec(line)[1]}>`);
        switch(match[1].trim()) {
          case "used as light":
            lookEqData.equipment.light = match[2].trim();
            break;
          case "worn on finger":
            // idea is - if the ring1 variable is not null, 
            // then we must be looking at the second ring and thus need to set ring2 to the new value
            if (lookEqData.equipment.ring1 != null && lookEqData.equipment.ring1.length > 0) {              
              lookEqData.equipment.ring2 = match[2].trim();
            }
            else {  // this is the first pass, thus ring1
              lookEqData.equipment.ring1 = match[2].trim();
            }
            break;
          case "worn around neck":
            // similar idea as the ring logic above
            // if the first neck1 already exists, then must be parsing neck2
            if (lookEqData.equipment.neck1 != null && lookEqData.equipment.neck1.length > 0) {
              lookEqData.equipment.neck2 = match[2].trim();
            }
            else {  // this is the first pass, thus neck1
              lookEqData.equipment.neck1 = match[2].trim();
            }
            break;
          case "worn on body":
            lookEqData.equipment.body = match[2].trim();
            break;
          case "worn on head":
            lookEqData.equipment.head = match[2].trim();
            break;
          case "worn on legs":
            lookEqData.equipment.legs = match[2].trim();
            break;
          case "worn on feet":
            lookEqData.equipment.feet = match[2].trim();
            break;
          case "worn on arms":
            lookEqData.equipment.arms = match[2].trim();
            break;
          case "slung over shoulder":
            lookEqData.equipment.slung = match[2].trim();
            break;
          case "worn on hands":
            lookEqData.equipment.hands = match[2].trim();
            break;
          case "worn as shield":
            lookEqData.equipment.shield = match[2].trim();
            break;
          case "worn about body":
            lookEqData.equipment.about = match[2].trim();
            break;
            case "worn on chest":
              lookEqData.equipment.onchest = match[2].trim();
              break;            
          case "worn about waist":
            lookEqData.equipment.waist = match[2].trim();
            break;
          case "worn as pouch":
            lookEqData.equipment.pouch = match[2].trim();
            break;
          case "worn around right wrist":
            lookEqData.equipment.rwrist = match[2].trim();
            break;
          case "worn around left wrist":
            lookEqData.equipment.lwrist = match[2].trim();
            break;
          case "used in primary hand":
            lookEqData.equipment.primary = match[2].trim();
            break;
          case "used in secondary hand":
            lookEqData.equipment.secondary = match[2].trim();
            break;
          case "held in secondary hand":
            lookEqData.equipment.held = match[2].trim();
            break;
          case "used in both hands":
            lookEqData.equipment.both = match[2].trim();
            break;
          default:
            break;
        }
      }
      else {
        break;
      }
    } 
    
    // ========================================
    // VALIDATION
    // ========================================
    
    // Validate that required fields are present
    if (lookEqData.charName === null) {
      isValid = false;
      //console.log('Missing character name in parsed data');
      //return null;
    }
    
    // Add more validation as needed
    console.log(`lookEqData: ${JSON.stringify(lookEqData, null, 2)}`);

    if (isValid) {
      retvalue = lookEqData;
    }
    else {
      retvalue = null;
    }
    return retvalue;        
  }   // error handling - try/catch block
  catch (error) {
    console.error('Error parsing look message:', error);
    return null;
  }
}

/**
 * Construct GraphQL mutation query for updating look data
 * @param {Object} parsedData - The parsed look data
 * @returns {Object|null} GraphQL query object or null if construction fails
 */
function constructLookUpdateQuery(parsedData) {
  try {
    //let retvalue = null;
    //console.log('Constructing GraphQL query for:', parsedData.charName);
    
    // ========================================
    // YOUR GRAPHQL QUERY CONSTRUCTION LOGIC GOES HERE
    // ========================================
    
    // GraphQL mutation matching the equipment structure
    const query = `
      mutation UpdateCharacterEquipment($input: UpdateCharacterEquipmentInput!) {
        updateCharacterEquipment(input: $input) {
          success
          message
          character {
            id
            name
            charName
            timestamp
            equipment {
              light
              ring1
              ring2
              neck1
              neck2
              body
              onchest
              head
              legs
              feet
              arms
              slung
              hands
              shield
              about
              waist
              pouch
              rwrist
              lwrist
              primary
              secondary
              held
              both
              submitter
            }
            updatedAt
          }
          errors {
            field
            message
          }
        }
      }
    `;
    
    // Construct variables object matching the equipment structure
    const variables = {
      input: {
        characterName: parsedData.charName,
        timestamp: parsedData.timestamp,
        equipment: {
          light: parsedData.equipment.light,
          ring1: parsedData.equipment.ring1,
          ring2: parsedData.equipment.ring2,
          neck1: parsedData.equipment.neck1,
          neck2: parsedData.equipment.neck2,
          body: parsedData.equipment.body,
          onchest: parsedData.equipment.onchest,
          head: parsedData.equipment.head,
          legs: parsedData.equipment.legs,
          feet: parsedData.equipment.feet,
          arms: parsedData.equipment.arms,
          slung: parsedData.equipment.slung,
          hands: parsedData.equipment.hands,
          shield: parsedData.equipment.shield,
          about: parsedData.equipment.about,
          waist: parsedData.equipment.waist,
          pouch: parsedData.equipment.pouch,
          rwrist: parsedData.equipment.rwrist,
          lwrist: parsedData.equipment.lwrist,
          primary: parsedData.equipment.primary,
          secondary: parsedData.equipment.secondary,
          held: parsedData.equipment.held,
          both: parsedData.equipment.both,
          submitter: parsedData.equipment.submitter
        }
      }
    };
    
    // ========================================
    // QUERY VALIDATION
    // ========================================
    
    // Validate query structure
    if (!query || !variables) {
      //console.log('Invalid query or variables');
      return null;
    }
    
    return { query, variables };
    
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
async function executeLookUpdate(graphqlQuery) {
  try {
    console.log('Executing GraphQL update...');
    
    // ========================================
    // YOUR GRAPHQL EXECUTION LOGIC GOES HERE
    // ========================================
    
    // Execute the GraphQL mutation
    const result = await graphqlClient.mutate(graphqlQuery.query, graphqlQuery.variables);
    
    // ========================================
    // RESULT VALIDATION
    // ========================================
    
    // Check for GraphQL errors
    if (result.errors && result.errors.length > 0) {
      console.error('GraphQL errors:', result.errors);
      return null;
    }
    
    // Check for business logic errors
    if (result.data?.updateCharacterEquipment?.errors && result.data.updateCharacterEquipment.errors.length > 0) {
      console.error('Business logic errors:', result.data.updateCharacterEquipment.errors);
      return null;
    }
    
    // Check for success
    if (!result.data?.updateCharacterEquipment?.success) {
      console.error('Update was not successful:', result.data?.updateCharacterEquipment?.message);
      return null;
    }
    
    return result.data.updateCharacterEquipment;
    
  } catch (error) {
    console.error('Error executing GraphQL update:', error);
    return null;
  }
}

// ========================================
// HELPER FUNCTIONS (placeholder structure)
// ========================================

/**
 * Extract character name from message content
 * @param {string} messageContent - The message content
 * @returns {string|null} Character name or null if not found
 */
function extractCharacterName(messageContent) {
  // ========================================
  // YOUR CHARACTER NAME EXTRACTION LOGIC GOES HERE
  // ========================================
  
  // Example: Look for pattern like "CharacterName is using:"
  const nameMatch = messageContent.match(/^([A-Z][a-z]+)\s+is\s+using:/);
  return nameMatch ? nameMatch[1] : null;
}

/**
 * Parse equipment data from message content
 * @param {string} messageContent - The message content
 * @returns {Array} Array of equipment items
 */
function parseEquipmentData(messageContent) {
  // ========================================
  // YOUR EQUIPMENT PARSING LOGIC GOES HERE
  // ========================================
  
  const equipment = [];
  
  // Example parsing logic:
  // - Look for equipment sections
  // - Extract item names and properties
  // - Parse wear locations
  
  return equipment;
}

/**
 * Parse inventory data from message content
 * @param {string} messageContent - The message content
 * @returns {Array} Array of inventory items
 */
function parseInventoryData(messageContent) {
  // ========================================
  // YOUR INVENTORY PARSING LOGIC GOES HERE
  // ========================================
  
  const inventory = [];
  
  // Example parsing logic:
  // - Look for inventory sections
  // - Extract item names and quantities
  // - Parse container information
  
  return inventory;
}

/**
 * Parse character description from message content
 * @param {string} messageContent - The message content
 * @returns {string|null} Character description or null if not found
 */
function parseDescription(messageContent) {
  // ========================================
  // YOUR DESCRIPTION PARSING LOGIC GOES HERE
  // ========================================
  
  // Example parsing logic:
  // - Look for description sections
  // - Extract appearance details
  // - Parse physical characteristics
  
  return null;
}

/**
 * Parse character stats from message content
 * @param {string} messageContent - The message content
 * @returns {Object} Object containing character stats
 */
function parseStats(messageContent) {
  // ========================================
  // YOUR STATS PARSING LOGIC GOES HERE
  // ========================================
  
  const stats = {};
  
  // Example parsing logic:
  // - Look for stats sections
  // - Extract strength, dexterity, etc.
  // - Parse level and experience
  
  return stats;
}

/**
 * Extract metadata from message content
 * @param {string} messageContent - The message content
 * @returns {Object} Metadata object
 */
function extractMetadata(messageContent) {
  // ========================================
  // YOUR METADATA EXTRACTION LOGIC GOES HERE
  // ========================================
  
  const metadata = {
    source: 'discord',
    messageId: null,
    userId: null,
    channelId: null,
    guildId: null,
    timestamp: new Date().toISOString()
  };
  
  // Example extraction logic:
  // - Extract message ID
  // - Extract user information
  // - Extract channel/guild information
  
  return metadata;
} 