
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import Image from 'next/image';
import { Suspense } from 'react';

export default function ResetPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-primary/10 to-background">
      <Image
        src="https://placehold.co/1920x1080.png"
        alt="Key and lock background"
        layout="fill"
        objectFit="cover"
        quality={75}
        className="opacity-20 dark:opacity-10 -z-10"
        data-ai-hint="key lock security"
      />
      <Suspense fallback={<div className="text-foreground">Cargando...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
