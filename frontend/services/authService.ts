export async function getSessionMeta(): Promise<{ ipAddress: string; userAgent: string }> {
  const res = await fetch("/api/session");
  if (!res.ok) throw new Error("Failed to fetch session metadata");
  return res.json();
}

export async function post(url: string, data: any, errorMessage: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Required to accept and send cookies
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || errorMessage);
  }
  return json;
}

export async function signUpUser(route : string, errorMessage : string, payload: {
    firstName?: string;
    lastName?: string;
    email: string;
    password: string;
    ipAddress: string;
    userAgent: string;
}) {
  const json = await post(route, payload, errorMessage);
  return json.data.user;
}
