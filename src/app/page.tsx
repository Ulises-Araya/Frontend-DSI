"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Leaf, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background/60 -z-10" />
      <div className="text-center bg-card/80 backdrop-blur-sm p-8 md:p-12 rounded-xl shadow-2xl border border-primary/30">
        <Image src="/logo.png" alt="Logo" width={300} height={200} className="w-50 h-auto mx-auto mb-6" />
        <Button
          asChild
          size="lg"
          className="group relative overflow-hidden transition-all duration-300 ease-out bg-[#F5F5DC] text-[#7B8C77] border-2 border-[#91b188] rounded-lg shadow-md hover:ring-2 hover:ring-[#91b188] hover:ring-offset-2 hover:ring-offset-[#F5F5DC] hover:bg-[#f5f5d3] font-serif"
        >
          <Link href="/login" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 opacity-60 text-7B8C77 group-hover:opacity-80 transition-opacity duration-300" />
            Acceder al Login
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-[#8ebe8ee6] to-transparent opacity-0 group-hover:opacity-20 transition-all duration-1000 ease-out group-hover:translate-x-full animate-none group-hover:animate-[shimmer_2s_infinite]" />
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
