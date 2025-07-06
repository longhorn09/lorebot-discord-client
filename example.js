///############################################################
///### For Interaction ########################################
///############################################################

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

///############################################################
///### For Message ############################################
///############################################################

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