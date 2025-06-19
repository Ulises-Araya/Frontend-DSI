
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Leaf, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 relative overflow-hidden">
      <Image
        src="https://placehold.co/1920x1080.png"
        alt="Enchanted forest background"
        layout="fill"
        objectFit="cover"
        quality={80}
        className="opacity-30 dark:opacity-20 -z-10"
        data-ai-hint="enchanted forest background"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background -z-10" />

      <div className="text-center bg-card/80 backdrop-blur-sm p-8 md:p-12 rounded-xl shadow-2xl border border-primary/30">
        <Leaf className="w-16 h-16 text-primary mx-auto mb-4 animate-leaf-sway" />
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline text-primary mb-6">
          Turnero
        </h1>
        <p className="text-xl md:text-2xl text-foreground/80 mb-10">
          UTN Facultad Regional San Francisco
        </p>
        <Button asChild size="lg" className="group relative overflow-hidden transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-background">
          <Link href="/login">
            <Sparkles className="w-5 h-5 mr-2 opacity-70 group-hover:opacity-100 group-hover:animate-ping absolute left-4 top-1/2 -translate-y-1/2" />
             Acceder al Login
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/30 to-transparent transition-all duration-1000 ease-out group-hover:translate-x-full animate-none group-hover:animate-[shimmer_2s_infinite]" />
          </Link>
        </Button>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center space-x-2 text-sm text-muted-foreground">
        <Image src="https://placehold.co/100x100.png" alt="Mushrooms illustration" width={40} height={40} className="rounded-full opacity-70" data-ai-hint="mushrooms illustration" />
        <Image src="https://placehold.co/100x100.png" alt="Potion bottle illustration" width={30} height={30} className="rounded-full opacity-70" data-ai-hint="potion bottle" />
      </div>
       <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </main>
  );
}
