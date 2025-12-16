import { NextResponse } from 'next/server';
import { loadBounties } from '@/lib/bounties';
import { loadClaims } from '@/lib/leaderboard';

export async function GET() {
  try {
    const bounties = loadBounties();
    const claimsData = loadClaims();
    const claimedBountyIds = new Set(claimsData.claims.map(c => c.bountyId));
    
    const bountiesWithStatus = bounties.map(bounty => ({
      ...bounty,
      claimed: claimedBountyIds.has(bounty.id),
      claim: claimsData.claims.find(c => c.bountyId === bounty.id),
    }));
    
    return NextResponse.json({
      bounties: bountiesWithStatus,
      total: bounties.length,
      claimed: claimedBountyIds.size,
      available: bounties.length - claimedBountyIds.size,
    });
  } catch (error) {
    console.error('Error fetching bounties:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

