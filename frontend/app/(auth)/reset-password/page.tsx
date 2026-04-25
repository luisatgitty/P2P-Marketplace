'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Banner, Container } from '@/components/auth/auth-container';
import { LoadingPage } from '@/components/loading';
import { Eye, EyeOff } from 'lucide-react';
import { AUTH_LIMITS, validateResetPasswordInput } from '@/utils/validation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showErrorToast = (message: string) => {
    toast.error(message, { position: 'top-center' });
  };

  // Validate token on mount before showing form
  useEffect(() => {
    if (!token) {
      router.replace('/forgot-password');
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/validate-reset-token?token=${token}`,
        );

        if (!res.ok) {
          const parsedJson = await res.json();
          showErrorToast(parsedJson.data.message);
        } else {
          setTokenValid(true);
        }
        setIsLoading(false);
      } catch {
        showErrorToast(
          'Failed to validate reset link. Please contact support.',
        );
        setIsLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateResetPasswordInput(
      password,
      confirmPassword,
    );
    if (validationError) {
      showErrorToast(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        showErrorToast(data.data.message);
        setIsSubmitting(false);
        return;
      }

      router.replace('/login');
    } catch {
      showErrorToast('Failed to reset password. Please contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingPage />;

  return (
    <Container>
      <Card className='overflow-hidden p-0'>
        <CardContent className='grid p-0 md:grid-cols-2'>
          {tokenValid ? (
            <form className='p-6 md:p-8' onSubmit={handleSubmit}>
              <FieldGroup>
                <div className='flex flex-col items-center gap-2 text-center'>
                  <h1 className='text-2xl font-bold'>Reset Password</h1>
                  <p className='text-muted-foreground text-balance'>
                    Enter your new password below
                  </p>
                </div>
                <div className='relative'>
                  <Input
                    name='password'
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='pr-10'
                    minLength={AUTH_LIMITS.passwordMinLength}
                    maxLength={AUTH_LIMITS.passwordMaxLength}
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword((prev) => !prev)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors'
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <Field>
                  <FieldLabel htmlFor='confirmPassword'>
                    Confirm Password
                  </FieldLabel>
                  <div className='relative'>
                    <Input
                      name='confirmPassword'
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className='pr-10'
                      minLength={AUTH_LIMITS.passwordMinLength}
                      maxLength={AUTH_LIMITS.passwordMaxLength}
                      required
                    />
                    <button
                      type='button'
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors'
                      aria-label={
                        showConfirmPassword
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </Field>
                <Field>
                  <Button
                    type='submit'
                    className='w-full'
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                  </Button>
                </Field>
                <FieldDescription className='text-center'>
                  Remember your password?{' '}
                  <Link
                    href='/login'
                    className='underline underline-offset-2 hover:text-primary'
                  >
                    Log in
                  </Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          ) : (
            <div className='min-h-[calc(100vh-382px)] sm:min-h-[calc(100vh-350px)] md:min-h-[calc(100vh-382px)] flex flex-col items-center justify-center p-6 md:p-8 gap-2 text-center'>
              <div className='flex flex-col items-center gap-2 text-center'>
                <h1 className='text-2xl font-bold'>Invalid Reset Link</h1>
              </div>
              <FieldDescription className='text-center mt-4'>
                <Link
                  href='/forgot-password'
                  className='underline underline-offset-2 hover:text-primary'
                >
                  Request a new reset link
                </Link>
              </FieldDescription>
            </div>
          )}
          <Banner />
        </CardContent>
      </Card>
    </Container>
  );
}
