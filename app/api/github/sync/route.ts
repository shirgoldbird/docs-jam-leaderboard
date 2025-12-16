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
  } catch (error: any) {
    console.error('Error syncing claims:', error);
    
    // Check if it's a rate limit error
    const isRateLimit = error?.status === 403 || 
                       error?.status === 429 ||
                       (error?.message && error.message.includes('rate limit'));
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isRateLimit,
        message: isRateLimit 
          ? 'Rate limit exceeded. Please wait a few minutes and try again. The sync will continue from where it left off.'
          : 'Error syncing claims. Please try again.',
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}

export async function POST() {
  // Same as GET, allows triggering sync via POST
  return GET();
}

