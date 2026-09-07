'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MessageCircle, Users, Gamepad2, Heart, Calendar, Sparkles } from 'lucide-react';
import Logo from '@/components/Logo';

// Typewriter effect that types out the full string then loops.
function useTypewriter(full: string, speed = 90, pause = 1800) {
  const [text, setText] = useState('');
  useEffect(() => {
    let i = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (i <= full.length) {
        setText(full.slice(0, i));
        i++;
        timeout = setTimeout(tick, speed);
      } else {
        timeout = setTimeout(() => { i = 0; tick(); }, pause);
      }
    };
    tick();
    return () => clearTimeout(timeout);
  }, [full, speed, pause]);
  return text;
}

export default function WelcomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const typed = useTypewriter('Your Campus. Your Community.');

  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [user, isLoading, router]);

  if (isLoading) return null;

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Background placeholder image — replace /public/images/app-bg.jpg with your own */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/app-bg.jpg')" }} />
      {/* Lighter color overlay so the picture shows through while text stays readable */}
      <div className="absolute inset-0 bg-gradient-to-br from-campus-dark/60 via-campus-primary/50 to-campus-secondary/60" />
      {/* Content wrapper above the background */}
      <div className="relative z-10 flex flex-col flex-1">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Logo size={36} />
          <span className="text-xl font-bold text-white">VYBE</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-xl transition-colors">Log In</Link>
          <Link href="/signup" className="px-4 py-2 text-sm font-medium bg-white text-campus-primary rounded-xl hover:bg-gray-100 transition-colors">Sign Up</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white max-w-2xl leading-tight min-h-[4.5rem] md:min-h-[9rem]">
          {typed}<span className="animate-pulse">|</span>
        </h1>
        <p className="text-lg md:text-xl text-white/80 mt-4 max-w-lg">
          Connect with students, share moments, play games, and discover what&apos;s happening on campus.
        </p>
        <div className="flex gap-3 mt-8">
          <Link href="/signup" className="px-8 py-3 bg-white text-campus-primary font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-xl">Get Started</Link>
          <Link href="/login" className="px-8 py-3 bg-white/10 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20 transition-colors">Log In</Link>
        </div>

        {/* Features — each with its own color */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-16 max-w-2xl">
          {[
            { icon: MessageCircle, label: 'Chat', color: 'bg-sky-500' },
            { icon: Users, label: 'Connect', color: 'bg-indigo-500' },
            { icon: Gamepad2, label: 'Games', color: 'bg-emerald-500' },
            { icon: Heart, label: 'Dating', color: 'bg-rose-500' },
            { icon: Calendar, label: 'Events', color: 'bg-amber-500' },
            { icon: Sparkles, label: 'Discover', color: 'bg-purple-500' },
          ].map(f => (
            <div key={f.label} className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-xl ${f.color} shadow-lg flex items-center justify-center`}>
                <f.icon size={22} className="text-white" />
              </div>
              <span className="text-xs text-white/80 font-medium">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-white/50 text-xs">
        VYBE Social Network &copy; 2026
      </div>
      </div>
    </div>
  );
}
