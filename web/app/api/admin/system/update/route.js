import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://127.0.0.1:3001/status', { cache: 'no-store' });
    if (!res.ok) throw new Error('Electron IPC server returned error');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to connect to Electron IPC:', error);
    // If we're not running in Electron (e.g. npm run dev), simulate a status
    return NextResponse.json({ status: 'up-to-date', message: 'Not running in packaged app environment.', version: '' });
  }
}

export async function POST(req) {
  try {
    const { action } = await req.json();
    
    if (action === 'check') {
      const res = await fetch('http://127.0.0.1:3001/check', { method: 'POST' });
      const data = await res.json();
      return NextResponse.json(data);
    } else if (action === 'install') {
      const res = await fetch('http://127.0.0.1:3001/install', { method: 'POST' });
      const data = await res.json();
      return NextResponse.json(data);
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to communicate with Electron IPC:', error);
    return NextResponse.json({ error: 'Not running in packaged app environment.' }, { status: 500 });
  }
}
