'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles, X, Send, Bot, ImagePlus } from 'lucide-react';
import { useApp, AssistantTurn } from '@/context/AppContext';

interface Msg extends AssistantTurn {
  id: string;
  imagePreview?: string; // local object-url, shown in the bubble for the current turn
}

const SUGGESTIONS = [
  'What did I miss?',
  "Who's around campus?",
  'Help me plan my week',
  'What can I do here?',
];

const MAX_IMG_BYTES = 4 * 1024 * 1024; // 4 MB decoded — matches the API cap

/** Convert a File to a base64 string (without the data-url prefix). */
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

  const hidden = pathname === '/assistant';

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const firstName = (currentUser.name || '').split(' ')[0] || 'there';

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
    const userMsg: Msg = {
      id: `u${Date.now()}`,
      role: 'user',
      content: trimmed || '🖼️ [image]',
      imagePreview,
    };
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

  if (hidden) return null;

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Vybe Assistant"
          className="fixed z-40 bottom-20 right-4 lg:bottom-6 lg:right-6 w-14 h-14 rounded-full gradient-bg shadow-lg flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform"
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed z-50 bottom-20 right-4 lg:bottom-6 lg:right-6 w-[calc(100vw-2rem)] max-w-sm h-[70vh] max-h-[560px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="gradient-bg text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Bot size={18} /></div>
              <div>
                <p className="font-bold text-sm leading-tight">Vybe Assistant</p>
                <p className="text-[10px] text-white/80 leading-tight">Your campus AI buddy</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded-lg hover:bg-white/20"><X size={20} /></button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center pt-6">
                <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-3"><Sparkles size={26} className="text-white" /></div>
                <p className="font-bold text-sm text-gray-800">Hey {firstName}! 👋</p>
                <p className="text-xs text-gray-500 mt-1 px-4">I can help you get around VYBE, catch up on what you missed, or just chat. Try one of these:</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4 px-2">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-campus-primary hover:text-campus-primary transition-colors">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl text-sm overflow-hidden ${m.role === 'user' ? 'bg-campus-primary text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'}`}>
                  {m.imagePreview && (
                    <img src={m.imagePreview} alt="Attached" className="w-full max-h-40 object-cover" />
                  )}
                  {m.content && m.content !== '🖼️ [image]' && (
                    <p className="px-3 py-2 whitespace-pre-wrap break-words">{m.content}</p>
                  )}
                  {!m.content && !m.imagePreview && (
                    <p className="px-3 py-2 whitespace-pre-wrap break-words">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 px-3 py-2.5 rounded-2xl rounded-bl-sm">
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
          <div className="p-3 border-t border-gray-100 flex-shrink-0 space-y-2">
            {/* Pending image preview */}
            {pendingImage && (
              <div className="relative inline-block">
                <img src={pendingImage.preview} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-gray-200" />
                <button onClick={clearPending} aria-label="Remove image" className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center shadow"><X size={12} /></button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
            <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={thinking} aria-label="Attach image" title="Attach image" className="p-2 rounded-xl text-gray-400 hover:text-campus-primary hover:bg-gray-100 transition-colors flex-shrink-0 disabled:opacity-40">
                <ImagePlus size={18} />
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={pendingImage ? 'Add a caption… (optional)' : 'Ask me anything…'}
                maxLength={1000}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-campus-primary/20"
              />
              <button type="submit" disabled={(!input.trim() && !pendingImage) || thinking} aria-label="Send" className="w-9 h-9 rounded-xl gradient-bg text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
