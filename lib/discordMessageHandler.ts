// lib/discordMessageHandler.ts
import { prisma } from '@/prisma/connection';
import { replyToIntercomConversation } from './intercomService';

export async function handleThreadMessage(message: { author: { bot: any; id: any; username: any; }; channel: { isThread: () => any; id: any; }; content: any; }) {
  if (message.author.bot || !message.channel.isThread()) return;

  try {
    // 1. Find the conversation
    const conversation = await prisma.conversation.findUnique({
      where: { discordThreadId: message.channel.id }
    });

    if (!conversation) return;

    // 2. Save to database
    await prisma.message.create({
      data: {
        content: message.content,
        source: 'DISCORD',
        conversationId: conversation.uuid
      }
    });
    
    await replyToIntercomConversation({
      conversationId: conversation.intercomConversationId,
      message: message.content,
      authorId: message.author.id,
      authorName: message.author.username
    });
    
  } catch (error) {
    console.error('Failed to handle thread message:', error);
  }
}