'use client';

import { useRouter } from 'next/navigation';
import {
  AuthLinkPasswordForm,
  type AuthLinkPasswordFormCopy,
} from '@/components/auth-link-password-form';

const COPY: AuthLinkPasswordFormCopy = {
  title: 'Choose a new password',
  titleNoSession: 'Reset your password',
  subtitleNoSession:
    'This reset link is invalid or has expired. Request a new link from the forgot password page.',
  subtitleWithSession: 'Enter a new password for your account.',
  submitLabel: 'Update password',
  submitLabelLoading: 'Saving...',
  defaultLinkError: 'This link is no longer valid.',
  backToLogin: 'Back to login',
};

export default function ResetPasswordPage() {
  const router = useRouter();
  return (
    <AuthLinkPasswordForm
      copy={COPY}
      onPasswordSaved={() => {
        router.push('/dashboard');
        router.refresh();
      }}
    />
  );
}
