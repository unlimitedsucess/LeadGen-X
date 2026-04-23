import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'LeadGen X - Premium Email Extractor',
  description: 'Extract business emails from LinkedIn and Google automatically.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased dark`}>
      <body className="font-sans min-h-screen bg-[#030303] text-white custom-scrollbar">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent shrink-0">
              LeadGen X
            </Link>
            
            <div className="flex items-center space-x-4 md:space-x-8 overflow-x-auto no-scrollbar px-4">
              <Link href="/" className="text-[10px] md:text-sm font-medium text-gray-400 hover:text-white transition-colors whitespace-nowrap">
                Extractions
              </Link>
              <Link href="/vault" className="text-[10px] md:text-sm font-medium text-gray-400 hover:text-white transition-colors whitespace-nowrap">
                Leads Vault
              </Link>
              <Link href="/mailer" className="text-[10px] md:text-sm font-medium text-gray-400 hover:text-white transition-colors whitespace-nowrap">
                Mailer Dashboard
              </Link>
            </div>

            <div className="hidden sm:flex items-center space-x-2 shrink-0">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-gray-500">Live Engine</span>
            </div>
          </div>
        </nav>
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}

