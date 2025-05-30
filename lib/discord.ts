
// lib/discord.ts
import { createIntercomConversation } from './intercom';
import { fetchHelpTypes, initializeHelpTypes } from './helptype';
import { handleThreadMessage } from './discordMessageHandler';
import {
  Client,
  GatewayIntentBits,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  ButtonInteraction,
  ModalSubmitInteraction
} from 'discord.js';
import { ensureConnection, prisma } from '@/prisma/connection';

// Singleton client instance
let clientInstance: Client | null = null;
let helpTypes: string[] = [];

async function postInitialHelpButton(client: Client) {
  try {
    const button = new ButtonBuilder()
      .setCustomId('show_help_types')
      .setLabel(process.env.HELP_BUTTON_LABEL || 'Get Help')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    let channel: TextChannel | null = null;

    // Try to fetch the configured channel
    if (process.env.DISCORD_HELP_CHANNEL_ID) {
      const fetched = await client.channels.fetch(process.env.DISCORD_HELP_CHANNEL_ID);
      if (fetched?.type === ChannelType.GuildText) {
        channel = fetched as TextChannel;
      }
    }

    // Fallback to first available text channel
    if (!channel) {
      channel = client.channels.cache.find(
        ch => ch.type === ChannelType.GuildText
      ) as TextChannel | null;
    }

    if (!channel) {
      console.warn('No valid text channel found to post the help button.');
      return;
    }

      await channel.send({
        content: 'Click the button below to get help from our support team',
        components: [row],
      });
  } catch (error) {
    console.error('Failed to post help button:', error);
  }
}

async function showHelpTypeSelection(interaction: ButtonInteraction) {
  if (interaction.customId !== 'show_help_types') return;

  try {
    // Create buttons for each help type
    const buttons = helpTypes.map(type => 
      new ButtonBuilder()
        .setCustomId(`help_type_${type.toLowerCase().replace(/\s+/g, '_')}`)
        .setLabel(type)
        .setStyle(ButtonStyle.Secondary)
    );


    const rows = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

      await interaction.reply({
        content: 'What do you need help with?',
        components: [rows],
        ephemeral: true,
      });
  } catch (error) {
    console.error('Error showing help types:', error);
    await interaction.reply({
      content: 'Failed to load help options. Please try again.',
      ephemeral: true
    }).catch(console.error);
  }
}

async function showHelpRequestForm(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith('help_type_')) return;

  const helpType = interaction.customId.replace('help_type_', '').replace(/_/g, ' ');

  try {
    const modal = new ModalBuilder()
      .setCustomId(`help_request_${helpType.replace(/\s+/g, '_')}`)
      .setTitle(`${helpType} Help Request`)
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('help_description')
            .setLabel("Please describe your issue in detail")
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(20)
            .setMaxLength(1000)
            .setRequired(true)
        )
      );

    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error showing help form:', error);
    await interaction.reply({
      content: 'Failed to open help form. Please try again.',
      ephemeral: true
    }).catch(console.error);
  }
}

async function handleHelpRequestSubmission(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith('help_request_')) return;

  const helpType = interaction.customId.replace('help_request_', '').replace(/_/g, ' ');
  const description = interaction.fields.getTextInputValue('help_description');
  const user = interaction.user;

  if (!interaction.channel?.isTextBased() || interaction.channel.type !== ChannelType.GuildText) {
    return interaction.reply({ 
      content: 'Please submit this form in a text channel', 
      ephemeral: true 
    }).catch(console.error);
  }

  try {
    // Create thread with help type in name
    const threadName = `[${helpType}] ${user.username}'s request`;
    const thread = await (interaction.channel as TextChannel).threads.create({
      name: threadName.substring(0, 100), // Ensure name isn't too long
      autoArchiveDuration: 1440, // 24 hours
      reason: `${helpType} help request from ${user.username}`
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
        message: description
      }
    });

    await interaction.reply({
      content: `Your ${helpType} help thread has been created: ${thread}`,
      ephemeral: true
    }).catch(console.error);

    // Send initial message to thread
    await thread.send(`**${helpType} Help Request**\n\n**User:** ${user.username}\n\n**Description:**\n${description}`)
      .catch(console.error);

  } catch (error) {
    console.error('Error processing help request:', error);
    await interaction.reply({
      content: 'Failed to process your help request. Please try again.',
      ephemeral: true
    }).catch(console.error);
  }
}

function setupEventHandlers(client: Client) {

  client.on(Events.MessageCreate, handleThreadMessage);
  console.log("Handled create message ");
  
  client.on(Events.InteractionCreate, async interaction => {
    try {
      if (interaction.isButton()) {
        if (interaction.customId === 'show_help_types') {
          await showHelpTypeSelection(interaction);
        console.log("Event handler for Help type selection ");
        } else if (interaction.customId.startsWith('help_type_')) {
          await showHelpRequestForm(interaction);
        console.log("Event handler for Help type form ");
        }
      } else if (interaction.isModalSubmit()) {
        await handleHelpRequestSubmission(interaction);
      }
    } catch (error) {
      console.error('Error handling interaction:', error);
    }
  });
}

export async function getDiscordClient(): Promise<Client> {
    console.log("Get discord client")
  clientInstance = new Client({ 
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });
  
  if (clientInstance?.isReady()) {
    console.log("Client Instance logged in")
    return clientInstance;
  }

  if (!process.env.DISCORD_TOKEN! || !process.env.DISCORD_HELP_CHANNEL_ID!) {
    throw new Error('Missing required Discord environment variables');
  }


  try {
    // Login to Discord
    await clientInstance.login(process.env.DISCORD_TOKEN!);
    console.log("Client logged in")
    
    // Initialize database connection
    await ensureConnection();

    helpTypes = await fetchHelpTypes();
    console.log('Available help types:', helpTypes);
  clientInstance.on('ready', async () => {
    console.log(`Logged in as ${clientInstance!.user?.tag}!`);
    await initializeHelpTypes();
    await postInitialHelpButton(clientInstance!);
  });
    
    // Setup event handlers
    setupEventHandlers(clientInstance);

    return clientInstance;
  } catch (error) {
    console.error('Bot initialization failed:', error);
    await cleanupDiscordClient();
    throw error;
  }
}

export async function cleanupDiscordClient(): Promise<void> {
  if (clientInstance) {
    await clientInstance.destroy();
    clientInstance = null;
  }
}

export default { getDiscordClient, cleanupDiscordClient };