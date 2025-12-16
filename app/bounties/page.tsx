'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BountyCard, { Bounty } from '@/components/BountyCard';

export default function BountiesPage() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    claimed: 0,
    available: 0,
  });

  const fetchBounties = async () => {
    try {
      const response = await fetch('/api/bounties');
      const data = await response.json();
      setBounties(data.bounties || []);
      setStats({
        total: data.total || 0,
        claimed: data.claimed || 0,
        available: data.available || 0,
      });
    } catch (error) {
      console.error('Error fetching bounties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBounties();
    // Refresh every 5 minutes
    const interval = setInterval(fetchBounties, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const availableBounties = bounties.filter(b => !b.claimed);
  const claimedBounties = bounties.filter(b => b.claimed);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                Bounties
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Available documentation improvement tasks
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Leaderboard
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.total}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Bounties</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.available}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Available</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.claimed}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Claimed</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading bounties...
          </div>
        ) : (
          <>
            {availableBounties.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Available Bounties
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableBounties.map((bounty) => (
                    <BountyCard key={bounty.id} bounty={bounty} />
                  ))}
                </div>
              </div>
            )}

            {claimedBounties.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Claimed Bounties
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {claimedBounties.map((bounty) => (
                    <BountyCard key={bounty.id} bounty={bounty} />
                  ))}
                </div>
              </div>
            )}

            {bounties.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No bounties configured yet.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

