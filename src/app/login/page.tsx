
import { LoginForm } from '@/components/auth/LoginForm';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-primary/10 to-background">
       <Image
        src="https://placehold.co/1920x1080.png"
        alt="Mystical herbs background"
        fill={true}
        quality={75}
        className="opacity-20 dark:opacity-10 -z-10 object-cover"
        data-ai-hint="mystical herbs background"
      />
      <div className="w-full max-w-md">
        <LoginForm />
        <div className="mt-4 text-center">
          <Link href="/forgot-password" passHref>
            <span className="text-sm text-accent hover:text-accent/80 hover:underline cursor-pointer">
              ¿Olvidaste tu contraseña?
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
