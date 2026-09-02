'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MessageCircle, Users, Gamepad2, Heart, Calendar, Sparkles } from 'lucide-react';

export default function WelcomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [user, isLoading, router]);

  if (isLoading) return null;

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Background placeholder image — replace /public/images/app-bg.jpg with your own */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/app-bg.jpg')" }} />
      {/* Color overlay so text stays readable */}
      <div className="absolute inset-0 bg-gradient-to-br from-campus-dark/85 via-campus-primary/80 to-campus-secondary/85" />
      {/* Content wrapper above the background */}
      <div className="relative z-10 flex flex-col flex-1">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <span className="text-xl font-bold text-white">Campus</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-xl transition-colors">Log In</Link>
          <Link href="/signup" className="px-4 py-2 text-sm font-medium bg-white text-campus-primary rounded-xl hover:bg-gray-100 transition-colors">Sign Up</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white max-w-2xl leading-tight">
          Your Campus.<br />Your Community.
        </h1>
        <p className="text-lg md:text-xl text-white/80 mt-4 max-w-lg">
          Connect with students, share moments, play games, and discover what&apos;s happening on campus.
        </p>
        <div className="flex gap-3 mt-8">
          <Link href="/signup" className="px-8 py-3 bg-white text-campus-primary font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-xl">Get Started</Link>
          <Link href="/login" className="px-8 py-3 bg-white/10 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20 transition-colors">Log In</Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-16 max-w-2xl">
          {[
            { icon: MessageCircle, label: 'Chat' },
            { icon: Users, label: 'Connect' },
            { icon: Gamepad2, label: 'Games' },
            { icon: Heart, label: 'Dating' },
            { icon: Calendar, label: 'Events' },
            { icon: Sparkles, label: 'Discover' },
          ].map(f => (
            <div key={f.label} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                <f.icon size={22} className="text-white" />
              </div>
              <span className="text-xs text-white/70 font-medium">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-white/50 text-xs">
        Campus Social Network &copy; 2026
      </div>
      </div>
    </div>
  );
}
