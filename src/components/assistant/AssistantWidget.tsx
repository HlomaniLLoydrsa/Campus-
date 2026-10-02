'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles, X, Send, Bot, ImagePlus } from 'lucide-react';
import { useApp, AssistantTurn } from '@/context/AppContext';

interface Msg extends AssistantTurn {
  id: string;
  imagePreview?: string;
}

const SUGGESTIONS = [
  'What did I miss?',
  "Who's around campus?",
  'Help me plan my week',
  'What can I do here?',
];

const MAX_IMG_BYTES = 4 * 1024 * 1024;

// Pages where the floating button is allowed to appear.
// Exact matches only — so /connections/123 won't show it.
const ALLOWED_PAGES = ['/', '/explore', '/connections'];

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      resolve({ base64, mimeType: header.replace('data:', '').replace(';base64', '') });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AssistantWidget() {
  const { askAssistant, currentUser } = useApp();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ preview: string; base64: string; mimeType: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-close if the user navigates to a non-allowed page.
  useEffect(() => {
    if (!ALLOWED_PAGES.includes(pathname)) setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const firstName = (currentUser.name || '').split(' ')[0] || 'there';

  // Don't render anything on the dedicated /assistant page or on non-main pages
  // (strict match, not startsWith — so /connections/123 is hidden).
  if (!ALLOWED_PAGES.includes(pathname)) return null;

  const clearPending = () => {
    setPendingImage(prev => { if (prev) URL.revokeObjectURL(prev.preview); return null; });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMG_BYTES) { alert('Image is too large (max 4 MB). Try a smaller photo.'); return; }
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
    const userMsg: Msg = { id: `u${Date.now()}`, role: 'user', content: trimmed || '🖼️ [image]', imagePreview };
    const history: AssistantTurn[] = messages.map(m => ({ role: m.role, content: m.content }));
    const { base64, mimeType } = pendingImage ?? {};

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    clearPending();
    setThinking(true);

    const { reply } = await askAssistant(trimmed, history, base64, mimeType);
    setMessages(prev => [...prev, { id: `a${Date.now()}`, role: 'assistant', content: reply }]);
    setThinking(false);
  };

  return (
    <>
      {/* Floating launcher — small pill, top-right of content area, desktop only hides
          at bottom-right above nav. Sized to not cover any content. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Vybe Assistant"
          className="fixed z-40 bottom-24 right-3 lg:bottom-8 lg:right-5 flex items-center gap-1.5 px-3 py-2 rounded-full gradient-bg shadow-md text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
        >
          <Sparkles size={14} />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      )}

      {/* Chat panel — anchored bottom-right, compact */}
      {open && (
        <div className="fixed z-50 bottom-24 right-3 lg:bottom-8 lg:right-5 w-[calc(100vw-1.5rem)] max-w-xs h-[65vh] max-h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="gradient-bg text-white px-3 py-2.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><Bot size={15} /></div>
              <div>
                <p className="font-bold text-xs leading-tight">Vybe Assistant</p>
                <p className="text-[10px] text-white/70 leading-tight">AI campus buddy</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded-lg hover:bg-white/20"><X size={17} /></button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center pt-4">
                <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-2"><Sparkles size={22} className="text-white" /></div>
                <p className="font-bold text-sm text-gray-800">Hey {firstName}! 👋</p>
                <p className="text-xs text-gray-500 mt-1 px-2">I can help you get around VYBE or just chat. Try:</p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-3 px-1">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)} className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-campus-primary hover:text-campus-primary transition-colors">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl text-xs overflow-hidden ${m.role === 'user' ? 'bg-campus-primary text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'}`}>
                  {m.imagePreview && <img src={m.imagePreview} alt="Attached" className="w-full max-h-32 object-cover" />}
                  {m.content && m.content !== '🖼️ [image]' && <p className="px-2.5 py-1.5 whitespace-pre-wrap break-words">{m.content}</p>}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 px-3 py-2 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-2.5 border-t border-gray-100 flex-shrink-0 space-y-1.5">
            {pendingImage && (
              <div className="relative inline-block">
                <img src={pendingImage.preview} alt="Preview" className="h-12 w-12 object-cover rounded-lg border border-gray-200" />
                <button onClick={clearPending} aria-label="Remove image" className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-800 text-white flex items-center justify-center"><X size={10} /></button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
            <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-center gap-1.5">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={thinking} aria-label="Attach image" className="p-1.5 rounded-lg text-gray-400 hover:text-campus-primary hover:bg-gray-100 flex-shrink-0 disabled:opacity-40">
                <ImagePlus size={16} />
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={pendingImage ? 'Caption… (optional)' : 'Ask anything…'}
                maxLength={1000}
                className="flex-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-campus-primary/20"
              />
              <button type="submit" disabled={(!input.trim() && !pendingImage) || thinking} aria-label="Send" className="w-7 h-7 rounded-xl gradient-bg text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0">
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
