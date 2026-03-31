/**
 * Post Card Component
 * Placeholder for displaying a single post.
 * To be implemented in Phase 2.
 */

import { Post } from '@/lib/types';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow mb-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold">@{post.username}</h3>
        <time className="text-sm text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</time>
      </div>
      <p className="text-gray-800 mb-3">{post.content}</p>
      <div className="flex gap-4 text-sm text-gray-600">
        <span>❤️ {post.likeCount} likes</span>
        <span>💬 {post.replyCount} replies</span>
      </div>
    </div>
  );
}
