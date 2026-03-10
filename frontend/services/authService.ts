export async function getSessionMeta(): Promise<{ ipAddress: string; userAgent: string }> {
  const response = await fetch("/api/session");
  if (!response.ok) throw new Error("Failed to fetch session metadata");
  return response.json();
}

export async function post(url: string, data: any) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Required to accept and send cookies
    body: JSON.stringify(data),
  });

  const parsedJson = await response.json();
  if (!response.ok) {
    // Throw the error message to display
    throw parsedJson.data.message;
  }
  // Return the user data from database
  return parsedJson.data;
}

export async function signUpUser(route : string, payload: {
    firstName?: string;
    lastName?: string;
    email: string;
    password: string;
    ipAddress: string;
    userAgent: string;
}) {
  const data = await post(route, payload);
  // data.user is the user object returned from the backend
  return data.user;
}
