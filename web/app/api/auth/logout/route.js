import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST(request) {
  await deleteSession();
  return new Response(null, {
    status: 303,
    headers: { Location: '/login' }
  });
}
