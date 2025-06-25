import { LoginForm } from '@/components/auth/LoginForm';
import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 relative overflow-hidden font-serif" style={{ fontFamily: "'EB Garamond', serif" }}>

      {/* Gradiente suave sobre el fondo (como en Home) */}

      {/* Contenido del Login */}
      <section
        style={{
          boxShadow: "0 8px 32px 0 rgba(13,51,51,0.18), 0 1.5px 0 0 #e0c3a7",
        }}
      >
        <LoginForm />
      </section>
    </main>
  );
}
