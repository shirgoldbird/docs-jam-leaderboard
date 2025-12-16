import { NextResponse } from 'next/server';
import { calculateLeaderboard } from '@/lib/leaderboard';

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username;
    const leaderboard = calculateLeaderboard();
    const contributor = leaderboard.find(entry => entry.username === username);
    
    if (!contributor) {
      return NextResponse.json(
        { error: 'Contributor not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      contributor,
    });
  } catch (error) {
    console.error('Error fetching contributor:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

