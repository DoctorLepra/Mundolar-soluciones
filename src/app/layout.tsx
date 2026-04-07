import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  metadataBase: new URL('https://mundolarsoluciones.vercel.app'),
  title: {
    default: "Inicio | Mundolar Soluciones",
    template: "%s | Mundolar Soluciones",
  },
  description: "Telecomunicaciones Profesionales - Expertos en Radiocomunicaciones y Soluciones Tecnológicas en Colombia.",
  openGraph: {
    title: 'Mundolar Soluciones | Telecomunicaciones Profesionales',
    description: 'Expertos en soluciones de radiocomunicación, venta y alquiler de equipos de las mejores marcas.',
    url: 'https://mundolarsoluciones.vercel.app',
    siteName: 'Mundolar Soluciones',
    images: [
      {
        url: '/img/logo-rojo-blanco.png',
        width: 800,
        height: 600,
      },
    ],
    locale: 'es_CO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mundolar Soluciones',
    description: 'Telecomunicaciones Profesionales en Colombia.',
    images: ['/img/logo-rojo-blanco.png'],
  },
};

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Imperial+Script&family=Rethink+Sans:ital,wght@0,400..800;1,400..800&family=Unbounded:wght@200..900&display=swap" rel="stylesheet" />
        <link rel="icon" href="/img/logo-rojo-blanco.png" type="image/png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#db1923" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mundolar" />
      </head>
      <body
        className="antialiased bg-background-light text-slate-900 font-body"
        suppressHydrationWarning
      >
        <CartProvider>
          <Navbar />
          <main className="flex-grow min-h-screen">
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
