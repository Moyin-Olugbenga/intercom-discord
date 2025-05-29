
import { getDiscordClient } from '@/lib/discord';

export async function GET() {
  try {
    const client = await getDiscordClient();
    return new Response(JSON.stringify({
      status: 'ready',
      username: client.user?.tag
    }));
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to start bot' }), {
      status: 500
    });
  }
}

// // import  client  from '@/lib/discord';
// import { NextResponse } from 'next/server';

// import getClient, { getDiscordClient }  from '@/lib/discord';


// export async function GET() {
//   try {
//     console.log("Gotten request")
//     const client = await getDiscordClient();
//     console.log("Gotten bot logged in")
//     return NextResponse.json({
//       status: client.isReady() ? 'ready' : 'connecting',
//       user: client.user?.tag
//     });
//   } catch (error) {
//     return NextResponse.json({ error: 'Bot failed' }, { status: 500 });
//   }

// }