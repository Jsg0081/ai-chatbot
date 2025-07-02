'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { register, type RegisterActionState } from '@/app/(auth)/actions';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (mode === 'login') {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.ok) {
        toast.success('Signed in successfully!');
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error('Invalid credentials!');
        setLoading(false);
      }
    } else {
      // Register mode
      const result = await register({ status: 'idle' }, formData);

      if (result.status === 'success') {
        const signInResult = await signIn('credentials', {
          redirect: false,
          email,
          password,
        });

        if (signInResult?.ok) {
          toast.success('Account created and signed in!');
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error('Account created, but automatic sign-in failed.');
          setLoading(false);
        }
      } else if (result.status === 'user_exists') {
        toast.error('An account with this email already exists.');
        setLoading(false);
      } else {
        toast.error('Failed to create account.');
        setLoading(false);
      }
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === 'login' ? 'Sign In' : 'Sign Up'}</DialogTitle>
          <DialogDescription>
            {mode === 'login'
              ? 'Use your email and password to sign in'
              : 'Create an account with your email and password'}
          </DialogDescription>
        </DialogHeader>

        <AuthForm onSubmit={handleSubmit}>
          <SubmitButton isSuccessful={false} pending={loading}>
            {mode === 'login' ? 'Sign in' : 'Sign up'}
          </SubmitButton>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {mode === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto font-semibold"
              onClick={toggleMode}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </Button>
            {mode === 'login' && ' for free.'}
          </p>
        </AuthForm>
      </DialogContent>
    </Dialog>
  );
} 