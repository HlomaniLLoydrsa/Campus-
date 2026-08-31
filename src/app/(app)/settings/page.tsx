'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Bell, Lock, User, Palette, Shield, LogOut, ChevronRight, Edit2 } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { currentUser } = useApp();
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/welcome');
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold gradient-text mb-6">Settings</h1>

          {/* Account card */}
          <div className="card p-4 mb-4">
            <div className="flex items-center gap-3">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-campus-primary/10 flex items-center justify-center"><span className="text-campus-primary font-bold text-xl">{(currentUser.name || '?')[0]}</span></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{currentUser.name || 'Set up your profile'}</p>
                <p className="text-sm text-gray-500 truncate">{currentUser.username ? `@${currentUser.username}` : 'Add your details'}</p>
              </div>
              <Link href="/profile" className="btn-secondary text-sm flex items-center gap-1"><Edit2 size={14} /> Edit</Link>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { icon: User, label: 'Account', desc: 'Manage your account information', href: '/profile' },
              { icon: Bell, label: 'Notifications', desc: 'Configure notification preferences', href: '/notifications' },
              { icon: Lock, label: 'Privacy', desc: 'Control who sees your content' },
              { icon: Shield, label: 'Security', desc: 'Password and login settings' },
              { icon: Palette, label: 'Appearance', desc: 'Theme and display options' },
            ].map(item => {
              const Inner = (
                <div className="card p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"><item.icon size={20} className="text-gray-600" /></div>
                    <div className="flex-1"><p className="font-medium text-sm">{item.label}</p><p className="text-xs text-gray-500">{item.desc}</p></div>
                    <ChevronRight size={18} className="text-gray-300" />
                  </div>
                </div>
              );
              return item.href ? <Link key={item.label} href={item.href}>{Inner}</Link> : <div key={item.label}>{Inner}</div>;
            })}
          </div>

          {/* Logout */}
          <button onClick={handleLogout} className="w-full mt-6 card p-4 hover:bg-red-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><LogOut size={20} className="text-red-600" /></div>
              <div className="flex-1 text-left"><p className="font-medium text-sm text-red-600">Log Out</p><p className="text-xs text-gray-500">Sign out of your account</p></div>
            </div>
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
