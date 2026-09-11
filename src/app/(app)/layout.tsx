'use client';

import { AppProvider } from '@/context/AppContext';
import { FeedbackProvider } from '@/context/FeedbackContext';
import AppShell from '@/components/AppShell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeedbackProvider>
      <AppProvider>
        <AppShell>
          {/* Page background is set on <body> in globals.css → /public/images/app-bg.jpg (replace to customize) */}
          {children}
        </AppShell>
      </AppProvider>
    </FeedbackProvider>
  );
}
