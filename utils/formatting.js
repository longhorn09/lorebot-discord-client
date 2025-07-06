/**
 * Utility functions for formatting Discord bot responses
 */

/**
 * Formats affects data for display in Discord messages
 * Copied from original version of lorebot.js at https://github.com/longhorn09/lorebot/blob/master/lorebot.js
 * @param {string} pArg - The affects string to format
 * @returns {string} - Formatted affects string
 */
export const formatAffects = (pArg) => {
  if (!pArg) return '';
  
  let retvalue = "";
  let affectsArr = [];
  let sb = "";
  let affectBy = /^([A-Za-z_\s]+)\s*by\s*(.+)$/;
  let match = null;

  affectsArr = pArg.trim().split(",");
  for (let i = 0; i < affectsArr.length; i++) {
    if (affectBy.test(affectsArr[i].toString().trim())) {
      match = affectBy.exec(affectsArr[i].toString().trim());
      
      if (match[1].trim() === "casting level" ||
          match[1].trim() === "spell slots") {
        sb += "Affects".padEnd(9) + ": " + match[1].trim().padEnd(14) + "by " + match[2] + "\n";
      }
      else if (match[1].trim().toLowerCase().startsWith("skill ")) {
        sb += "Affects".padEnd(9) + ": " + match[1].trim().toLowerCase().padEnd(20) + "by " + match[2] + "\n";
      }
      else if (match[1].trim().length >= 13) {
        sb += "Affects".padEnd(9) + ": " + match[1].trim().toLowerCase() + " by  " + match[2] + "\n";
      }
      else {
        sb += "Affects".padEnd(9) + ": " + match[1].trim().toUpperCase().padEnd(14) + "by " + match[2] + "\n";
      }
    }
    else {
      sb += "Affects".padEnd(9) + ": " + affectsArr[i].toString().trim() + "\n";
    }
  }
  retvalue = sb;
  return retvalue;
}; 