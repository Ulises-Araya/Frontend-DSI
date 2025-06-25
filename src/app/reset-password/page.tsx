
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import Image from 'next/image';
import { Suspense } from 'react';

export default function ResetPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Suspense fallback={<div className="text-foreground">Cargando...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
