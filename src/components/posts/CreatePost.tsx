'use client';

import React, { useState, useRef } from 'react';
import { Image as ImageIcon, X, Lock, Eye } from 'lucide-react';
import { PostType } from '@/types';
import { useApp } from '@/context/AppContext';
import { generateId } from '@/lib/utils';

const postTypes: { type: PostType; label: string; icon: string; color: string }[] = [
  { type: 'normal', label: 'Post', icon: '✍️', color: 'bg-gray-100 text-gray-700' },
  { type: 'confession', label: 'Confession', icon: '🤫', color: 'bg-purple-100 text-purple-700' },
  { type: 'question', label: 'Question', icon: '❓', color: 'bg-blue-100 text-blue-700' },
  { type: 'shoutout', label: 'Shoutout', icon: '📢', color: 'bg-orange-100 text-orange-700' },
  { type: 'event', label: 'Event', icon: '🎉', color: 'bg-green-100 text-green-700' },
  { type: 'i-saw-you', label: 'I Saw You', icon: '👀', color: 'bg-pink-100 text-pink-700' },
];

export default function CreatePost({ defaultType = 'normal', onClose }: { defaultType?: PostType; onClose?: () => void }) {
  const { currentUser, addPost } = useApp();
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState<PostType>(defaultType);
  const [isAnonymous, setIsAnonymous] = useState(defaultType === 'confession');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageFile) return;
    setUploading(true);

    let imageUrl: string | undefined;
    if (imageFile) {
      const formData = new FormData();
      formData.append('file', imageFile);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          imageUrl = data.url;
        }
      } catch { /* continue without image */ }
    }

    const newPost = {
      id: generateId(),
      type: selectedType,
      authorId: isAnonymous ? null : currentUser.id,
      isAnonymous,
      content: content.trim(),
      images: imageUrl ? [imageUrl] : [],
      likes: 0,
      likedBy: [] as string[],
      comments: [],
      shares: 0,
      savedBy: [] as string[],
      reports: 0,
      createdAt: new Date().toISOString(),
    };

    addPost(newPost);
    setContent('');
    setSelectedType('normal');
    setIsAnonymous(false);
    removeImage();
    setUploading(false);
    onClose?.();
  };

  const getPlaceholder = () => {
    switch (selectedType) {
      case 'confession': return "What's on your mind? This will be anonymous...";
      case 'question': return 'Ask the campus community anything...';
      case 'shoutout': return 'Give someone a shoutout...';
      case 'event': return 'Tell people about your event...';
      case 'i-saw-you': return 'Describe who you saw and where...';
      default: return "What's happening on campus?";
    }
  };

  return (
    <div className="card p-4">
      {/* Type selector */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
        {postTypes.map(pt => (
          <button key={pt.type} onClick={() => { setSelectedType(pt.type); if (pt.type === 'confession') setIsAnonymous(true); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedType === pt.type ? `${pt.color} ring-2 ring-offset-1 ring-current` : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
            <span>{pt.icon}</span><span>{pt.label}</span>
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="flex gap-3">
        {isAnonymous ? (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-campus-primary to-campus-secondary flex items-center justify-center flex-shrink-0"><span className="text-white text-sm">🤫</span></div>
        ) : currentUser.avatar ? (
          <img src={currentUser.avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-campus-primary/10 flex items-center justify-center flex-shrink-0"><span className="text-campus-primary font-bold text-sm">{(currentUser.name || '?')[0]}</span></div>
        )}
        <div className="flex-1">
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={getPlaceholder()} rows={3} className="w-full resize-none bg-transparent text-sm placeholder-gray-400 focus:outline-none" />
        </div>
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="relative mt-3 rounded-xl overflow-hidden border border-gray-100 bg-gray-100 flex items-center justify-center max-h-80">
          <img src={imagePreview} alt="Upload preview" className="w-full h-auto max-h-80 object-contain" />
          <button onClick={removeImage} className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"><X size={14} /></button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ImageIcon size={18} />
          </button>
          {selectedType !== 'confession' && (
            <button onClick={() => setIsAnonymous(!isAnonymous)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${isAnonymous ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}>
              {isAnonymous ? <Lock size={14} /> : <Eye size={14} />}
              {isAnonymous ? 'Anonymous' : 'Public'}
            </button>
          )}
        </div>
        <button onClick={handleSubmit} disabled={(!content.trim() && !imageFile) || uploading} className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {uploading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
}
