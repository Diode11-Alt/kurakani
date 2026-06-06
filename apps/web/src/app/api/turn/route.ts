import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const turnSecret = process.env.TURN_SECRET || 'your_super_secret_turn_key_here'; // Fallback for local dev

  if (!turnSecret) {
    return NextResponse.json({ error: 'TURN_SECRET is not configured' }, { status: 500 });
  }

  // Generate username: Unix timestamp + 24 hours (86400 seconds)
  const username = Math.floor(Date.now() / 1000) + 86400;

  // Generate HMAC-SHA1 signature
  const hmac = crypto.createHmac('sha1', turnSecret);
  hmac.update(username.toString());
  const password = hmac.digest('base64');

  // TURN_HOST must be the PUBLIC IP or domain of your Coturn server.
  // This is NOT the same as your web server's hostname.
  // For remote users (different city/country) this MUST be reachable from the internet.
  const turnHost = process.env.TURN_HOST;

  if (!turnHost) {
    console.warn('[TURN API] TURN_HOST env var is not set. Remote users (different network) will NOT be able to connect via your self-hosted TURN server. Set TURN_HOST to your Coturn server\'s public IP or domain in .env.local');
  }

  return NextResponse.json({
    username: username.toString(),
    credential: password,
    // Send the host to the client so it uses the correct public TURN address
    host: turnHost || null,
  });
}
