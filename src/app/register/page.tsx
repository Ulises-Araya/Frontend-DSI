import { RegisterForm } from '@/components/auth/RegisterForm';
import Image from 'next/image';

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-primary/10 to-background">
      <Image
        src="https://placehold.co/1920x1080.png"
        alt="Old books and scrolls background"
        layout="fill"
        objectFit="cover"
        quality={75}
        className="opacity-20 dark:opacity-10 -z-10"
        data-ai-hint="old books scrolls"
      />
      <RegisterForm />
    </div>
  );
}
