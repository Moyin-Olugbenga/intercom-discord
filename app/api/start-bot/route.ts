
import  client  from '@/lib/discord';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const getClient = await client;
    return NextResponse.json({
      status: 'running',
      user: client.user?.tag
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to start bot' },
      { status: 500 }
    );
  }
}