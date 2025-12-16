import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PullRequest } from './github';

const DATA_DIR = join(process.cwd(), 'data');
const TRACKED_PRS_FILE = join(DATA_DIR, 'tracked-prs.json');

export interface TrackedPR {
  number: number;
  title: string;
  user: string;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  lastChecked: string;
}

export interface TrackedPRsData {
  prs: TrackedPR[];
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
 * Load tracked PRs from the data file
 */
export function loadTrackedPRs(): TrackedPRsData {
  ensureDataDir();
  
  if (!existsSync(TRACKED_PRS_FILE)) {
    return { prs: [] };
  }

  try {
    const fileContents = readFileSync(TRACKED_PRS_FILE, 'utf-8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error('Error loading tracked PRs:', error);
    return { prs: [] };
  }
}

/**
 * Save tracked PRs to the data file
 */
export function saveTrackedPRs(data: TrackedPRsData): void {
  ensureDataDir();
  
  try {
    writeFileSync(TRACKED_PRS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving tracked PRs:', error);
    throw error;
  }
}

/**
 * Update tracked PRs with current open PRs
 */
export function updateTrackedPRs(openPRs: PullRequest[]): void {
  const existing = loadTrackedPRs();
  const existingPRNumbers = new Set(existing.prs.map(pr => pr.number));
  const now = new Date().toISOString();
  
  // Add new open PRs
  for (const pr of openPRs) {
    if (!existingPRNumbers.has(pr.number)) {
      existing.prs.push({
        number: pr.number,
        title: pr.title,
        user: pr.user.login,
        state: pr.state,
        html_url: pr.html_url,
        created_at: pr.created_at,
        updated_at: pr.created_at,
        lastChecked: now,
      });
    } else {
      // Update existing PR
      const existingPR = existing.prs.find(p => p.number === pr.number);
      if (existingPR) {
        existingPR.updated_at = pr.created_at;
        existingPR.lastChecked = now;
        existingPR.state = pr.state;
      }
    }
  }
  
  // Remove PRs that are no longer open (they've been closed/merged)
  // But keep them for a while in case we need to check them
  existing.prs = existing.prs.filter(pr => {
    const isStillOpen = openPRs.some(openPR => openPR.number === pr.number);
    return isStillOpen || pr.state === 'closed';
  });
  
  existing.lastSynced = now;
  saveTrackedPRs(existing);
}

/**
 * Get tracked PRs that might have been merged (closed state)
 */
export function getTrackedPRsToCheck(): TrackedPR[] {
  const data = loadTrackedPRs();
  // Return PRs that are closed but we haven't verified as merged yet
  return data.prs.filter(pr => pr.state === 'closed');
}

/**
 * Mark a PR as processed (remove from tracking)
 */
export function removeTrackedPR(prNumber: number): void {
  const data = loadTrackedPRs();
  data.prs = data.prs.filter(pr => pr.number !== prNumber);
  saveTrackedPRs(data);
}

