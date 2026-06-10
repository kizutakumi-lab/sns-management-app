import { NextResponse } from 'next/server';
import { getTweet } from 'react-tweet/api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'No tweet ID provided' }, { status: 400 });
  }

  try {
    const tweet = await getTweet(id);
    if (!tweet) {
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 });
    }
    return NextResponse.json({ tweet });
  } catch (error) {
    console.error('Error fetching tweet:', error);
    return NextResponse.json({ error: 'Failed to fetch tweet' }, { status: 500 });
  }
}
