
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <ForgotPasswordForm />
    </div>
  );
}
