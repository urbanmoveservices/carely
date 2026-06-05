import prisma from "@/lib/prisma";

export type LocationContext = {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  regionHint?: string;
};

export async function loadUserLocationContext(userId: string): Promise<LocationContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { city: true, state: true, country: true, pincode: true },
  });
  if (!user?.city && !user?.state) return null;
  const regionHint = [user.city, user.state, user.country || "India"]
    .filter(Boolean)
    .join(", ");
  return {
    city: user.city,
    state: user.state,
    country: user.country,
    pincode: user.pincode,
    regionHint,
  };
}

export function formatLocationForPrompt(loc: LocationContext | null): string {
  if (!loc?.regionHint) {
    return "Location: not provided. Use general Indian seasonal-safe advice only; do not invent city or weather.";
  }
  return `Location (user profile): ${loc.regionHint}. Use for regional Indian diet hints only; do not invent weather data.`;
}
