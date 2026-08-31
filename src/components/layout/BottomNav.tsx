'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Users, MessageCircle, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/explore', icon: Compass, label: 'Explore' },
  { href: '/connections', icon: Users, label: 'Connect' },
  { href: '/messages', icon: MessageCircle, label: 'Chat' },
  { href: '/profile', icon: User, label: 'Me' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { conversations } = useApp();
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-campus-dark border-t border-white/10 z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${isActive ? 'text-white' : 'text-blue-200/70'}`}>
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {item.href === '/messages' && totalUnread > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-campus-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center">{totalUnread}</span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
