
import { DashboardHeader } from '@/components/navigation/DashboardHeader';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader />
      <main className="flex-1 container mx-auto py-8 px-4 md:px-6 ml-6 mr-4">
        {children}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border/40 bg-background/80 backdrop-blur-sm">
        © {new Date().getFullYear()} ArborVitae Scheduler - UTN San Francisco. Todos los derechos reservados.
      </footer>
    </div>
  );
}
