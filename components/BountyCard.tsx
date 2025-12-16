'use client';

import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export interface Bounty {
  id: string;
  page: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  points: number;
  description?: string;
  claimed?: boolean;
  claim?: {
    contributor: string;
    mergedAt: string;
    prNumber: number;
    prUrl: string;
    prTitle: string;
  };
}

interface BountyCardProps {
  bounty: Bounty;
}

const priorityColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function BountyCard({ bounty }: BountyCardProps) {
  return (
    <div
      className={`border rounded-lg p-6 ${
        bounty.claimed
          ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {bounty.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span className="font-mono">{bounty.page}</span>
          </p>
          {bounty.description && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              {bounty.description}
            </p>
          )}
        </div>
        <div className="ml-4 flex flex-col items-end gap-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${priorityColors[bounty.priority]}`}
          >
            {bounty.priority}
          </span>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {bounty.points}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">points</div>
          </div>
        </div>
      </div>

      {bounty.claimed && bounty.claim ? (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Claimed by{' '}
                <Link
                  href={`/contributor/${bounty.claim.contributor}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {bounty.claim.contributor}
                </Link>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {formatDistanceToNow(new Date(bounty.claim.mergedAt), { addSuffix: true })}
              </p>
            </div>
            <a
              href={bounty.claim.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              PR #{bounty.claim.prNumber} →
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Available
          </span>
        </div>
      )}
    </div>
  );
}

