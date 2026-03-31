'use client';

import { useEffect, useState } from 'react';
import { Post } from '@/lib/types';
import { PostCard } from '@/components/PostCard';
import { Navigation } from '@/components/Navigation';

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetchPosts();
  }, [offset]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/posts?limit=${limit}&offset=${offset}`);
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data = await response.json();
      setPosts(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Global Feed</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading posts...</p>
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-600">No posts yet. Be the first to post!</p>
            </div>
          )}

          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {posts.length > 0 && (
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={posts.length < limit}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
