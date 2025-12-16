import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Octokit } from '@octokit/rest';
import { addBounty } from '@/lib/bounties';

const GITHUB_ORG = process.env.GITHUB_ORG || 'DeepLcom';
const GITHUB_REPO = process.env.GITHUB_REPO || 'api-docs';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !(session as any).accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in with GitHub.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { page, title, description, points, priority } = body;

    // Validate input
    if (!page || !title || !points || !priority) {
      return NextResponse.json(
        { error: 'Missing required fields: page, title, points, priority' },
        { status: 400 }
      );
    }

    // Add bounty to config
    const bounty = addBounty({
      page,
      title,
      description,
      points: parseInt(points),
      priority,
    });

    // Create GitHub issue
    const octokit = new Octokit({
      auth: (session as any).accessToken,
    });

    const issueBody = `## Bounty: ${title}

**File:** \`${page}\`
**Points:** ${points}
**Priority:** ${priority}

${description || 'No description provided.'}

---

This bounty was created via the Docs Jam Leaderboard. To claim this bounty, open a PR that modifies \`${page}\` and get it merged!

**Bounty ID:** \`${bounty.id}\`
`;

    const issue = await octokit.issues.create({
      owner: GITHUB_ORG,
      repo: GITHUB_REPO,
      title: `[Bounty] ${title}`,
      body: issueBody,
      labels: ['bounty', `priority-${priority}`, 'docs-jam'],
    });

    return NextResponse.json({
      success: true,
      bounty,
      issue: {
        number: issue.data.number,
        url: issue.data.html_url,
      },
    });
  } catch (error: any) {
    console.error('Error creating bounty:', error);
    
    // If it's a GitHub API error, provide more details
    if (error?.status) {
      return NextResponse.json(
        {
          error: `GitHub API error: ${error.message}`,
          details: error.response?.data,
        },
        { status: error.status || 500 }
      );
    }
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

