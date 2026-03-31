'use client';

import { useEffect, useState } from 'react';
import { Post, User } from '@/lib/types';
import { PostCard } from '@/components/PostCard';
import { Navigation } from '@/components/Navigation';

interface ProfilePageProps {
  params: {
    username: string;
  };
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetchUserAndPosts();
  }, [params.username, offset]);

  const fetchUserAndPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, fetch user by username
      const userResponse = await fetch(`/api/users?username=${encodeURIComponent(params.username)}`);
      if (!userResponse.ok) {
        throw new Error('User not found');
      }
      const userData = await userResponse.json();
      const userId = userData.id;

      // Then fetch user profile with posts
      const profileResponse = await fetch(
        `/api/users/${userId}/profile?limit=${limit}&offset=${offset}`
      );
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch profile');
      }
      const profileData = await profileResponse.json();
      setUser(profileData.user);
      setPosts(profileData.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="container py-8">
          <div className="text-center">
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navigation />
        <div className="container py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          {user && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h1 className="text-3xl font-bold mb-2">@{user.username}</h1>
              {user.bio && <p className="text-gray-600 mb-4">{user.bio}</p>}
              <p className="text-sm text-gray-500">
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-4">Posts</h2>

          {posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-600">No posts yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

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
