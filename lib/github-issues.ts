import { Octokit } from '@octokit/rest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Bounty } from './bounties';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const GITHUB_ORG = process.env.GITHUB_ORG || 'DeepLcom';
const GITHUB_REPO = process.env.GITHUB_REPO || 'api-docs';

const DATA_DIR = join(process.cwd(), 'data');
const ISSUES_CACHE_FILE = join(DATA_DIR, 'issues-cache.json');

export interface IssueCacheEntry {
  issueNumber: number;
  bountyId: string;
  lastUpdated: string;
  etag?: string;
}

export interface IssuesCache {
  issues: IssueCacheEntry[];
  lastSynced?: string;
}

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load issues cache
 */
function loadIssuesCache(): IssuesCache {
  ensureDataDir();
  
  if (!existsSync(ISSUES_CACHE_FILE)) {
    return { issues: [] };
  }

  try {
    const fileContents = readFileSync(ISSUES_CACHE_FILE, 'utf-8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error('Error loading issues cache:', error);
    return { issues: [] };
  }
}

/**
 * Save issues cache
 */
function saveIssuesCache(cache: IssuesCache): void {
  ensureDataDir();
  
  try {
    writeFileSync(ISSUES_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving issues cache:', error);
  }
}

/**
 * Parse bounty information from issue body
 */
function parseBountyFromIssue(issue: any): Partial<Bounty> | null {
  const body = issue.body || '';
  
  // Extract file path
  const fileMatch = body.match(/\*\*File:\*\* `([^`]+)`/);
  const page = fileMatch ? fileMatch[1] : null;
  
  // Extract points
  const pointsMatch = body.match(/\*\*Points:\*\* (\d+)/);
  const points = pointsMatch ? parseInt(pointsMatch[1]) : null;
  
  // Extract priority
  const priorityMatch = body.match(/\*\*Priority:\*\* (low|medium|high)/);
  const priority = priorityMatch ? priorityMatch[1] as 'low' | 'medium' | 'high' : 'medium';
  
  // Extract bounty ID
  const idMatch = body.match(/\*\*Bounty ID:\*\* `([^`]+)`/);
  const bountyId = idMatch ? idMatch[1] : `issue-${issue.number}`;
  
  // Extract description (everything between the description and the separator)
  const descriptionMatch = body.match(/## Bounty:.*?\n\n.*?\n\n(.*?)\n\n---/s);
  const description = descriptionMatch ? descriptionMatch[1].trim() : '';
  
  if (!page || !points) {
    console.warn(`Issue #${issue.number} missing required fields (page: ${page}, points: ${points})`);
    return null;
  }
  
  return {
    id: bountyId,
    page,
    title: issue.title.replace(/^\[Bounty\]\s*/, ''), // Remove [Bounty] prefix if present
    priority,
    points,
    description: description || undefined,
  };
}

/**
 * Fetch all bounty issues from GitHub
 */
export async function fetchBountyIssues(forceRefresh: boolean = false): Promise<Bounty[]> {
  const cache = loadIssuesCache();
  const now = new Date().toISOString();
  
  console.log(`[GitHub Issues] Fetching bounty issues from ${GITHUB_ORG}/${GITHUB_REPO}`);
  
  try {
    // Fetch all issues with the 'bounty' or 'docs-jam' label
    const allIssues: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await octokit.issues.listForRepo({
        owner: GITHUB_ORG,
        repo: GITHUB_REPO,
        state: 'open',
        labels: 'bounty',
        per_page: 100,
        page,
        sort: 'updated',
        direction: 'desc',
      });
      
      // Filter to only issues with 'bounty' or 'docs-jam' label
      const filteredIssues = response.data.filter(issue => 
        issue.labels.some(label => 
          (typeof label === 'string' ? label : label.name) === 'bounty' ||
          (typeof label === 'string' ? label : label.name) === 'docs-jam'
        )
      );
      
      allIssues.push(...filteredIssues);
      hasMore = response.data.length === 100;
      page++;
      
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
      }
    }
    
    console.log(`[GitHub Issues] Found ${allIssues.length} open bounty issues`);
    
    // Parse issues into bounties
    const bounties: Bounty[] = [];
    const cacheMap = new Map(cache.issues.map(entry => [entry.issueNumber, entry]));
    const updatedCache: IssueCacheEntry[] = [];
    
    for (const issue of allIssues) {
      const bounty = parseBountyFromIssue(issue);
      
      if (bounty) {
        bounties.push(bounty as Bounty);
        
        // Update cache
        const existing = cacheMap.get(issue.number);
        updatedCache.push({
          issueNumber: issue.number,
          bountyId: bounty.id!,
          lastUpdated: issue.updated_at,
        });
      }
    }
    
    // Save updated cache
    saveIssuesCache({
      issues: updatedCache,
      lastSynced: now,
    });
    
    console.log(`[GitHub Issues] Parsed ${bounties.length} bounties from issues`);
    
    return bounties;
  } catch (error: any) {
    console.error('[GitHub Issues] Error fetching issues:', {
      message: error?.message,
      status: error?.status,
      response: error?.response?.data,
    });
    throw error;
  }
}

/**
 * Get only new or modified issues since last sync
 */
export async function fetchUpdatedBountyIssues(): Promise<Bounty[]> {
  const cache = loadIssuesCache();
  
  if (!cache.lastSynced) {
    // First time sync - get all issues
    return fetchBountyIssues(true);
  }
  
  console.log(`[GitHub Issues] Fetching issues updated since ${cache.lastSynced}`);
  
  try {
    const allIssues: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await octokit.issues.listForRepo({
        owner: GITHUB_ORG,
        repo: GITHUB_REPO,
        state: 'open',
        labels: 'bounty',
        per_page: 100,
        page,
        sort: 'updated',
        direction: 'desc',
        since: cache.lastSynced,
      });
      
      // Filter to only issues with 'bounty' or 'docs-jam' label
      const filteredIssues = response.data.filter(issue => 
        issue.labels.some(label => {
          const labelName = typeof label === 'string' ? label : label.name;
          return labelName === 'bounty' || labelName === 'docs-jam';
        })
      );
      
      allIssues.push(...filteredIssues);
      hasMore = response.data.length === 100;
      page++;
      
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`[GitHub Issues] Found ${allIssues.length} updated issues`);
    
    // Parse and return
    const bounties: Bounty[] = [];
    for (const issue of allIssues) {
      const bounty = parseBountyFromIssue(issue);
      if (bounty) {
        bounties.push(bounty as Bounty);
      }
    }
    
    return bounties;
  } catch (error: any) {
    console.error('[GitHub Issues] Error fetching updated issues:', error);
    // Fallback to full fetch
    return fetchBountyIssues(true);
  }
}

