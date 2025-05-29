// lib/intercom.ts
import { getDiscordClient } from '@/lib/discord';
import { prisma } from '@/prisma/connection';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const event = req.body;
    
    if (event.topic === 'conversation.admin.replied') {
      const { id: conversationId, body, author } = event.data.item;

      // 1. Find the conversation record
      const conversation = await prisma.conversation.findUnique({
        where: { intercomConversationId: conversationId },
        include: { messages: true }
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // 2. Send to Discord
      const client = await getDiscordClient();
      const thread = await client.channels.fetch(conversation.discordThreadId);
      
      if (!thread?.isThread()) {
        return res.status(404).json({ error: 'Thread not found' });
      }

      const discordMessage = await thread.send({
        content: `**${author.name}**: ${body}`,
        allowedMentions: { parse: [] }
      });

      // 3. Save to database
      await prisma.message.create({
        data: {
          content: body,
          source: 'INTERCOM',
          conversationId: conversation.uuid
        }
      });

      return res.status(200).json({ success: true });
    }

    res.status(200).end();
  } catch (error) {
    console.error('Intercom webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function for signature verification
// function verifySignature(signature: string | undefined, body: any): boolean {
//   if (!signature || !process.env.INTERCOM_WEBHOOK_SECRET) return false;
//   const hmac = crypto.createHmac('sha256', process.env.INTERCOM_WEBHOOK_SECRET);
//   hmac.update(JSON.stringify(body));
//   return hmac.digest('hex') === signature;
// }