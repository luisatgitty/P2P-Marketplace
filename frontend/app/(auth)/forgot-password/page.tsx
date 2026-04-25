'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { Banner, Container } from '@/components/auth/auth-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { sendPostRequest } from '@/services/authService';
import { AUTH_LIMITS, validateForgotPasswordInput } from '@/utils/validation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForgotPasswordInput(email);
    if (validationError) {
      toast.error(validationError, { position: 'top-center' });
      return;
    }

    setIsLoading(true);

    try {
      await sendPostRequest('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (error: any) {
      if (error === 'Failed to fetch') {
        error = 'Failed to send reset link. Please contact support.';
      }
      toast.error(error, { position: 'top-center' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          {submitted ? (
            <div className="flex min-h-[calc(100vh-382px)] sm:min-h-[calc(100vh-350px)] md:min-h-[calc(100vh-382px)] flex-col items-center justify-center p-6 md:p-8 gap-2 text-center">
              <h1 className="text-2xl font-bold">Check your email</h1>
              <p className="text-muted-foreground text-balance">
                Reset link has been sent. Check your inbox.
              </p>
            </div>
          ) : (
            <form className="p-6 md:p-8" onSubmit={handleSubmit}>
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Forgot Password</h1>
                  <p className="text-muted-foreground text-balance">
                    Enter your email to receive a reset link
                  </p>
                </div>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    name="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    minLength={AUTH_LIMITS.emailMinLength}
                    maxLength={AUTH_LIMITS.emailMaxLength}
                    required
                  />
                </Field>
                <Field>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
                  </Button>
                </Field>
                <FieldDescription className="text-center">
                  Remember your password? <Link href="/login">Log in</Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          )}
          <Banner />
        </CardContent>
      </Card>
    </Container>
  );
}
