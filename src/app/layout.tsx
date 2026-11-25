import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Selfweb – Vetrine per la tua attività',
  description: 'Crea e gestisci la vetrina online della tua attività.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}
