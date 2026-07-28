import { NextResponse } from 'next/server';

/** Legacy redirect — prefer /register for the guided signup flow. */
export function GET(request) {
  return NextResponse.redirect(new URL('/register', request.url));
}
