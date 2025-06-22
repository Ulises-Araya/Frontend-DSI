import { RegisterForm } from '@/components/auth/RegisterForm';
import Image from 'next/image';

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-primary/10 to-background">
      <Image
        src="/fondo.png"
        alt="Old books and scrolls background"
        fill={true}
        quality={75}
        className="opacity-20 dark:opacity-10 -z-10 object-cover"
        data-ai-hint="old books scrolls"
      />
      <RegisterForm />
    </div>
  );
}
