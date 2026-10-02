'use client';

import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { Sparkles, Send, Bot, ImagePlus, X } from 'lucide-react';
import { useApp, AssistantTurn } from '@/context/AppContext';

interface Msg extends AssistantTurn {
  id: string;
  imagePreview?: string;
}

const SUGGESTIONS = [
  'What did I miss today?',
  "Who's around campus right now?",
  'Help me plan my study week',
  'Suggest something fun to do',
  'How do I meet new people here?',
];

const MAX_IMG_BYTES = 4 * 1024 * 1024;

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.replace('data:', '').replace(';base64', '');
      resolve({ base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AssistantPage() {
  const { askAssistant, currentUser } = useApp();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ preview: string; base64: string; mimeType: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firstName = (currentUser.name || '').split(' ')[0] || 'there';

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const clearPending = () => {
    setPendingImage(prev => { if (prev) URL.revokeObjectURL(prev.preview); return null; });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMG_BYTES) { alert('Image is too large (max 4 MB).'); return; }
    const preview = URL.createObjectURL(file);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      setPendingImage({ preview, base64, mimeType });
    } catch { URL.revokeObjectURL(preview); }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed && !pendingImage) return;
    if (thinking) return;

    const imagePreview = pendingImage?.preview;
    const { base64, mimeType } = pendingImage ?? {};
    const history: AssistantTurn[] = messages.map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, { id: `u${Date.now()}`, role: 'user', content: trimmed || '🖼️ [image]', imagePreview }]);
    setInput('');
    clearPending();
    setThinking(true);

    const { reply } = await askAssistant(trimmed, history, base64, mimeType);
    setMessages(prev => [...prev, { id: `a${Date.now()}`, role: 'assistant', content: reply }]);
    setThinking(false);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0 flex flex-col">
        <TopBar />
        <div className="max-w-2xl w-full mx-auto px-4 py-6 flex-1 flex flex-col">
          <div className="mb-4">
            <h1 className="text-2xl font-bold gradient-text flex items-center gap-2"><Sparkles className="text-campus-accent" /> Vybe Assistant</h1>
            <p className="text-sm text-gray-500 mt-1">Your campus AI buddy — ask me anything or send an image.</p>
          </div>

          {/* Chat area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-4">
            {messages.length === 0 && (
              <div className="card p-6 text-center">
                <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-3"><Sparkles size={30} className="text-white" /></div>
                <p className="font-bold text-gray-800">Hey {firstName}! 👋</p>
                <p className="text-sm text-gray-500 mt-1">I can help you get around, catch up on what you missed, analyse images, plan your week, or just chat. Try one of these:</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)} className="text-sm px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-campus-primary hover:text-campus-primary transition-colors">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 self-end"><Bot size={16} className="text-white" /></div>
                )}
                <div className={`max-w-[78%] rounded-2xl text-sm overflow-hidden ${m.role === 'user' ? 'bg-campus-primary text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'}`}>
                  {m.imagePreview && (
                    <img src={m.imagePreview} alt="Attached" className="w-full max-h-52 object-cover" />
                  )}
                  {(m.content && m.content !== '🖼️ [image]') && (
                    <p className="px-4 py-2.5 whitespace-pre-wrap break-words">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start gap-2">
                <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 self-end"><Bot size={16} className="text-white" /></div>
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="sticky bottom-0 bg-transparent pt-2 space-y-2">
            {/* Pending image preview */}
            {pendingImage && (
              <div className="relative inline-block">
                <img src={pendingImage.preview} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-gray-200 shadow-sm" />
                <button onClick={clearPending} aria-label="Remove image" className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center shadow"><X size={14} /></button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
            <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={thinking} aria-label="Attach image" title="Attach image to ask about" className="p-2.5 rounded-2xl text-gray-400 hover:text-campus-primary hover:bg-white transition-colors flex-shrink-0 disabled:opacity-40 shadow-sm border border-gray-200 bg-white">
                <ImagePlus size={20} />
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={pendingImage ? 'Add a caption… (optional)' : 'Ask me anything…'}
                maxLength={1000}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-campus-primary/20 shadow-sm"
              />
              <button type="submit" disabled={(!input.trim() && !pendingImage) || thinking} aria-label="Send" className="w-11 h-11 rounded-2xl gradient-bg text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0">
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
        <BottomNav />
      </main>
    </div>
  );
}
