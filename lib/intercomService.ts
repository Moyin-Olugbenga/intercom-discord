import axios from 'axios';

// export async function createIntercomConversation( userId: any, userName: string, helpType:string, description: string) {
//   console.log(userId, userName, helpType, description);
//   try {
//   const contact = await axios.post(
//     'https://api.intercom.io/contacts',
//     {
//       external_id: userId
//     },
//     {
//       headers: {
//         'Authorization': `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
//         'Accept': 'application/json',
//         'Content-Type': 'application/json'
//       }
//     }
//   );
//   console.log(contact);
//   const response = await axios.post(
//     'https://api.intercom.io/conversations',
//     {
//       from: {
//         type: 'user',
//         id: contact?.id
//       },
//       body: `**${helpType}**\n\n${description}`
//     },
//     {
//       headers: {
//         'Authorization': `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
//         'Accept': 'application/json'
//       }
//     }
//   );
//   return response.data;

//   } catch (error) {
//     console.error('Intercom API Error:', {
//       status: error
//     })
//   throw error;
//   }
// }

interface IntercomContact {
  id: string;
  // Add other contact properties you expect in the response
}

interface IntercomConversation {
  id: string;
  // Add other conversation properties you expect
}

export async function createIntercomConversation(
  userId: string, // Changed from 'any' to 'string' for better typing
  userName: string,
  helpType: string,
  description: string
) {
  try {
    // Create or find contact
    const contactResponse = await axios.post<IntercomContact>(
      'https://api.intercom.io/contacts',
      {
        external_id: userId,
        name: userName // Include name if you want it in Intercom
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    // Create conversation
    const conversationResponse = await axios.post<IntercomConversation>(
      'https://api.intercom.io/conversations',
      {
        from: {
          type: 'user',
          id: contactResponse.data.id
        },
        body: `**${helpType}**\n\n${description}`
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    return conversationResponse.data;

  } catch (error) {
    console.error('Intercom API Error:', error);
    throw error;
  }
}



export async function replyToIntercomConversation(
  conversationId: string,
  message: string,
  authorId: string,
  authorName: string
) {
  await axios.post(
    `https://api.intercom.io/conversations/${conversationId}/reply`,
    {
      type: 'user',
      body: `[Discord - ${authorName}]: ${message}`,
      user_id: authorId
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
        'Accept': 'application/json'
      }
    }
  );
}