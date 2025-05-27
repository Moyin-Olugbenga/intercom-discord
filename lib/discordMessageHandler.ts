import { prisma } from '@/prisma/connection';
import { replyToIntercomConversation } from './intercomService';

export default async function handleThreadMessage(message: { channel: { id: any; }; content: any; author: { id: any; username: any; }; }) {
  const record = await prisma.conversation.findUnique({
    where: { discordThreadId: message.channel.id }
  });

  if (record) {
    await replyToIntercomConversation({
      conversationId: record.intercomConversationId,
      message: message.content,
      authorId: message.author.id,
      authorName: message.author.username
    });
  }
}