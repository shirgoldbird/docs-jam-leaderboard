'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ContributorProfile, { ContributorData } from '@/components/ContributorProfile';

export default function ContributorPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [contributor, setContributor] = useState<ContributorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContributor = async () => {
      try {
        const response = await fetch(`/api/contributor/${username}`);
        if (response.status === 404) {
          setError('Contributor not found');
        } else if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Failed to load contributor');
        } else {
          const data = await response.json();
          setContributor(data.contributor);
        }
      } catch (err) {
        console.error('Error fetching contributor:', err);
        setError('Failed to load contributor');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchContributor();
    }
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 dark:text-gray-400">Loading contributor...</div>
        </div>
      </div>
    );
  }

  if (error || !contributor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {error || 'Contributor not found'}
            </h1>
            <Link
              href="/"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to Leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Leaderboard
          </Link>
        </div>
        <ContributorProfile contributor={contributor} />
      </div>
    </div>
  );
}

