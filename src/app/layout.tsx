import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import Image from 'next/image';
import { ScrollUnlocker } from "@/components/ScrollUnlocker";

export const metadata: Metadata = {
  title: 'ArborVitae Scheduler',
  description: 'Turnero - UTN Facultad Regional San Fancisco',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Almendra+SC&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=swap" rel="stylesheet" />
        <link rel="icon" href="/icono.ico" type="image/x-icon" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        {/* Fondo fijo global */}
        <div className="fixed inset-0 -z-50 pointer-events-none">
          <Image
            src="/fondo.png"
            alt="Enchanted forest background"
            fill={true}
            quality={80}
            className="opacity-10 dark:opacity-20 -z-10 object-cover"
          />
        </div>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ScrollUnlocker /> {/* Ahora sí, sin error */}
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
