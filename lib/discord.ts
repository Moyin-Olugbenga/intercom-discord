
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
import { prisma } from '@/prisma/connection';

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

        const messages = await channel.messages.fetch({ limit: 20 });
        const deletePromises = messages.map(async msg => {
            try {
              return await msg.delete();
            } catch (message) {
              return console.error(message);
            }
          return Promise.resolve();
        });
        await Promise.all(deletePromises);


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
        await interaction.deferReply({ ephemeral: true });

      try {
        // Create buttons for each help type
         // Short delay before showing options
    // const btnId = `help_type_${Date.now()}_${Math.random().toString(36).substring(4, 10)}`;
    //       const buttons = helpTypes.map(type => 
    //         new ButtonBuilder()
    //           .setCustomId(btnId)
    //           .setLabel(type)
    //           .setStyle(ButtonStyle.Secondary)
    //       );
        
        // Short delay before showing options
          const buttons = helpTypes.map(type => 
            new ButtonBuilder()
              .setCustomId(`help_type_${type.toLowerCase().replace(/\s+/g, '_')}`)
              .setLabel(type)
              .setStyle(ButtonStyle.Secondary)
          );


          const rows = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
          await interaction.editReply({
            content: 'What do you need help with?',
            components: [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)],
          });

        } catch (error) {
            console.error('Error showing help types:', error);
            await interaction.followUp({
            content: 'Please try selecting again',
            ephemeral: true
        });
  }
  }

async function showHelpRequestForm(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith('help_type_')) return;

  const helpType = interaction.customId.replace('help_type_', '').replace(/_/g, ' ');
        const user = interaction.user;
    // await interaction.deferReply({ ephemeral: true });

  try { 
    const modalId = `help_request_${Date.now()}`;
    
    const modal = new ModalBuilder()
      .setCustomId(modalId)
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
    // await interaction.deleteReply().catch(console.error);
    }catch (error) {
    console.error('Modal error:', error);
    if (interaction.replied) {
      await interaction.followUp({
        content: "Please click the help button again",
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: "Click the button to open help form",
        ephemeral: true
      });
    }
  }
}

async function handleHelpRequestSubmission(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith('help_request_')) return;
    await interaction.deferReply({ ephemeral: true });

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
   
     const threadName = `Support - ${user.username}`.substring(0, 100);
        const thread = await (interaction.channel as TextChannel).threads.create({
            name: threadName,
            type: ChannelType.PrivateThread,
            invitable: false, // Prevents others from adding people
            reason: `Private support request from ${user.username} on ${helpType} `
        });

        // Add participants
        await thread.members.add(user.id); // Add the requester
        // await thread.members.add(process.env.SUPPORT_ROLE_ID!); // Add support team role


    // Create Intercom conversation
    const userId = user.id
    const userName = user.username
    console.log(userId, userName, helpType, description)
    // const intercomConversation = await createIntercomConversation(userId, userName, helpType, description);

    // Save to database
    await prisma.conversation.create({
      data: {
        discordUserId: user.id,
        discordThreadId: thread.id,
        intercomConversationId: thread.id,
        helpType,
        message: description
      }
    });

    await interaction.reply({
      content: `Your ${helpType} help thread has been created: ${thread}`,
      ephemeral: true
    }).catch(console.error);
      await interaction.editReply({
            content: `🔒 Private support thread created: ${thread}\n` +
                    `Our team has been notified and will respond shortly.`
        });

        // Initial thread message with support ping
        const supportMessage = await thread.send({
            content: `<@&${process.env.SUPPORT_ROLE_ID}> New private support request`,
            embeds: [{
                color: 0x054fb9,
                title: `${helpType} Support Request`,
                description: description,
                fields: [
                    { name: "User", value: `${user} (${user.tag})`, inline: true },
                    { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp/1000)}:D>`, inline: true },
                    { name: "Priority", value: "Normal", inline: true }
                ],
                footer: { text: "This thread is only visible to support staff and the user" }
            }],
            // components: [
            //     new ActionRowBuilder<ButtonBuilder>().addComponents(
            //         new ButtonBuilder()
            //             .setCustomId('support_close_thread')
            //             .setLabel('✔️ Resolve')
            //             .setStyle(ButtonStyle.Success),
            //         new ButtonBuilder()
            //             .setCustomId('support_escalate')
            //             .setLabel('⚠️ Escalate')
            //             .setStyle(ButtonStyle.Danger)
            //     )
            // ]
        });

        // Pin important message
        await supportMessage.pin().catch(console.error);

    } catch (error) {
        console.error('Thread creation failed:', error);
        
        await interaction.followUp({
            content: `⚠️ Error creating private thread\n` +
                    `Our team has been notified. Please message <@&${process.env.SUPPORT_ROLE_ID}> directly.`,
            ephemeral: true
        });
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
    if (clientInstance?.isReady()) {
      return clientInstance;
    }

    if (!process.env.DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN environment variable is required');
    }
    
  if (!process.env.DISCORD_HELP_CHANNEL_ID) {
    console.warn('DISCORD_HELP_CHANNEL_ID not set, will use first available text channel');
  }

  clientInstance = new Client({ 
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });
  
  // Setup all handlers before login
  setupEventHandlers(clientInstance);

try {    
      const loginPromise = new Promise<void>((resolve, reject) => {
      clientInstance!.once('ready', async () => {
        try {
          console.log(`✅ Logged in as ${clientInstance!.user!.tag}`);
          // await ensureConnection();
          helpTypes = await fetchHelpTypes();
          await postInitialHelpButton(clientInstance!);
          resolve();
        } catch (readyError) {
          reject(readyError);
        }
      });
    });
    
    // Start login process
    await clientInstance.login(process.env.DISCORD_TOKEN);
    await loginPromise; // Wait for ready event to complete

    return clientInstance;
  } catch (error) {
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