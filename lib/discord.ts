
import { createIntercomConversation } from './intercom';
import { fetchHelpTypes } from './helptype';
import  handleThreadMessage  from './discordMessageHandler';
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType
} from 'discord.js';
import { prisma } from '@/prisma/connection';

let helpTypes: string[] = [];

async function refreshHelpTypes() {
  try {
    helpTypes = await fetchHelpTypes();
    
    if (helpTypes.length === 0) {
      helpTypes = ['Billing', 'Technical', 'Account', 'Feature Request'];
      console.warn('Using default help types');
    }
  } catch (error) {
    console.error('Failed to refresh help types:', error);
    helpTypes = ['Billing', 'Technical', 'Account', 'Feature Request'];
  }
}

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

const helpCommand = new SlashCommandBuilder()
  .setName('gethelp')
  .setDescription('Create a help thread with our support team');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

export const setupDiscord = async () => {
  try {
    // Register commands
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, process.env.DISCORD_GUILD_ID!),
      { body: [helpCommand.toJSON()] }
    );

    // Initial help types load
    await refreshHelpTypes();
    setInterval(refreshHelpTypes, 60 * 60 * 1000);

    client.on('ready', () => {
      console.log(`Logged in as ${client.user?.tag}!`);
    });

    // Message handler for thread replies
    client.on(Events.MessageCreate, handleThreadMessage);

    // Help command handler
    client.on(Events.InteractionCreate, async interaction => {
      if (!interaction.isChatInputCommand() || interaction.commandName !== 'gethelp') return;

      const buttons = helpTypes.map(type => 
        new ButtonBuilder()
          .setCustomId(`help_type_${type.toLowerCase()}`)
          .setLabel(type)
          .setStyle(ButtonStyle.Success)
      );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

      await interaction.reply({
        content: 'What do you need help with?',
        components: [row],
        ephemeral: true,
      });
    });

    // Help type selection handler
    client.on(Events.InteractionCreate, async interaction => {
      if (!interaction.isButton() || !interaction.customId.startsWith('help_type_')) return;

      const helpType = interaction.customId.replace('help_type_', '');
      
      const modal = new ModalBuilder()
        .setCustomId(`help_modal_${helpType}`)
        .setTitle(`Help Request: ${helpType}`)
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('description')
              .setLabel("Describe your issue")
              .setStyle(TextInputStyle.Paragraph)
              .setMinLength(10)
              .setMaxLength(1000)
              .setRequired(true)
          )
        );

      await interaction.showModal(modal);
    });

    // Modal submission handler
    client.on(Events.InteractionCreate, async interaction => {
      if (!interaction.isModalSubmit() || !interaction.customId.startsWith('help_modal_')) return;

      const helpType = interaction.customId.replace('help_modal_', '');
      const description = interaction.fields.getTextInputValue('description');
      const user = interaction.user;

      if (!interaction.channel?.isTextBased() || interaction.channel.type !== ChannelType.GuildText) {
        return interaction.reply({ 
          content: 'Please use this command in a text channel', 
          ephemeral: true 
        });
      }

      try {
        // Create thread
        const thread = await (interaction.channel as TextChannel).threads.create({
          name: `${helpType} help - ${user.username}`,
          autoArchiveDuration: 60,
          reason: `Help request for ${helpType}`
        });

        // Create Intercom conversation
        const intercomConversation = await createIntercomConversation({
          userId: user.id,
          userName: user.username,
          helpType,
          description
        });

        // Save to database
        await prisma.conversation.create({
          data: {
            discordUserId: user.id,
            discordThreadId: thread.id,
            intercomConversationId: intercomConversation.id,
            helpType,
            description
          }
        });

        await interaction.reply({
          content: `Help thread created: ${thread}`,
          ephemeral: true
        });

        // Send initial message to thread
        await thread.send(`**${helpType} Help Request**\n\n${description}`);

      } catch (error) {
        console.error('Error creating help request:', error);
        await interaction.reply({
          content: 'Failed to create help request. Please try again.',
          ephemeral: true
        });
      }
    });

    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('Bot setup failed:', error);
    process.exit(1);
  }
};

export default client;
