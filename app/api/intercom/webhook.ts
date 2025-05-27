import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/prisma/connection';
import client from '@/lib/discord';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const event = req.body;

  // Handle Intercom replies
  if (event.topic === 'conversation.admin.replied') {
    const conversationId = event.data.item.id;
    const message = event.data.item;

    const record = await prisma.conversation.findUnique({
      where: { intercomConversationId: conversationId }
    });

    if (record) {
      const thread = await client.channels.fetch(record.discordThreadId);
      if (thread?.isThread()) {
        await thread.send(`**Support Agent**: ${message.body}`);
      }
    }
  }

  res.status(200).end();
}