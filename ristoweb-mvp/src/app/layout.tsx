import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RistoWeb – piattaforma per ristoranti',
  description: 'Piattaforma per creare e gestire siti web per ristoranti e pizzerie.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}
