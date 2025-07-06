///### For Interaction ########################################
let tmp = `rec lore platinum.armor
You grab a scroll of legend lore.
You recite a scroll of legend lore which dissolves.
You feel informed:
 Object 'armor armour suit platinum dragonscale dragon scale exquisite paladine'
 Item Type: ARMOR
 Mat Class: metal        Material: platinum
 Weight   : 18           Value   : 2000

 Affects  : spell slots   by +2 at level 6
 Item is  : MAGIC BLESS ANTI_EVIL
 Restricts: NOMAGE NOTHIEF NOPALADIN NODRUID NORANGER NOWARRIOR NODARK_KNIGHT NOBARBARIAN NOBLACK_ROBE NORED_ROBE NOWHITE_ROBE NOSHAMAN
   Can use: Cleric
 Apply    : 5`;


    // regex pattern definitions 
    console.log('old tmp:', tmp);
    tmp = tmp.substring(tmp.indexOf("Object '"));
    console.log (`new tmp: ${tmp}`);


    const loreCapturePattern = /^\s*Object\s{1}'(.+)'\s*$/;
    console.log(loreCapturePattern.test(tmp.split('\n')[0]));
    //const lookLogPattern = /^([A-Z][a-z]+) is using:$/g;
  //  const deprecatedDelimPattern = /^\!(:roll|stat|query|brief|mark|recent|whoall|who|help).*/;
    
    // this exec will be retired, not really used here
    
    //const messageContent = message.content.trim().split('\n')[0];
    
    //const match1 = loreCapturePattern.exec(messageContent);

/*
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // User who invoked the command
  const user = interaction.user;
  console.log(`User ID: ${user.id}`);
  console.log(`User Tag: ${user.tag}`);
  console.log(`Username: ${user.username}`);
  console.log(`Global User Name: ${user.globalName}`);

  // Server (Guild) where the command was used
  const guild = interaction.guild;
  if (guild) {
    console.log(`Guild ID: ${guild.id}`);
    console.log(`Guild Name: ${guild.name}`);
  }
});

///### For Message ############################################

client.on('messageCreate', async message => {
  // Ignore messages from other bots
  if (message.author.bot) return;

  // User who sent the message
  const user = message.author;
  console.log(`User ID: ${user.id}`);
  console.log(`User Tag: ${user.tag}`);
  console.log(`Username: ${user.username}`);
  console.log(`Global User Name: ${user.globalName}`);

  // Server (Guild) where the message was sent
  const guild = message.guild;
  if (guild) {
    console.log(`Guild ID: ${guild.id}`);
    console.log(`Guild Name: ${guild.name}`);
  }
});
*/
/*

select PERSON_ID,CHARNAME,LIGHT,NECK1,HEAD,FEET,SHIELD,ABOUT,CREATE_DATE, SUBMITTER
from Person
where CHARNAME='Lin'

*/