// // lib/discord.ts
// import { createIntercomConversation } from './intercom';
// import { fetchHelpTypes } from './helptype';
// import handleThreadMessage from './discordMessageHandler';
// import {
//   Client,
//   GatewayIntentBits,
//   REST,
//   Routes,
//   SlashCommandBuilder,
//   TextChannel,
//   ActionRowBuilder,
//   ButtonBuilder,
//   ButtonStyle,
//   Events,
//   ModalBuilder,
//   TextInputBuilder,
//   TextInputStyle,
//   ChannelType
// } from 'discord.js';
// import { prisma } from '@/prisma/connection';

// // Singleton client instance
// let clientInstance: Client | null = null;
// let helpTypes: string[] = [];

// async function refreshHelpTypes() {
//   try {
//     console.log("Fetching help types");
//     helpTypes = await fetchHelpTypes();
    
//     if (helpTypes.length === 0) {
//       helpTypes = ['Billing', 'Appeal', 'Giveaway', 'Rust', 'Other'];
//       console.warn('Using default help types');
//     }
//   } catch (error) {
//     console.error('Failed to refresh help types:', error);
//     helpTypes = ['Billing', 'Appeal', 'Giveaway', 'Rust', 'Other'];
//   }
// }

// export async function getDiscordClient(): Promise<Client> {
//   if (clientInstance?.isReady()) {
//     return clientInstance;
//   }

//   // Initialize new client if needed
//   clientInstance = new Client({ 
//     intents: [
//       GatewayIntentBits.Guilds,
//       GatewayIntentBits.GuildMessages,
//       GatewayIntentBits.MessageContent
//     ]
//   });

//   // Setup command registry
//   const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
//   const helpCommand = new SlashCommandBuilder()
//     .setName('gethelp')
//     .setDescription('Request help from our support team');

//   // Register events
//   clientInstance.on('ready', () => {
//     console.log(`Logged in as ${clientInstance!.user?.tag}!`);
//   });

//   clientInstance.on(Events.MessageCreate, handleThreadMessage);

//   clientInstance.on(Events.InteractionCreate, async interaction => {
//     if (interaction.isChatInputCommand() && interaction.commandName === 'gethelp') {
      
//       const buttons = helpTypes.map(type => 
//         new ButtonBuilder()
//           .setCustomId(`help_type_${type.toLowerCase()}`)
//           .setLabel(type)
//           .setStyle(ButtonStyle.Success)
//       );

//       const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

//       await interaction.reply({
//         content: 'What do you need help with?',
//         components: [row],
//         ephemeral: true,
//       });
//     }
    
    
//     // Message handler for thread replies
//     clientInstance.on(Events.MessageCreate, handleThreadMessage);

//     // Help command handler
//     clientInstance.on(Events.InteractionCreate, async interaction => {
//       if (!interaction.isChatInputCommand() || interaction.commandName !== 'gethelp') return;

//       const buttons = helpTypes.map(type => 
//         new ButtonBuilder()
//           .setCustomId(`help_type_${type.toLowerCase()}`)
//           .setLabel(type)
//           .setStyle(ButtonStyle.Success)
//       );

//       const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

//       await interaction.reply({
//         content: 'What do you need help with?',
//         components: [row],
//         ephemeral: true,
//       });
//     });

//     // Help type selection handler
//     clientInstance.on(Events.InteractionCreate, async interaction => {
//       if (!interaction.isButton() || !interaction.customId.startsWith('help_type_')) return;

//       const helpType = interaction.customId.replace('help_type_', '');
      
//       const modal = new ModalBuilder()
//         .setCustomId(`help_modal_${helpType}`)
//         .setTitle(`Help Request: ${helpType}`)
//         .addComponents(
//           new ActionRowBuilder<TextInputBuilder>().addComponents(
//             new TextInputBuilder()
//               .setCustomId('description')
//               .setLabel("Describe your issue")
//               .setStyle(TextInputStyle.Paragraph)
//               .setMinLength(10)
//               .setMaxLength(1000)
//               .setRequired(true)
//           )
//         );

//       await interaction.showModal(modal);
//     });

//     // Modal submission handler
//     clientInstance.on(Events.InteractionCreate, async interaction => {
//       if (!interaction.isModalSubmit() || !interaction.customId.startsWith('help_modal_')) return;

//       const helpType = interaction.customId.replace('help_modal_', '');
//       const description = interaction.fields.getTextInputValue('description');
//       const user = interaction.user;

