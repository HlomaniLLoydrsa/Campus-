'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Flag, Send, Trash2, X } from 'lucide-react';
import { Post } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatTimeAgo, getPostTypeStyle } from '@/lib/utils';
import Avatar from '@/components/Avatar';

interface Props {
  post: Post;
}

export default function PostCard({ post }: Props) {
  const { currentUser, likePost, savePost, addComment, getUserById, sharePost, reportContent, deletePost, connections, getOrCreateDirectConversation, sendMessage } = useApp();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [reported, setReported] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [sentTo, setSentTo] = useState<string[]>([]);

  const myFriends = (connections[currentUser.id] || []).map(id => getUserById(id)).filter(Boolean) as NonNullable<ReturnType<typeof getUserById>>[];

  const author = post.isAnonymous ? null : getUserById(post.authorId || '');
  const isLiked = post.likedBy.includes(currentUser.id);
  const isSaved = post.savedBy.includes(currentUser.id);
  const isOwnPost = !post.isAnonymous && post.authorId === currentUser.id;
  const postStyle = getPostTypeStyle(post.type);

  const handleComment = () => {
    if (commentText.trim()) {
      addComment(post.id, commentText.trim());
      setCommentText('');
    }
  };

  const handleShare = () => {
    setShowShare(true);
  };

  const shareToFriend = (friendId: string) => {
    const convId = getOrCreateDirectConversation(friendId);
    if (convId) {
      const authorName = post.isAnonymous ? 'Anonymous' : (author?.name || 'Someone');
      const preview = post.content.length > 80 ? post.content.slice(0, 80) + '…' : post.content;
      sendMessage(convId, `📢 Shared a post by ${authorName}: "${preview}"`);
      sharePost(post.id);
      setSentTo(prev => [...prev, friendId]);
    }
  };

  const handleReport = () => {
    reportContent('post', post.id, '');
    setReported(true);
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (confirm('Delete this post? This cannot be undone.')) {
      deletePost(post.id);
    }
    setShowMenu(false);
  };

  return (
    <div className="card p-4 animate-fade-in">
      {/* Post type badge */}
      {post.type !== 'normal' && (
        <div className="mb-3">
          <span className={`badge-pill ${postStyle.bg} ${postStyle.text}`}>
            {postStyle.label}
          </span>
        </div>
      )}

      {/* Author */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {post.isAnonymous ? (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-campus-primary to-campus-secondary flex items-center justify-center">
              <span className="text-white text-lg">🤫</span>
            </div>
          ) : (
            <Link href={`/profile/${author?.id}`}>
              <Avatar src={author?.avatar} name={author?.name} size={40} />
            </Link>
          )}
          <div>
            {post.isAnonymous ? (
              <p className="font-semibold text-sm text-gray-800">Anonymous</p>
            ) : (
              <Link href={`/profile/${author?.id}`} className="font-semibold text-sm text-gray-800 hover:text-campus-primary transition-colors">
                {author?.name}
              </Link>
            )}
            <p className="text-xs text-gray-400">{formatTimeAgo(post.createdAt)}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <MoreHorizontal size={18} className="text-gray-400" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-20 w-44">
                {isOwnPost && (
                  <button onClick={handleDelete} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    <Trash2 size={14} /> Delete post
                  </button>
                )}
                <button onClick={handleReport} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  <Flag size={14} /> {reported ? 'Reported ✓' : 'Report'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-gray-800 text-sm leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>

      {/* Images */}
      {post.images && post.images.length > 0 && post.images[0] && (
        <div className="mb-3 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center max-h-[70vh]">
          <img
            src={post.images[0]}
            alt="Post image"
            className="w-full h-auto max-h-[70vh] object-contain"
            onError={(e) => { const el = e.currentTarget.parentElement; if (el) el.style.display = 'none'; }}
          />
        </div>
      )}

      {/* Event card */}
      {post.eventData && (
        <Link href={`/events/${post.eventData.id}`} className="block mb-3 p-4 bg-gradient-to-r from-campus-primary/5 to-campus-accent/5 rounded-xl border border-campus-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">{post.eventData.name}</h4>
              <p className="text-xs text-gray-500 mt-1">
                📅 {post.eventData.date} • 📍 {post.eventData.location}
              </p>
              <p className="text-xs text-campus-primary mt-1 font-medium">
                {post.eventData.currentParticipants}/{post.eventData.maxParticipants} going
              </p>
            </div>
            <span className="btn-primary text-xs">View Event</span>
          </div>
        </Link>
      )}

      {/* Interactions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => likePost(post.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              isLiked ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
            <span className="text-sm font-medium">{post.likes}</span>
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-all"
          >
            <MessageCircle size={18} />
            <span className="text-sm font-medium">{post.comments.length}</span>
          </button>
          <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-all">
            <Share2 size={18} />
            <span className="text-sm font-medium">{post.shares}</span>
          </button>
        </div>
        <button
          onClick={() => savePost(post.id)}
          className={`p-1.5 rounded-lg transition-all ${
            isSaved ? 'text-campus-primary bg-campus-primary/10' : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-gray-50 space-y-3 animate-slide-down">
          {post.comments.map(comment => {
            const commentAuthor = getUserById(comment.authorId);
            return (
              <div key={comment.id} className="flex gap-2">
                <Avatar src={commentAuthor?.avatar} name={commentAuthor?.name} size={28} />
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-gray-700">{commentAuthor?.name || 'User'}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{comment.content}</p>
                </div>
              </div>
            );
          })}

          {/* Add comment */}
          <div className="flex items-center gap-2">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-campus-primary/10 flex items-center justify-center flex-shrink-0"><span className="text-[10px] font-bold text-campus-primary">{(currentUser.name || '?')[0]}</span></div>
            )}
            <div className="flex-1 relative">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                placeholder="Write a comment..."
                className="w-full pl-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-campus-primary/20"
              />
              <button
                onClick={handleComment}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-campus-primary disabled:opacity-30"
                disabled={!commentText.trim()}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share to friends modal */}
      {showShare && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowShare(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Share with friends</h3>
              <button onClick={() => setShowShare(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            {myFriends.length > 0 ? (
              <div className="space-y-1">
                {myFriends.map(f => {
                  const sent = sentTo.includes(f.id);
                  return (
                    <div key={f.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50">
                      <Avatar src={f.avatar} name={f.name} size={40} />
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{f.name}</p><p className="text-xs text-gray-400 truncate">@{f.username}</p></div>
                      <button onClick={() => !sent && shareToFriend(f.id)} disabled={sent} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${sent ? 'bg-green-100 text-green-700' : 'bg-campus-primary text-white hover:shadow'}`}>
                        {sent ? 'Sent ✓' : 'Send'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <Share2 size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No friends to share with yet</p>
                <a href="/connections" className="text-xs text-campus-primary font-medium">Connect with people first</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
