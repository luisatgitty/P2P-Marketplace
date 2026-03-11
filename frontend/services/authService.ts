export async function getSessionMeta(): Promise<{ ipAddress: string; userAgent: string }> {
  const response = await fetch("/api/session");
  if (!response.ok) throw new Error("Failed to fetch session metadata");
  return response.json();
}

export async function post(url: string, data: any) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Required to accept and send cookies
      body: JSON.stringify(data),
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      // Throw the error message to display
      throw parsedJson.data.message;
    }
    // Return the user data from database
    return parsedJson.data;
  } catch (error: any) {
    throw error;
  }
}

export async function signUpUser(route : string, payload: {
    firstName?: string;
    lastName?: string;
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
    otpString?: string;
}) {
  const data = await post(route, payload);
  // data.user is the user object returned from the backend
  return data.user;
}

export async function verifyEmail(email: string, otp: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, otp }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}
