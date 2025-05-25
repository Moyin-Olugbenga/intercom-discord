import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import axios from 'axios';
import { TextChannel } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });


// client.once('ready', () => {
//     console.log(`Bot is online as ${client.user?.tag}`);
// })

// client.login(process.env.DISCORD_TOKEN)

const command = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Create a new support ticket')
  .addStringOption(option =>
    option.setName('message').setDescription('Describe your issue').setRequired(true)
  );

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
const clientId = process.env.DISCORD_CLIENT_ID!;
const guildId = process.env.DISCORD_GUILD_ID!;

export const setupDiscord = async () => {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: [command.toJSON()],
  });

  client.on('ready', () => console.log(`Bot ready as ${client.user?.tag}`));

 
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'ticket') return;
  
    const message = interaction.options.getString('message');
  
    if (interaction.channel && interaction.channel instanceof TextChannel) {
      const thread = await interaction.channel.threads.create({
        name: `ticket-${interaction.user.username}`,
        autoArchiveDuration: 60,
      });
  
      await interaction.reply(`Your ticket has been created in thread: <#${thread.id}>`);
  
      await axios.post(`${process.env.NEXT_PUBLIC_SITE_URL}/api/create-conversation`, {
        userId: interaction.user.id,
        discordThreadId: thread.id,
        message,
      });
    } else {
      await interaction.reply("This command must be used inside a server text channel.");
    }
  });



  client.login(process.env.DISCORD_TOKEN);
};
