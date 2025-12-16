import { fetchBountyIssues, fetchUpdatedBountyIssues } from './github-issues';

export interface Bounty {
  id: string;
  page: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  points: number;
  description?: string;
}

let cachedBounties: Bounty[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load bounties from GitHub Issues
 */
export async function loadBounties(forceRefresh: boolean = false): Promise<Bounty[]> {
  const now = Date.now();
  
  // Return cached bounties if still fresh
  if (!forceRefresh && cachedBounties && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedBounties;
  }

  try {
    // Fetch from GitHub Issues
    const bounties = await fetchBountyIssues(forceRefresh);
    
    cachedBounties = bounties;
    cacheTimestamp = now;
    
    return bounties;
  } catch (error) {
    console.error('Error loading bounties from GitHub:', error);
    // Return cached bounties if available, even if stale
    if (cachedBounties) {
      console.warn('Returning stale cached bounties due to error');
      return cachedBounties;
    }
    return [];
  }
}

/**
 * Sync bounties - get only updated issues
 */
export async function syncBounties(): Promise<{ new: number; updated: number; total: number }> {
  try {
    const updatedBounties = await fetchUpdatedBountyIssues();
    const existingIds = new Set(cachedBounties?.map(b => b.id) || []);
    
    let newCount = 0;
    let updatedCount = 0;
    
    for (const bounty of updatedBounties) {
      if (existingIds.has(bounty.id)) {
        updatedCount++;
        // Update existing bounty
        const index = cachedBounties!.findIndex(b => b.id === bounty.id);
        if (index >= 0) {
          cachedBounties![index] = bounty;
        }
      } else {
        newCount++;
        cachedBounties = cachedBounties || [];
        cachedBounties.push(bounty);
      }
    }
    
    cacheTimestamp = Date.now();
    
    return {
      new: newCount,
      updated: updatedCount,
      total: cachedBounties?.length || 0,
    };
  } catch (error) {
    console.error('Error syncing bounties:', error);
    throw error;
  }
}

/**
 * Get a bounty by ID
 */
export async function getBountyById(id: string): Promise<Bounty | undefined> {
  const bounties = await loadBounties();
  return bounties.find(b => b.id === id);
}

/**
 * Add a new bounty (creates GitHub issue - no longer writes to local file)
 * Returns the bounty with generated ID
 */
export function generateBountyId(bounty: Omit<Bounty, 'id'>): string {
  // Generate ID from page path and timestamp
  return `${bounty.page.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
}

/**
 * Find bounties that match a file path
 * Matches exact paths or paths that end with the bounty page
 */
export async function findBountiesForFile(filePath: string): Promise<Bounty[]> {
  const bounties = await loadBounties();
  
  return bounties.filter(bounty => {
    // Exact match
    if (bounty.page === filePath) {
      return true;
    }
    
    // Match if file path ends with bounty page
    if (filePath.endsWith(bounty.page)) {
      return true;
    }
    
    // Match if file path includes bounty page (for nested paths)
    if (filePath.includes(bounty.page)) {
      return true;
    }
    
    return false;
  });
}

/**
 * Clear the bounties cache (useful for development)
 */
export function clearBountiesCache(): void {
  cachedBounties = null;
  cacheTimestamp = 0;
}
