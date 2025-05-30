import axios from 'axios';

export async function createIntercomConversation(params: {
        userId: string,
        userName: string,
        helpType:string,
        description: string
}) {
  const response = await axios.post(
    'https://api.intercom.io/conversations',
    {
      from: {
        type: 'user',
        id: params.userId
      },
      body: `**${params.helpType}**\n\n${params.description}`
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
        'Accept': 'application/json'
      }
    }
  );
  return response.data;
}

export async function replyToIntercomConversation(params: {
  conversationId: string;
  message: string;
  authorId: string;
  authorName: string;
}) {
  await axios.post(
    `https://api.intercom.io/conversations/${params.conversationId}/reply`,
    {
      type: 'user',
      body: `[Discord - ${params.authorName}]: ${params.message}`,
      user_id: params.authorId
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
        'Accept': 'application/json'
      }
    }
  );
}