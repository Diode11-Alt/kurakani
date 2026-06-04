import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const turnSecret = process.env.TURN_SECRET || 'your_super_secret_turn_key_here'; // Fallback to template for local dev if missing
  
  if (!turnSecret) {
    return NextResponse.json({ error: 'TURN_SECRET is not configured' }, { status: 500 });
  }

  // Generate username: Unix timestamp + 24 hours (86400 seconds)
  const username = Math.floor(Date.now() / 1000) + 86400;
  
  // Generate HMAC-SHA1 signature
  const hmac = crypto.createHmac('sha1', turnSecret);
  hmac.update(username.toString());
  const password = hmac.digest('base64');
  
  return NextResponse.json({
    username: username.toString(),
    credential: password
  });
}
