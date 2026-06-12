import { NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile } from '@/lib/drive';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 });
  }

  try {
    const fileName = `${key}.json`;
    const data = await readJsonFile(fileName);
    return NextResponse.json(data || []);
  } catch (error) {
    console.error(`Error reading ${key}.json from drive:`, error);
    return NextResponse.json({ error: 'Failed to read data from Google Drive' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { key, value } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }

    const fileName = `${key}.json`;
    await writeJsonFile(fileName, value);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error writing to drive:', error);
    return NextResponse.json({ error: 'Failed to save data to Google Drive' }, { status: 500 });
  }
}
