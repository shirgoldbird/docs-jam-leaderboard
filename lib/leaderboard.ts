import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { findBountiesForFile } from './bounties';
import { getMergedPRsWithFiles, getPullRequests } from './github';
import { updateTrackedPRs, getTrackedPRsToCheck, removeTrackedPR } from './tracked-prs';

export interface Claim {
  bountyId: string;
  prNumber: number;
  contributor: string;
  mergedAt: string;
  points: number;
  filesChanged: string[];
  prTitle: string;
  prUrl: string;
}

export interface ClaimsData {
  claims: Claim[];
  lastSynced?: string;
}

export interface LeaderboardEntry {
  username: string;
  totalPoints: number;
  bountiesClaimed: number;
  claims: Claim[];
}

const DATA_DIR = join(process.cwd(), 'data');
const CLAIMS_FILE = join(DATA_DIR, 'claims.json');

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load claims from the data file
 */
export function loadClaims(): ClaimsData {
  ensureDataDir();
  
  if (!existsSync(CLAIMS_FILE)) {
    return { claims: [] };
  }

  try {
    const fileContents = readFileSync(CLAIMS_FILE, 'utf-8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error('Error loading claims:', error);
    return { claims: [] };
  }
}

/**
 * Save claims to the data file
 */
export function saveClaims(data: ClaimsData): void {
  ensureDataDir();
  
  try {
    writeFileSync(CLAIMS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving claims:', error);
    throw error;
  }
}

/**
 * Check if a bounty has already been claimed
 */
export function isBountyClaimed(bountyId: string): boolean {
  const data = loadClaims();
  return data.claims.some(claim => claim.bountyId === bountyId);
}

/**
 * Add a new claim
 */
export function addClaim(claim: Claim): void {
  const data = loadClaims();
  
  // Check if this bounty is already claimed
  if (isBountyClaimed(claim.bountyId)) {
    console.log(`Bounty ${claim.bountyId} already claimed, skipping`);
    return;
  }
  
  data.claims.push(claim);
  data.lastSynced = new Date().toISOString();
  saveClaims(data);
}

/**
 * Sync claims by checking merged PRs against bounties
 * Uses tracked PRs system to only check relevant PRs
 */
export async function syncClaims(): Promise<{ newClaims: number; totalClaims: number }> {
  console.log('Starting sync: Fetching open PRs...');
  
  // Step 1: Fetch current open PRs and update tracking
  const openPRs = await getPullRequests('open');
  console.log(`Found ${openPRs.length} open PRs`);
  updateTrackedPRs(openPRs);
  
  // Step 2: Get tracked PRs that are closed (might be merged)
  const trackedPRsToCheck = getTrackedPRsToCheck();
  console.log(`Checking ${trackedPRsToCheck.length} closed tracked PRs for merge status...`);
  
  if (trackedPRsToCheck.length === 0) {
    console.log('No closed PRs to check');
    const finalData = loadClaims();
    return {
      newClaims: 0,
      totalClaims: finalData.claims.length,
    };
  }
  
  // Step 3: Check which of these closed PRs are actually merged
  const prNumbersToCheck = trackedPRsToCheck.map(pr => pr.number);
  const mergedPRs = await getMergedPRsWithFiles(prNumbersToCheck);
  
  if (mergedPRs.length === 0) {
    console.log('No newly merged PRs found');
    const finalData = loadClaims();
    return {
      newClaims: 0,
      totalClaims: finalData.claims.length,
    };
  }
  
  // Step 4: Process merged PRs and create claims
  const existingData = loadClaims();
  const existingBountyIds = new Set(existingData.claims.map(c => c.bountyId));
  
  let newClaimsCount = 0;
  
  // Process PRs in chronological order (oldest first)
  const sortedPRs = mergedPRs.sort((a, b) => {
    const dateA = a.merged_at ? new Date(a.merged_at).getTime() : 0;
    const dateB = b.merged_at ? new Date(b.merged_at).getTime() : 0;
    return dateA - dateB;
  });
  
  for (const pr of sortedPRs) {
    if (!pr.merged_at || !pr.files) continue;
    
    // Check each file in the PR
    for (const file of pr.files) {
      const matchingBounties = findBountiesForFile(file.filename);
      
      for (const bounty of matchingBounties) {
        // Only claim if this bounty hasn't been claimed yet
        if (!existingBountyIds.has(bounty.id)) {
          const claim: Claim = {
            bountyId: bounty.id,
            prNumber: pr.number,
            contributor: pr.user.login,
            mergedAt: pr.merged_at,
            points: bounty.points,
            filesChanged: pr.files.map(f => f.filename),
            prTitle: pr.title,
            prUrl: pr.html_url,
          };
          
          addClaim(claim);
          existingBountyIds.add(bounty.id);
          newClaimsCount++;
        }
      }
    }
    
    // Remove this PR from tracking since we've processed it
    removeTrackedPR(pr.number);
  }
  
  const finalData = loadClaims();
  console.log(`Sync complete: ${newClaimsCount} new claims, ${finalData.claims.length} total claims`);
  return {
    newClaims: newClaimsCount,
    totalClaims: finalData.claims.length,
  };
}

/**
 * Calculate leaderboard from claims
 */
export function calculateLeaderboard(): LeaderboardEntry[] {
  const data = loadClaims();
  const contributorMap = new Map<string, LeaderboardEntry>();
  
  for (const claim of data.claims) {
    const existing = contributorMap.get(claim.contributor);
    
    if (existing) {
      existing.totalPoints += claim.points;
      existing.bountiesClaimed += 1;
      existing.claims.push(claim);
    } else {
      contributorMap.set(claim.contributor, {
        username: claim.contributor,
        totalPoints: claim.points,
        bountiesClaimed: 1,
        claims: [claim],
      });
    }
  }
  
  // Sort by total points (descending), then by bounties claimed
  const leaderboard = Array.from(contributorMap.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return b.bountiesClaimed - a.bountiesClaimed;
  });
  
  return leaderboard;
}

