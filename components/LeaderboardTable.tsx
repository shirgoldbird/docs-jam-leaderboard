'use client';

import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export interface LeaderboardEntry {
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
  }>;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

export default function LeaderboardTable({ entries }: LeaderboardTableProps) {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Rank
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Contributor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Points
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Bounties
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Latest Claim
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {entries.map((entry, index) => {
            const rank = index + 1;
            const latestClaim = entry.claims
              .sort((a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime())[0];

            return (
              <tr key={entry.username} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  <span className="text-2xl">{getRankBadge(rank)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/contributor/${entry.username}`}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    {entry.username}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {entry.totalPoints}
                    </span>
                    <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">pts</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {entry.bountiesClaimed}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {latestClaim ? (
                    <a
                      href={latestClaim.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {formatDistanceToNow(new Date(latestClaim.mergedAt), { addSuffix: true })}
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {entries.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No contributors yet. Be the first to claim a bounty!
        </div>
      )}
    </div>
  );
}

