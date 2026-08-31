'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Users, MessageCircle, Calendar, User, Heart, Eye, Sparkles, LogOut } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/explore', icon: Compass, label: 'Explore' },
  { href: '/connections', icon: Users, label: 'Connections' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/events', icon: Calendar, label: 'Events' },
  { href: '/wingman', icon: Sparkles, label: 'Wingman' },
  { href: '/secret-admirer', icon: Heart, label: 'Secret Admirer' },
  { href: '/i-saw-you', icon: Eye, label: 'I Saw You' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, conversations } = useApp();
  const { logout } = useAuth();
  const router = useRouter();
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const handleLogout = () => { logout(); router.push('/welcome'); };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-campus-dark border-r border-white/10 p-4">
      <Link href="/" className="flex items-center gap-2 px-4 py-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
          <span className="text-white font-bold text-lg">C</span>
        </div>
        <span className="text-xl font-bold text-white">Campus</span>
      </Link>

      <nav className="flex-1 space-y-1">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${isActive ? 'bg-white/15 text-white' : 'text-blue-100/80 hover:bg-white/10 hover:text-white'}`}>
              <div className="relative">
                <Icon size={22} />
                {item.href === '/messages' && totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-campus-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">{totalUnread}</span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 space-y-1">
        <Link href="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors">
          {currentUser.avatar ? (
            <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><span className="text-white font-bold text-sm">{(currentUser.name || '?')[0]}</span></div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate text-white">{currentUser.name || 'Set up profile'}</p>
            <p className="text-xs text-blue-200/70 truncate">{currentUser.username ? `@${currentUser.username}` : 'Tap to edit'}</p>
          </div>
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-300 font-medium hover:bg-white/10 transition-colors">
          <LogOut size={20} />
          <span className="text-sm">Log Out</span>
        </button>
      </div>
    </aside>
  );
}
