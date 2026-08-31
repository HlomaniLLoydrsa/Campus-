'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, Settings, Search, LogOut, User as UserIcon } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function TopBar() {
  const { unreadNotificationCount, currentUser } = useApp();
  const { logout } = useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/welcome');
  };

  return (
    <header className="sticky top-0 z-40 bg-campus-dark border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-3 max-w-screen-xl mx-auto">
        {/* Mobile logo */}
        <Link href="/" className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
            <span className="text-white font-bold">C</span>
          </div>
          <span className="text-lg font-bold text-white">Campus</span>
        </Link>

        {/* Search bar - desktop */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/70" />
            <input type="text" placeholder="Search campus..." className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/15 rounded-xl text-sm text-white placeholder-blue-200/60 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all" />
          </div>
        </div>

        {/* Notification + Settings + Profile menu */}
        <div className="flex items-center gap-1">
          <Link href="/notifications" className="relative p-2.5 rounded-xl hover:bg-white/10 transition-colors text-white">
            <Bell size={22} />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-campus-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadNotificationCount}</span>
            )}
          </Link>
          <Link href="/settings" className="p-2.5 rounded-xl hover:bg-white/10 transition-colors">
            <Settings size={22} className="text-blue-100" />
          </Link>

          {/* Profile dropdown with Logout */}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="ml-1 rounded-full hover:ring-2 hover:ring-white/30 transition-all">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{(currentUser.name || '?')[0]}</span>
                </div>
              )}
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-20 w-56 animate-slide-down">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="font-semibold text-sm truncate">{currentUser.name || 'Your Profile'}</p>
                    <p className="text-xs text-gray-500 truncate">{currentUser.username ? `@${currentUser.username}` : 'Set up your profile'}</p>
                  </div>
                  <Link href="/profile" onClick={() => setShowMenu(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <UserIcon size={16} /> My Profile
                  </Link>
                  <Link href="/settings" onClick={() => setShowMenu(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Settings size={16} /> Settings
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-50">
                    <LogOut size={16} /> Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
