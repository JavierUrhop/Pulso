import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Pulso', template: '%s · Pulso' },
  description: 'Competencia deportiva por equipos, con registro auditable de entrenamientos.',
  applicationName: 'Pulso',
  appleWebApp: { capable: true, title: 'Pulso', statusBarStyle: 'default' },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    // iOS solo reconoce PNG para la pantalla de inicio.
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Pulso',
    description: 'Competencia deportiva por equipos.',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0A2340',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh">
        <div className="mx-auto w-full max-w-2xl px-4 pt-5
                        [padding-bottom:calc(6rem+env(safe-area-inset-bottom))]
                        [padding-top:calc(1.25rem+env(safe-area-inset-top))]">
          {children}
        </div>
      </body>
    </html>
  );
}
