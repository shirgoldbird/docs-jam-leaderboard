import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const GITHUB_ORG = process.env.GITHUB_ORG || 'DeepLcom';
const GITHUB_REPO = process.env.GITHUB_REPO || 'api-docs';

const DATA_DIR = join(process.cwd(), 'data');
const CACHE_FILE = join(DATA_DIR, 'repo-files-cache.json');

export interface RepoFile {
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

export interface RepoFilesCache {
  files: RepoFile[];
  lastUpdated: string;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load cached repo files
 */
function loadCache(): RepoFilesCache | null {
  ensureDataDir();
  
  if (!existsSync(CACHE_FILE)) {
    return null;
  }

  try {
    const fileContents = readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error('Error loading repo files cache:', error);
    return null;
  }
}

/**
 * Save repo files to cache
 */
function saveCache(files: RepoFile[]): void {
  ensureDataDir();
  
  const cache: RepoFilesCache = {
    files,
    lastUpdated: new Date().toISOString(),
  };
  
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving repo files cache:', error);
  }
}

/**
 * Fetch all files from the repository recursively
 */
async function fetchRepoFilesRecursive(
  path: string,
  files: RepoFile[] = []
): Promise<void> {
  try {
    console.log(`[API Call] GET /repos/${GITHUB_ORG}/${GITHUB_REPO}/contents/${path}`);
    const response = await octokit.repos.getContent({
      owner: GITHUB_ORG,
      repo: GITHUB_REPO,
      path: path,
    });
    console.log(`[API Response] ${path}: ${Array.isArray(response.data) ? response.data.length + ' items' : 'single item'}`);

    if (Array.isArray(response.data)) {
      for (const item of response.data) {
        if (item.type === 'file' && (item.path.endsWith('.md') || item.path.endsWith('.mdx'))) {
          files.push({
            path: item.path,
            type: 'file',
            size: item.size,
          });
        } else if (item.type === 'dir') {
          // Add directory to the list
          files.push({
            path: item.path,
            type: 'dir',
          });
          // Recursively fetch files in subdirectories
          await fetchRepoFilesRecursive(item.path, files);
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } else {
      // Single file (shouldn't happen for directories, but handle it)
      const item = response.data as any;
      if (item.type === 'file' && (item.path.endsWith('.md') || item.path.endsWith('.mdx'))) {
        files.push({
          path: item.path,
          type: 'file',
          size: item.size,
        });
      }
    }
  } catch (error: any) {
    // If directory doesn't exist, that's okay - just log and continue
    if (error?.status === 404) {
      console.log(`[API Error] Directory ${path} not found (404), skipping...`);
    } else {
      console.error(`[API Error] Error fetching files from ${path}:`, {
        status: error?.status,
        message: error?.message,
        url: `https://api.github.com/repos/${GITHUB_ORG}/${GITHUB_REPO}/contents/${path}`,
        error: error?.response?.data || error
      });
      throw error;
    }
  }
}

/**
 * Get repository files (with caching)
 */
export async function getRepoFiles(forceRefresh: boolean = false): Promise<RepoFile[]> {
  const cache = loadCache();
  
  // Return cached files if they're still fresh and not forcing refresh
  if (!forceRefresh && cache) {
    const cacheAge = new Date().getTime() - new Date(cache.lastUpdated).getTime();
    if (cacheAge < CACHE_DURATION) {
      console.log(`[Repo Files] Using cached data (${cache.files.length} files, age: ${Math.round(cacheAge / 1000)}s)`);
      return cache.files;
    } else {
      console.log(`[Repo Files] Cache expired (age: ${Math.round(cacheAge / 1000)}s), fetching fresh data`);
    }
  } else if (cache) {
    console.log(`[Repo Files] Force refresh requested, ignoring cache`);
  } else {
    console.log(`[Repo Files] No cache found, fetching fresh data`);
  }

  // Fetch fresh files - start from docs and api-reference directories
  console.log(`[Repo Files] Starting fetch for ${GITHUB_ORG}/${GITHUB_REPO}`);
  console.log(`[Repo Files] Using token: ${process.env.GITHUB_TOKEN ? 'Yes (present)' : 'No (missing)'}`);
  const files: RepoFile[] = [];
  
  try {
    // Fetch docs directory
    console.log(`[Repo Files] Fetching docs/ directory...`);
    await fetchRepoFilesRecursive('docs', files);
    console.log(`[Repo Files] After docs/: ${files.length} files found`);
    
    // Fetch api-reference directory
    console.log(`[Repo Files] Fetching api-reference/ directory...`);
    await fetchRepoFilesRecursive('api-reference', files);
    console.log(`[Repo Files] After api-reference/: ${files.length} files found`);
  } catch (error: any) {
    console.error('[Repo Files] Error fetching repository files:', {
      message: error?.message,
      status: error?.status,
      response: error?.response?.data,
      stack: error?.stack
    });
    // Don't cache errors - throw so we can see what's wrong
    throw error;
  }
  
  console.log(`[Repo Files] Total files fetched: ${files.length}`);
  
  // Only save to cache if we got files (don't cache empty results from errors)
  if (files.length > 0) {
    saveCache(files);
    console.log(`[Repo Files] Saved ${files.length} files to cache`);
  } else {
    console.warn(`[Repo Files] No files found - not caching empty result`);
  }
  
  return files;
}

/**
 * Get files organized by directory structure
 * Returns a flat structure where each directory contains its direct children
 */
export async function getFilesByDirectory(): Promise<Record<string, RepoFile[]>> {
  console.log('[getFilesByDirectory] Starting...');
  const files = await getRepoFiles();
  console.log(`[getFilesByDirectory] Got ${files.length} files`);
  const structure: Record<string, RepoFile[]> = {};
  
  // First, add all directories to the structure
  const allDirs = new Set<string>();
  for (const file of files) {
    if (file.type === 'dir') {
      allDirs.add(file.path);
    }
    // Also add parent directories
    const parts = file.path.split('/');
    for (let i = 1; i < parts.length; i++) {
      allDirs.add(parts.slice(0, i).join('/'));
    }
  }
  
  // Organize files by their parent directory
  for (const file of files) {
    const dir = file.path.includes('/') 
      ? file.path.substring(0, file.path.lastIndexOf('/'))
      : '';
    
    if (!structure[dir]) {
      structure[dir] = [];
    }
    
    structure[dir].push(file);
  }
  
  // Add directories to their parent directories
  for (const dirPath of allDirs) {
    const parentDir = dirPath.includes('/')
      ? dirPath.substring(0, dirPath.lastIndexOf('/'))
      : '';
    
    // Check if this directory is already in its parent
    if (!structure[parentDir]) {
      structure[parentDir] = [];
    }
    
    const dirExists = structure[parentDir].some(f => f.path === dirPath);
    if (!dirExists) {
      structure[parentDir].push({
        path: dirPath,
        type: 'dir',
      });
    }
  }
  
  // Sort files within each directory (directories first, then files)
  for (const dir in structure) {
    structure[dir].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1;
      }
      return a.path.localeCompare(b.path);
    });
  }
  
  console.log(`[getFilesByDirectory] Organized into ${Object.keys(structure).length} directories`);
  console.log(`[getFilesByDirectory] Directory keys:`, Object.keys(structure).slice(0, 10));
  
  return structure;
}

