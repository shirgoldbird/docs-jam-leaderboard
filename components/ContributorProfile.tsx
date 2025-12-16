'use client';

import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export interface ContributorData {
  username: string;
  totalPoints: number;
  bountiesClaimed: number;
  claims: Array<{
    bountyId: string;
    prNumber: number;
    contributor: string;
    mergedAt: string;
    points: number;
    prTitle: string;
    prUrl: string;
    filesChanged: string[];
  }>;
}

interface ContributorProfileProps {
  contributor: ContributorData;
}

export default function ContributorProfile({ contributor }: ContributorProfileProps) {
  const sortedClaims = [...contributor.claims].sort(
    (a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {contributor.username}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {contributor.totalPoints}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Points</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {contributor.bountiesClaimed}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Bounties Claimed</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {Math.round(contributor.totalPoints / contributor.bountiesClaimed) || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg Points</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Claims History
        </h2>
        <div className="space-y-4">
          {sortedClaims.map((claim) => (
            <div
              key={`${claim.bountyId}-${claim.prNumber}`}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <a
                    href={claim.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {claim.prTitle}
                  </a>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    PR #{claim.prNumber} • {formatDistanceToNow(new Date(claim.mergedAt), { addSuffix: true })}
                  </p>
                  {claim.filesChanged && claim.filesChanged.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Files changed:</p>
                      <div className="flex flex-wrap gap-1">
                        {claim.filesChanged.slice(0, 3).map((file, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded font-mono"
                          >
                            {file}
                          </span>
                        ))}
                        {claim.filesChanged.length > 3 && (
                          <span className="inline-block px-2 py-1 text-xs text-gray-500 dark:text-gray-500">
                            +{claim.filesChanged.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="ml-4 text-right">
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    +{claim.points}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">points</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

