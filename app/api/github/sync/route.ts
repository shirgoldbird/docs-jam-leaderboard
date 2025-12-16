import { NextResponse } from 'next/server';
import { syncClaims } from '@/lib/leaderboard';

export async function GET() {
  try {
    const result = await syncClaims();
    
    return NextResponse.json({
      success: true,
      ...result,
      message: `Synced claims. ${result.newClaims} new claims added.`,
    });
  } catch (error) {
    console.error('Error syncing claims:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Same as GET, allows triggering sync via POST
  return GET();
}

