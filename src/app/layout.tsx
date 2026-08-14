import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Pulso', template: '%s · Pulso' },
  description: 'Competencia deportiva por equipos, con registro auditable de entrenamientos.',
  applicationName: 'Pulso',
  appleWebApp: { capable: true, title: 'Pulso', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#faf9f6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh">
        <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-5">{children}</div>
      </body>
    </html>
  );
}
