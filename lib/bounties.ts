import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface Bounty {
  id: string;
  page: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  points: number;
  description?: string;
}

export interface BountiesConfig {
  bounties: Bounty[];
}

let cachedBounties: Bounty[] | null = null;

/**
 * Load bounties from the config file
 */
export function loadBounties(): Bounty[] {
  if (cachedBounties) {
    return cachedBounties;
  }

  try {
    const configPath = join(process.cwd(), 'bounties.json');
    const fileContents = readFileSync(configPath, 'utf-8');
    const config: BountiesConfig = JSON.parse(fileContents);
    
    cachedBounties = config.bounties;
    return cachedBounties;
  } catch (error) {
    console.error('Error loading bounties:', error);
    return [];
  }
}

/**
 * Get a bounty by ID
 */
export function getBountyById(id: string): Bounty | undefined {
  const bounties = loadBounties();
  return bounties.find(b => b.id === id);
}

/**
 * Add a new bounty to the config file
 */
export function addBounty(bounty: Omit<Bounty, 'id'>): Bounty {
  const configPath = join(process.cwd(), 'bounties.json');
  const config: BountiesConfig = existsSync(configPath)
    ? JSON.parse(readFileSync(configPath, 'utf-8'))
    : { bounties: [] };
  
  // Generate ID from page path and timestamp
  const id = `${bounty.page.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
  const newBounty: Bounty = { ...bounty, id };
  
  config.bounties.push(newBounty);
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  
  // Clear cache
  cachedBounties = null;
  
  return newBounty;
}

/**
 * Find bounties that match a file path
 * Matches exact paths or paths that end with the bounty page
 */
export function findBountiesForFile(filePath: string): Bounty[] {
  const bounties = loadBounties();
  
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
}
