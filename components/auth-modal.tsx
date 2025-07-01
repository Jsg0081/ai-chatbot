'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
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
import { login, register, type LoginActionState, type RegisterActionState } from '@/app/(auth)/actions';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [hasShownSuccessToast, setHasShownSuccessToast] = useState(false);
  const { update: updateSession } = useSession();

  const [loginState, loginAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: 'idle' }
  );

  const [registerState, registerAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: 'idle' }
  );

  const state = mode === 'login' ? loginState : registerState;
  const formAction = mode === 'login' ? loginAction : registerAction;

  useEffect(() => {
    if (state.status === 'failed') {
      toast.error(mode === 'login' ? 'Invalid credentials!' : 'Failed to create account!');
    } else if (state.status === 'invalid_data') {
      toast.error('Failed validating your submission!');
    } else if (state.status === 'success' && !isSuccessful && !hasShownSuccessToast) {
      setIsSuccessful(true);
      setHasShownSuccessToast(true);
      updateSession();
      toast.success(mode === 'login' ? 'Signed in successfully!' : 'Account created successfully!');
      
      // Close modal and call onSuccess callback
      setTimeout(() => {
        handleOpenChange(false);
        onSuccess?.();
        router.refresh();
      }, 500);
    }
  }, [state.status, mode, updateSession, onOpenChange, onSuccess, router, isSuccessful, hasShownSuccessToast]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  // Clean up state when modal closes
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      // Reset states when closing
      setIsSuccessful(false);
      setHasShownSuccessToast(false);
      setEmail('');
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setIsSuccessful(false);
    setHasShownSuccessToast(false);
  };

  // Reset success state when modal is closed
  useEffect(() => {
    if (!open) {
      setIsSuccessful(false);
      setHasShownSuccessToast(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === 'login' ? 'Sign In' : 'Sign Up'}</DialogTitle>
          <DialogDescription>
            {mode === 'login' 
              ? 'Use your email and password to sign in' 
              : 'Create an account with your email and password'}
          </DialogDescription>
        </DialogHeader>
        
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>
            {mode === 'login' ? 'Sign in' : 'Sign up'}
          </SubmitButton>
          
          <p className="text-center text-sm text-muted-foreground mt-4">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
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