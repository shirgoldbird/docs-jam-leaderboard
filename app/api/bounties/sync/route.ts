import { NextResponse } from 'next/server';
import { syncBounties } from '@/lib/bounties';

export async function GET() {
  try {
    const result = await syncBounties();
    
    return NextResponse.json({
      success: true,
      ...result,
      message: `Synced bounties. ${result.new} new, ${result.updated} updated.`,
    });
  } catch (error: any) {
    console.error('Error syncing bounties:', error);
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