//       if (!interaction.channel?.isTextBased() || interaction.channel.type !== ChannelType.GuildText) {
//         return interaction.reply({ 
//           content: 'Please use this command in a text channel', 
//           ephemeral: true 
//         });
//       }

//       try {
//         // Create thread
//         const thread = await (interaction.channel as TextChannel).threads.create({
//           name: `${helpType} help - ${user.username}`,
//           autoArchiveDuration: 60,
//           reason: `Help request for ${helpType}`
//         });

//         // Create Intercom conversation
//         const intercomConversation = await createIntercomConversation({
//           userId: user.id,
//           userName: user.username,
//           helpType,
//           description
//         });

//         // Save to database
//         await prisma.conversation.create({
//           data: {
//             discordUserId: user.id,
//             discordThreadId: thread.id,
//             intercomConversationId: intercomConversation.id,
//             helpType,
//            message: description
//           }
//         });

//         await interaction.reply({
//           content: `Help thread created: ${thread}`,
//           ephemeral: true
//         });

//         // Send initial message to thread
//         await thread.send(`**${helpType} Help Request**\n\n${description}`);

//       } catch (error) {
//         console.error('Error creating help request:', error);
//         await interaction.reply({
//           content: 'Failed to create help request. Please try again.',
//           ephemeral: true
//         });
//       }
//     });

//   });

//   // Login to Discord
//   try {
//     // Register commands first
//     await rest.put(
//       Routes.applicationGuildCommands(
//         process.env.DISCORD_CLIENT_ID!, 
//         process.env.DISCORD_GUILD_ID!
//       ),
//       { body: [helpCommand.toJSON()] }
//     );

//     // Then login
//     await clientInstance.login(process.env.DISCORD_TOKEN);
    
//     // Initial help types load
//     await refreshHelpTypes();
//     setInterval(refreshHelpTypes, 60 * 60 * 1000);

//     return clientInstance;
//   } catch (error) {
//     console.error('Bot initialization failed:', error);
//     throw error;
//   }
// }

// // For TypeScript compatibility
// export default { getDiscordClient };



// lib/discord.ts
import { createIntercomConversation } from './intercom';
import { fetchHelpTypes } from './helptype';
import handleThreadMessage from './discordMessageHandler';
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

// Singleton client instance
let clientInstance: Client | null = null;
let helpTypes: string[] = [];

async function refreshHelpTypes() {
  try {
    console.log("Fetching help types");
    helpTypes = await fetchHelpTypes();
    
    if (helpTypes.length === 0) {
      helpTypes = ['Billing', 'Appeal', 'Giveaway', 'Rust', 'Other'];
      console.warn('Using default help types');
    }
  } catch (error) {
    console.error('Failed to refresh help types:', error);
    helpTypes = ['Billing', 'Appeal', 'Giveaway', 'Rust', 'Other'];
  }
}

function setupEventHandlers(client: Client) {
  // Ready event
  client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
  });

  // Message handler for thread replies
  client.on(Events.MessageCreate, handleThreadMessage);

  // Help command handler
  client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'gethelp') {
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
    }

    // Help type selection handler
    if (interaction.isButton() && interaction.customId.startsWith('help_type_')) {
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
    }

    // Modal submission handler
    if (interaction.isModalSubmit() && interaction.customId.startsWith('help_modal_')) {
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
            message: description
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
    }
  });
}

export async function getDiscordClient(): Promise<Client> {
  if (clientInstance?.isReady()) {
    return clientInstance;
  }

  // Initialize new client if needed
  clientInstance = new Client({ 
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  // Setup command registry
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
  const helpCommand = new SlashCommandBuilder()
    .setName('gethelp')
    .setDescription('Request help from our support team');

  // Setup all event handlers
  setupEventHandlers(clientInstance);

  // Login to Discord
  try {
    // Register commands first
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID!, 
        process.env.DISCORD_GUILD_ID!
      ),
      { body: [helpCommand.toJSON()] }
    );

    // Then login
    await clientInstance.login(process.env.DISCORD_TOKEN);
    
    // Initial help types load
    await refreshHelpTypes();
    setInterval(refreshHelpTypes, 60 * 60 * 1000);

    return clientInstance;
  } catch (error) {
    console.error('Bot initialization failed:', error);
    throw error;
  }
}

export default { getDiscordClient };