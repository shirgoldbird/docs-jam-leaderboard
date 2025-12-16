import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const GITHUB_ORG = process.env.GITHUB_ORG || 'DeepLcom';
const GITHUB_REPO = process.env.GITHUB_REPO || 'api-docs';

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is a rate limit error
 */
function isRateLimitError(error: any): boolean {
  return error?.status === 403 || 
         error?.status === 429 ||
         (error?.message && error.message.includes('rate limit'));
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (isRateLimitError(error) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        const retryAfter = error?.response?.headers?.['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
        
        console.log(`Rate limit hit, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await sleep(waitTime);
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

export interface GitHubMember {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

export interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
}

export interface PullRequest {
  number: number;
  title: string;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  merged_at: string | null;
  state: string;
  html_url: string;
  created_at: string;
  files?: PRFile[];
}

/**
 * Fetch all members of the GitHub organization
 */
export async function getOrgMembers(): Promise<GitHubMember[]> {
  try {
    const members: GitHubMember[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await retryWithBackoff(() =>
        octokit.orgs.listMembers({
          org: GITHUB_ORG,
          per_page: 100,
          page,
        })
      );

      members.push(...response.data);
      hasMore = response.data.length === 100;
      page++;
      
      // Add delay between pages to avoid secondary rate limits
      if (hasMore) {
        await sleep(500);
      }
    }

    return members;
  } catch (error) {
    console.error('Error fetching org members:', error);
    return [];
  }
}

/**
 * Fetch all pull requests for the repository
 */
export async function getPullRequests(state: 'open' | 'closed' | 'all' = 'all'): Promise<PullRequest[]> {
  try {
    const prs: PullRequest[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await retryWithBackoff(() =>
        octokit.pulls.list({
          owner: GITHUB_ORG,
          repo: GITHUB_REPO,
          state,
          per_page: 100,
          page,
          sort: 'updated',
          direction: 'desc',
        })
      );

      const prData = response.data.map(pr => ({
        number: pr.number,
        title: pr.title,
        user: {
          login: pr.user?.login || 'unknown',
          avatar_url: pr.user?.avatar_url || '',
          html_url: pr.user?.html_url || '',
        },
        merged_at: pr.merged_at,
        state: pr.state,
        html_url: pr.html_url,
        created_at: pr.created_at,
      }));

      prs.push(...prData);
      hasMore = response.data.length === 100;
      page++;
      
      // Add delay between pages to avoid secondary rate limits
      if (hasMore) {
        await sleep(500);
      }
    }

    return prs;
  } catch (error) {
    console.error('Error fetching pull requests:', error);
    return [];
  }
}

/**
 * Fetch files changed in a pull request
 */
export async function getPRFiles(prNumber: number): Promise<PRFile[]> {
  try {
    const response = await retryWithBackoff(() =>
      octokit.pulls.listFiles({
        owner: GITHUB_ORG,
        repo: GITHUB_REPO,
        pull_number: prNumber,
        per_page: 100,
      })
    );

    return response.data.map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
    }));
  } catch (error) {
    console.error(`Error fetching files for PR #${prNumber}:`, error);
    // Return empty array instead of throwing to allow processing to continue
    return [];
  }
}

/**
 * Get a single PR's details (to check if it's merged)
 */
export async function getPRDetails(prNumber: number): Promise<PullRequest | null> {
  try {
    const response = await retryWithBackoff(() =>
      octokit.pulls.get({
        owner: GITHUB_ORG,
        repo: GITHUB_REPO,
        pull_number: prNumber,
      })
    );

    return {
      number: response.data.number,
      title: response.data.title,
      user: {
        login: response.data.user?.login || 'unknown',
        avatar_url: response.data.user?.avatar_url || '',
        html_url: response.data.user?.html_url || '',
      },
      merged_at: response.data.merged_at,
      state: response.data.state,
      html_url: response.data.html_url,
      created_at: response.data.created_at,
    };
  } catch (error) {
    console.error(`Error fetching PR #${prNumber} details:`, error);
    return null;
  }
}

/**
 * Get merged pull requests with their file changes
 * Only checks tracked PRs that have been closed
 */
export async function getMergedPRsWithFiles(trackedPRNumbers: number[]): Promise<(PullRequest & { files: PRFile[] })[]> {
  if (trackedPRNumbers.length === 0) {
    return [];
  }

  console.log(`Checking ${trackedPRNumbers.length} tracked PRs for merge status...`);

  const mergedPRs: PullRequest[] = [];
  
  // Check each tracked PR to see if it's been merged
  for (let i = 0; i < trackedPRNumbers.length; i++) {
    const prNumber = trackedPRNumbers[i];
    
    // Add delay between requests (except for the first one)
    if (i > 0) {
      await sleep(1000); // 1 second delay between checks
    }
    
    console.log(`Checking PR #${prNumber} (${i + 1}/${trackedPRNumbers.length})...`);
    const pr = await getPRDetails(prNumber);
    
    if (pr && pr.merged_at !== null) {
      mergedPRs.push(pr);
    }
  }

  console.log(`Found ${mergedPRs.length} newly merged PRs, fetching files...`);

  // Fetch files for merged PRs
  const prsWithFiles: (PullRequest & { files: PRFile[] })[] = [];
  
  for (let i = 0; i < mergedPRs.length; i++) {
    const pr = mergedPRs[i];
    
    // Add delay between requests
    if (i > 0) {
      await sleep(1000);
    }
    
    console.log(`Fetching files for PR #${pr.number} (${i + 1}/${mergedPRs.length})...`);
    const files = await getPRFiles(pr.number);
    prsWithFiles.push({ ...pr, files });
  }

  console.log(`Completed processing ${prsWithFiles.length} merged PRs`);
  return prsWithFiles;
}

