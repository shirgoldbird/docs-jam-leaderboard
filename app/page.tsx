'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LeaderboardTable, { LeaderboardEntry } from '@/components/LeaderboardTable';

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [totalContributors, setTotalContributors] = useState(0);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
      setLastSynced(data.lastSynced || null);
      setTotalContributors(data.totalContributors || 0);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // Refresh every 5 minutes
    const interval = setInterval(fetchLeaderboard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/github/sync', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        await fetchLeaderboard();
        alert(`Sync complete! ${data.newClaims} new claims added.`);
      } else {
        const errorMsg = data.isRateLimit 
          ? 'Rate limit exceeded. Please wait a few minutes and try again. The sync will continue from where it left off when you retry.'
          : `Sync failed: ${data.error || 'Unknown error'}`;
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Error syncing: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                Docs Jam Leaderboard
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Track contributions to DeepL API documentation
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/bounties"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Bounties
              </Link>
              <button
                onClick={handleSync}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>
          {lastSynced && (
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Last synced: {new Date(lastSynced).toLocaleString()}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Leaderboard
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {totalContributors} contributor{totalContributors !== 1 ? 's' : ''}
            </span>
          </div>
          {loading && leaderboard.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Loading leaderboard...
            </div>
          ) : (
            <LeaderboardTable entries={leaderboard} />
          )}
        </div>
      </div>
    </div>
  );
}

