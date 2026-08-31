'use client';

import { AppProvider } from '@/context/AppContext';
import AppShell from '@/components/AppShell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppShell>
        {/* Page background is set on <body> in globals.css → /public/images/app-bg.jpg (replace to customize) */}
        {children}
      </AppShell>
    </AppProvider>
  );
}
