"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation";
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react";
import { useUser } from "@/utils/UserContext";
import { getSessionMeta, sendPostRequest } from "@/services/authService";
import { isValidEmail } from "@/utils/validation";
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Banner } from "@/components/auth/auth-container";

export function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" })
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { saveUserData } = useUser();
  const STORAGE_KEY = "auth_user";
  
  // Redirect if user is already authenticated
  useEffect(() => {
    const userAuth = localStorage.getItem(STORAGE_KEY);
      if (userAuth) {
        router.push("/");
      } else {
        setAuthChecked(true); // Only show UI if user is not authenticated
      }
    }, []);

  // Don't render anything until auth check is complete
  if (!authChecked) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Use the name attribute as the key
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true);

    // Validate email before sending request to backend
    const emailError = isValidEmail(form.email);
    if (emailError) {
      toast.error(emailError, { position: "top-center" });
      setLoading(false);
      return;
    }

    try {
      // Get the user's IP address and user agent
      const { ipAddress, userAgent } = await getSessionMeta();
      // Send the form data to the backend
      const data = await sendPostRequest("/auth/login", { ...form, ipAddress, userAgent }, true);
      console.log("Logged in user:", data.user);
      saveUserData(data.user);
      router.push("/");
    } catch (error: any) {
      toast.error(error, { position: "top-center" });
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="grid p-0 md:grid-cols-2">
        <form className="p-6 md:p-8" onSubmit={handleSubmit}>
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-muted-foreground text-balance">
                Login to your P2P Marketplace account
              </p>
            </div>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                name="email"
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </Field>
            <Field>
              <div className="flex items-center">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Link href="/forgot-password"
                  className="ml-auto text-sm underline-offset-2 hover:underline">
                  Forgot your password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <Field>
              <Button type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </Field>
            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
              Or continue with
            </FieldSeparator>
            <Field className="grid grid-cols-2 gap-4">
              <Button variant="outline" type="button">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M6 12C6 15.3137 8.68629 18 12 18C14.6124 18 16.8349 16.3304 17.6586 14H12V10H21.8047V14H21.8C20.8734 18.5645 16.8379 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C15.445 2 18.4831 3.742 20.2815 6.39318L17.0039 8.68815C15.9296 7.06812 14.0895 6 12 6C8.68629 6 6 8.68629 6 12Z"
                    fill="currentColor"/>
                </svg>
                <span className="sr-only">Login with Google</span>
              </Button>
              <Button variant="outline" type="button">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M9.19795 21.5H13.198V13.4901H16.8021L17.198 9.50977H13.198V7.5C13.198 6.94772 13.6457 6.5 14.198 6.5H17.198V2.5H14.198C11.4365 2.5 9.19795 4.73858 9.19795 7.5V9.50977H7.19795L6.80206 13.4901H9.19795V21.5Z"
                    fill="currentColor"/>
                </svg>
                <span className="sr-only">Login with Facebook</span>
              </Button>
            </Field>
            <FieldDescription className="text-center">
              Don&apos;t have an account? <Link href="/signup">Sign up</Link>
            </FieldDescription>
          </FieldGroup>
        </form>
        <Banner />
      </CardContent>
    </Card>
  )
}
