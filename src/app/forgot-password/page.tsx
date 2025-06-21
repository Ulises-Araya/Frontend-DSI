
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-primary/10 to-background">
      <Image
        src="https://placehold.co/1920x1080.png"
        alt="Ancient scroll background"
        fill={true}
        quality={75}
        className="opacity-20 dark:opacity-10 -z-10 object-cover"
        data-ai-hint="ancient scroll paper"
      />
      <ForgotPasswordForm />
    </div>
  );
}
