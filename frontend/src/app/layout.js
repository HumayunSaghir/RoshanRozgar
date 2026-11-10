import { Figtree, Noto_Nastaliq_Urdu } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

const figtree = Figtree({ variable: '--font-figtree', subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });
const nastaliq = Noto_Nastaliq_Urdu({ variable: '--font-nastaliq', subsets: ['arabic'], weight: ['400', '700'], display: 'swap' });

export const metadata = {
  title: 'RoshanRozgar - Every skill, work nearby',
  description:
    'Voice-first marketplace that connects households with nearby, available skilled trade workers in Islamabad and Rawalpindi. No forms, no CV: speak in Urdu.',
  icons: { icon: '/brand/logo-mark.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0e4b35',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${figtree.variable} ${nastaliq.variable}`}>
      <body className="min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-green-800 focus:px-5 focus:py-3 focus:font-bold focus:text-white"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
