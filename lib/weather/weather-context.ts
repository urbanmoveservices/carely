export type WeatherContext = {
  city?: string;
  state?: string;
  temperatureCategory?: "hot" | "mild" | "cold";
  rainOrMonsoon?: boolean;
  pollutionHigh?: boolean;
  humidityHigh?: boolean;
  source: "api" | "none";
};

export function isWeatherEnabled(): boolean {
  return process.env.WEATHER_ENABLED === "true" && Boolean(process.env.WEATHER_API_KEY?.trim());
}

/** No external API call when disabled — returns null so prompts do not invent weather. */
export async function loadWeatherContext(_params: {
  city?: string | null;
  state?: string | null;
}): Promise<WeatherContext | null> {
  if (!isWeatherEnabled()) return null;
  // Provider integration placeholder — only when WEATHER_ENABLED=true
  return null;
}

export function formatWeatherForPrompt(weather: WeatherContext | null): string {
  if (!weather || weather.source === "none") {
    return "Weather: not available. Do not invent temperature, rain, or pollution. Use generic Indian seasonal-safe exercise advice.";
  }
  const parts: string[] = [];
  if (weather.temperatureCategory) parts.push(`temperature: ${weather.temperatureCategory}`);
  if (weather.rainOrMonsoon) parts.push("monsoon/rain likely");
  if (weather.pollutionHigh) parts.push("high pollution — prefer indoor activity");
  if (weather.humidityHigh) parts.push("high humidity");
  return `Weather context (${weather.city || "area"}): ${parts.join("; ")}. Adapt exercise safely; do not invent details beyond this.`;
}

export function seasonalExerciseHints(weather: WeatherContext | null): string[] {
  if (!weather) {
    return [
      "Walk or light activity in cooler morning/evening hours when heat is common in India.",
      "Indoor yoga, mobility, or stair climbing if outdoor conditions are uncomfortable.",
    ];
  }
  const hints: string[] = [];
  if (weather.temperatureCategory === "hot") {
    hints.push("Prefer early-morning or evening walks; hydrate well; avoid midday outdoor exertion.");
  }
  if (weather.rainOrMonsoon) {
    hints.push("Monsoon: indoor walking, yoga, or light strength at home if outdoors is slippery.");
  }
  if (weather.pollutionHigh) {
    hints.push("High pollution: choose indoor activity; avoid heavy outdoor cardio until air improves.");
  }
  if (weather.temperatureCategory === "cold") {
    hints.push("Warm up longer before exercise; indoor mobility if very cold mornings.");
  }
  return hints.slice(0, 3);
}
