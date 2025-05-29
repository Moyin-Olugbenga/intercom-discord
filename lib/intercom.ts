import { prisma } from '@/prisma/connection';
import axios from 'axios';


export interface CreateConversationParams {
  userId: string;
  userName: string;
  helpType: string;
  description: string;
}

export const createIntercomConversation = async (params: CreateConversationParams) => {
  try {
    // First find or create a user in Intercom
    const userResponse = await axios.post(
      'https://api.intercom.io/contacts',
      {
        external_id: params.userId,
        name: params.userName,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.INTERCOM_API_KEY}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    // Then create a conversation
    const conversationResponse = await axios.post(
      'https://api.intercom.io/conversations',
      {
        from: {
          type: 'contact',
          id: userResponse.data.id,
        },
        body: `Help type: ${params.helpType}\n\n${params.description}`,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.INTERCOM_API_KEY}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    return conversationResponse.data;
  } catch (error) {
    console.error('Intercom error:', error);
    throw error;
  }
};

// Webhook handler for when Intercom conversations become tickets
export const handleIntercomWebhook = async (payload: { topic: string; data: { item: { id: string; ticket_id: string; }; }; }) => {
  if (payload.topic === 'conversation.admin.closed' || payload.topic === 'conversation.admin.assigned') {
    const conversationId = payload.data.item.id;
    
    // Update database if this conversation was converted to a ticket
    await prisma.conversation.updateMany({
      where: { intercomConversationId: conversationId },
      data: { intercomTicketId: payload.data.item.ticket_id || null },
    });
  }
};