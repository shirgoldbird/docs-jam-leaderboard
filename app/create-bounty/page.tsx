'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RepoFile {
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

export default function CreateBountyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<Record<string, RepoFile[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    points: '50',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });
  const [submitting, setSubmitting] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['docs', 'api-reference']));

  useEffect(() => {
    if (status === 'unauthenticated') {
      // Don't redirect, just show sign in option
    }
  }, [status]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/repo-files?format=directory');
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error fetching files:', data.error, data.details);
        alert(`Error fetching files: ${data.error || 'Unknown error'}`);
        return;
      }
      
      setFiles(data.files || {});
    } catch (error) {
      console.error('Error fetching files:', error);
      alert('Error fetching files. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDir = (dir: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(dir)) {
      newExpanded.delete(dir);
    } else {
      newExpanded.add(dir);
    }
    setExpandedDirs(newExpanded);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      alert('Please sign in with GitHub to create a bounty');
      return;
    }

    if (!selectedPath) {
      alert('Please select a file');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/bounties/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page: selectedPath,
          ...formData,
          points: parseInt(formData.points),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Bounty created! Issue #${data.issue.number} created on GitHub.`);
        router.push('/bounties');
      } else {
        alert('Error creating bounty: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating bounty:', error);
      alert('Error creating bounty: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderFileTree = (dir: string, level: number = 0): JSX.Element | null => {
    const dirFiles = files[dir] || [];
    const isExpanded = expandedDirs.has(dir);
    const indent = level * 20;

    if (dirFiles.length === 0) return null;

    return (
      <div key={dir} className="mb-2">
        <div
          className="flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 py-1 px-2 rounded"
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => toggleDir(dir)}
        >
          <span className="mr-2">{isExpanded ? '📂' : '📁'}</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{dir || '/'}</span>
        </div>
        {isExpanded && (
          <div className="ml-4">
            {dirFiles.map((file) => {
              if (file.type === 'dir') {
                return renderFileTree(file.path, level + 1);
              } else {
                return (
                  <div
                    key={file.path}
                    className={`flex items-center py-1 px-2 rounded cursor-pointer ${
                      selectedPath === file.path
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    style={{ paddingLeft: `${(level + 1) * 20}px` }}
                    onClick={() => setSelectedPath(file.path)}
                  >
                    <span className="mr-2">📄</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {file.path.split('/').pop()}
                    </span>
                    {selectedPath === file.path && (
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">✓</span>
                    )}
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    );
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/bounties"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Bounties
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Create New Bounty
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Select a documentation file and create a bounty to incentivize improvements.
          </p>

          {!session && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                You need to sign in with GitHub to create bounties.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => signIn('github')}
                  className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                >
                  Sign in with GitHub
                </button>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                  Note: If sign-in fails, make sure GitHub OAuth is configured. See README.md for setup instructions.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Browser */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Select File
            </h2>
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Loading files...
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded p-4">
                {Object.keys(files).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No files found. Make sure the repository is accessible.
                  </div>
                ) : (
                  <>
                    {renderFileTree('docs')}
                    {renderFileTree('api-reference')}
                  </>
                )}
              </div>
            )}
            {selectedPath && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-400">Selected:</p>
                <p className="font-mono text-sm text-blue-600 dark:text-blue-400">{selectedPath}</p>
              </div>
            )}
          </div>

          {/* Bounty Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Bounty Details
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., Improve Authentication Documentation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Describe what needs to be improved..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Points *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority *
                  </label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={!session || !selectedPath || submitting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Bounty & Issue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

