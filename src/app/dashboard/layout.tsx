import { DashboardHeader } from '@/components/navigation/DashboardHeader';
import Image from 'next/image';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Image
        src="https://placehold.co/1920x1080.png"
        alt="Subtle botanical pattern background"
        layout="fill"
        objectFit="cover"
        quality={50}
        className="opacity-10 dark:opacity-5 -z-10"
        data-ai-hint="subtle botanical pattern"
      />
      <DashboardHeader />
      <main className="flex-1 container mx-auto py-8 px-4 md:px-6 max-w-screen-2xl">
        {children}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border/40 bg-background/80 backdrop-blur-sm">
        © {new Date().getFullYear()} ArborVitae Scheduler - UTN San Francisco. Todos los derechos reservados.
      </footer>
    </div>
  );
}
