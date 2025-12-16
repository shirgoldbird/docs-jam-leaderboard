import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const GITHUB_ORG = process.env.GITHUB_ORG || 'DeepLcom';
const GITHUB_REPO = process.env.GITHUB_REPO || 'api-docs';

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
      const response = await octokit.orgs.listMembers({
        org: GITHUB_ORG,
        per_page: 100,
        page,
      });

      members.push(...response.data);
      hasMore = response.data.length === 100;
      page++;
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
      const response = await octokit.pulls.list({
        owner: GITHUB_ORG,
        repo: GITHUB_REPO,
        state,
        per_page: 100,
        page,
        sort: 'updated',
        direction: 'desc',
      });

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
    const response = await octokit.pulls.listFiles({
      owner: GITHUB_ORG,
      repo: GITHUB_REPO,
      pull_number: prNumber,
      per_page: 100,
    });

    return response.data.map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
    }));
  } catch (error) {
    console.error(`Error fetching files for PR #${prNumber}:`, error);
    return [];
  }
}

/**
 * Get merged pull requests with their file changes
 */
export async function getMergedPRsWithFiles(): Promise<(PullRequest & { files: PRFile[] })[]> {
  const prs = await getPullRequests('closed');
  const mergedPRs = prs.filter(pr => pr.merged_at !== null);

  // Fetch files for each merged PR
  const prsWithFiles = await Promise.all(
    mergedPRs.map(async (pr) => {
      const files = await getPRFiles(pr.number);
      return { ...pr, files };
    })
  );

  return prsWithFiles;
}

