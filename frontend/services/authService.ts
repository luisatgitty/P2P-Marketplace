export async function getSessionMeta(): Promise<{
  ipAddress: string;
  userAgent: string;
}> {
  const response = await fetch('/api/session');
  if (!response.ok) throw new Error('Failed to fetch session metadata');
  return response.json();
}

export async function sendPostRequest(
  route: string,
  payload: any,
  includeCredentials = false,
) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: includeCredentials ? 'include' : 'same-origin', // Required to accept and send cookies
      body: JSON.stringify(payload),
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      // Throw the error message to display
      throw parsedJson.data;
    }
    // Return the user data from database
    return parsedJson.data;
  } catch (error: any) {
    throw (
      error.message || 'An unexpected error occurred. Please try again later.'
    );
  }
}

export async function sendDeleteRequest(
  route: string,
  includeCredentials = true,
) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}${route}`, {
      method: 'DELETE',
      credentials: includeCredentials ? 'include' : 'same-origin',
    });
  } catch {
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function sendGetRequest(
  route: string,
  includeCredentials = false,
) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${route}`, {
      method: 'GET',
      credentials: includeCredentials ? 'include' : 'same-origin',
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      // Throw the error message to display
      throw parsedJson.data;
    }
    // Return the user data from database
    return parsedJson.data.user;
  } catch (error: any) {
    throw (
      error.message || 'An unexpected error occurred. Please try again later.'
    );
  }
}
