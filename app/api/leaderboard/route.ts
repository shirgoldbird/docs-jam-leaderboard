import { NextResponse } from 'next/server';
import { calculateLeaderboard, loadClaims } from '@/lib/leaderboard';

export async function GET() {
  try {
    const leaderboard = calculateLeaderboard();
    const claimsData = loadClaims();
    
    return NextResponse.json({
      leaderboard,
      lastSynced: claimsData.lastSynced,
      totalContributors: leaderboard.length,
    });
  } catch (error) {
    console.error('Error calculating leaderboard:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

