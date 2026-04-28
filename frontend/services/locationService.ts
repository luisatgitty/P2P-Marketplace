export interface LocationOption {
  code: string;
  name: string;
}

async function fetchLocations(route: string): Promise<LocationOption[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${route}`, {
      method: 'GET',
      credentials: 'include',
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to fetch location data.';
    }

    return (parsedJson.data ?? []) as LocationOption[];
  } catch {
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export function getProvinces(): Promise<LocationOption[]> {
  return fetchLocations('/locations/provinces');
}

export function getCitiesByProvince(
  provinceCode: string,
): Promise<LocationOption[]> {
  return fetchLocations(
    `/locations/cities?provinceCode=${encodeURIComponent(provinceCode)}`,
  );
}

export function getBarangaysByCity(
  cityCode: string,
): Promise<LocationOption[]> {
  return fetchLocations(
    `/locations/barangays?cityCode=${encodeURIComponent(cityCode)}`,
  );
}
