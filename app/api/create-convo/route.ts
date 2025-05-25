
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/prisma/connection';


export async function POST(req: NextRequest) {
  try {
    const { userId, discordThreadId, message } = await req.json();

    const intercomRes = await axios.post(
      'https://api.intercom.io/messages',
      {
        message_type: 'inapp',
        body: message,
        from: { type: 'user', user_id: userId },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    const intercomConversationId = intercomRes.data.conversation_id;

    await prisma.ticket.create({
      data: {
        discordUserId: userId,
        discordThreadId,
        intercomConversationId,
        message,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Conversation creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
