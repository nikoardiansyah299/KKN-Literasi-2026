import type { Metadata } from 'next';
import './globals.css';
import SiteShell from '@/components/site-shell';

export const metadata: Metadata = {
  title: 'KKN Literasi Library',
  description: 'Next.js library catalog with role-based workflows',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
