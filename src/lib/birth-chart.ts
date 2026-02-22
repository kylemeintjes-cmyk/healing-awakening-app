import { Horoscope, Origin } from "circular-natal-horoscope-js";

export type MysticalProfileInput = {
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  birthLatitude?: number | null;
  birthLongitude?: number | null;
};

export type NatalBody = {
  key: string;
  sign: string;
  house: number | null;
  retrograde: boolean;
  longitude: number;
};

export type NatalAspect = {
  point1: string;
  point2: string;
  type: string;
  orb: number;
};

export type PurposePathSummary = {
  vocationLane: string;
  serviceLane: string;
  spiritualLane: string;
};

export type TransitInfluence = {
  transitBody: string;
  natalPoint: string;
  aspect: string;
  orb: number;
  interpretation: string;
  action: string;
};

export type NatalChartSummary = {
  sunSign: string;
  moonSign: string;
  ascendantSign: string;
  midheavenSign: string;
  houseSystem: string;
  zodiac: string;
  bodies: NatalBody[];
  aspects: NatalAspect[];
  dominantElement: string;
  purposePath: PurposePathSummary;
  coordinates: { latitude: number; longitude: number };
};

export type TransitSummary = {
  generatedAt: string;
  influences: TransitInfluence[];
};

const CITY_COORDS: Array<{ key: string; latitude: number; longitude: number }> = [
  { key: "cape town", latitude: -33.9249, longitude: 18.4241 },
  { key: "johannesburg", latitude: -26.2041, longitude: 28.0473 },
  { key: "durban", latitude: -29.8587, longitude: 31.0218 },
  { key: "london", latitude: 51.5074, longitude: -0.1278 },
  { key: "new york", latitude: 40.7128, longitude: -74.006 },
  { key: "los angeles", latitude: 34.0522, longitude: -118.2437 },
  { key: "san francisco", latitude: 37.7749, longitude: -122.4194 },
  { key: "chicago", latitude: 41.8781, longitude: -87.6298 },
  { key: "toronto", latitude: 43.6532, longitude: -79.3832 },
  { key: "vancouver", latitude: 49.2827, longitude: -123.1207 },
  { key: "paris", latitude: 48.8566, longitude: 2.3522 },
  { key: "berlin", latitude: 52.52, longitude: 13.405 },
  { key: "rome", latitude: 41.9028, longitude: 12.4964 },
  { key: "madrid", latitude: 40.4168, longitude: -3.7038 },
  { key: "lisbon", latitude: 38.7223, longitude: -9.1393 },
  { key: "amsterdam", latitude: 52.3676, longitude: 4.9041 },
  { key: "dubai", latitude: 25.2048, longitude: 55.2708 },
  { key: "mumbai", latitude: 19.076, longitude: 72.8777 },
  { key: "delhi", latitude: 28.6139, longitude: 77.209 },
  { key: "singapore", latitude: 1.3521, longitude: 103.8198 },
  { key: "hong kong", latitude: 22.3193, longitude: 114.1694 },
  { key: "tokyo", latitude: 35.6762, longitude: 139.6503 },
  { key: "sydney", latitude: -33.8688, longitude: 151.2093 },
  { key: "melbourne", latitude: -37.8136, longitude: 144.9631 },
  { key: "auckland", latitude: -36.8509, longitude: 174.7645 },
];

const BODY_KEYS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const;

function parseBirthDate(dateText?: string) {
  if (!dateText) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText.trim());
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseBirthTime(timeText?: string) {
  if (!timeText) return null;
  const raw = timeText.trim().toLowerCase();
  const twelveHour = /^(\d{1,2}):(\d{2})\s*(am|pm)$/.exec(raw);
  if (twelveHour) {
    let hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2]);
    const meridiem = twelveHour[3];
    if (minute < 0 || minute > 59 || hour < 1 || hour > 12) return null;
    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    return { hour, minute };
  }
  const twentyFour = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (twentyFour) {
    const hour = Number(twentyFour[1]);
    const minute = Number(twentyFour[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute };
  }
  return null;
}

function parseCoordinatesFromPlace(place?: string) {
  if (!place) return null;
  const direct = /^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/.exec(place);
  if (direct) {
    return {
      latitude: Number(direct[1]),
      longitude: Number(direct[3]),
    };
  }
  const normalized = place.toLowerCase();
  const hit = CITY_COORDS.find((entry) => normalized.includes(entry.key));
  if (!hit) return null;
  return { latitude: hit.latitude, longitude: hit.longitude };
}

function elementFromSign(sign: string) {
  const fire = ["Aries", "Leo", "Sagittarius"];
  const earth = ["Taurus", "Virgo", "Capricorn"];
  const air = ["Gemini", "Libra", "Aquarius"];
  if (fire.includes(sign)) return "Fire";
  if (earth.includes(sign)) return "Earth";
  if (air.includes(sign)) return "Air";
  return "Water";
}

function signToWorkTheme(sign: string) {
  const map: Record<string, string> = {
    Aries: "initiate and lead",
    Taurus: "build stable value",
    Gemini: "communicate and teach",
    Cancer: "care and protect",
    Leo: "create and inspire",
    Virgo: "refine and heal systems",
    Libra: "mediate and harmonize",
    Scorpio: "transform and investigate",
    Sagittarius: "teach meaning and vision",
    Capricorn: "structure and steward legacy",
    Aquarius: "innovate collective systems",
    Pisces: "heal through compassion and imagination",
  };
  return map[sign] ?? "serve with integrity";
}

function resolveBirthInputs(profile: MysticalProfileInput) {
  const missing: string[] = [];
  const parsedDate = parseBirthDate(profile.birthDate);
  const parsedTime = parseBirthTime(profile.birthTime);
  const coords =
    profile.birthLatitude != null && profile.birthLongitude != null
      ? { latitude: profile.birthLatitude, longitude: profile.birthLongitude }
      : parseCoordinatesFromPlace(profile.birthPlace);

  if (!parsedDate) missing.push("birthDate(YYYY-MM-DD)");
  if (!parsedTime) missing.push("birthTime(HH:MM or 12:04pm)");
  if (!coords) missing.push("birthPlace or coordinates(lat,lon)");

  return { parsedDate, parsedTime, coords, missing };
}

function makeHoroscope(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
}) {
  const origin = new Origin({
    year: input.year,
    month: input.month - 1,
    date: input.day,
    hour: input.hour,
    minute: input.minute,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  return new Horoscope({
    origin,
    houseSystem: "placidus",
    zodiac: "tropical",
    aspectPoints: ["bodies", "angles"],
    aspectWithPoints: ["bodies", "angles"],
    aspectTypes: ["major"],
    language: "en",
  });
}

function angleDistance(a: number, b: number) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function detectMajorAspect(diff: number) {
  const candidates = [
    { name: "conjunction", deg: 0 },
    { name: "sextile", deg: 60 },
    { name: "square", deg: 90 },
    { name: "trine", deg: 120 },
    { name: "opposition", deg: 180 },
  ];
  const orbLimit = 3.0;
  for (const c of candidates) {
    const orb = Math.abs(diff - c.deg);
    if (orb <= orbLimit) {
      return { aspect: c.name, orb };
    }
  }
  return null;
}

function transitInterpretation(aspect: string, transitBody: string, natalPoint: string) {
  const core = `${transitBody} ${aspect} natal ${natalPoint}`;
  if (aspect === "conjunction") {
    return {
      interpretation: `${core}: a high-intensity activation window.`,
      action: "Choose one clear intention for the next 7 days and commit daily action.",
    };
  }
  if (aspect === "square") {
    return {
      interpretation: `${core}: pressure to rework outdated patterns.`,
      action: "Identify one friction point and redesign your process instead of forcing outcomes.",
    };
  }
  if (aspect === "trine") {
    return {
      interpretation: `${core}: supportive flow and momentum available.`,
      action: "Leverage this ease by shipping a meaningful step this week.",
    };
  }
  if (aspect === "opposition") {
    return {
      interpretation: `${core}: relationship or polarity themes are highlighted.`,
      action: "Balance both sides of the polarity before making irreversible decisions.",
    };
  }
  return {
    interpretation: `${core}: subtle opening for strategic adjustment.`,
    action: "Take one small experiment and observe emotional + practical feedback.",
  };
}

export function computeNatalChart(profile: MysticalProfileInput): {
  chart: NatalChartSummary | null;
  missing: string[];
  error?: string;
} {
  const { parsedDate, parsedTime, coords, missing } = resolveBirthInputs(profile);

  if (missing.length > 0) {
    return { chart: null, missing };
  }

  try {
    const horoscope = makeHoroscope({
      year: parsedDate!.year,
      month: parsedDate!.month,
      day: parsedDate!.day,
      hour: parsedTime!.hour,
      minute: parsedTime!.minute,
      latitude: coords!.latitude,
      longitude: coords!.longitude,
    });

    const bodies = BODY_KEYS.map((key) => {
      const b = horoscope.CelestialBodies[key];
      const sign = b?.Sign?.label ?? "Unknown";
      const house = typeof b?.House?.id === "number" ? b.House.id : null;
      const longitude = Number(b?.ChartPosition?.Ecliptic?.DecimalDegrees ?? 0);
      return {
        key,
        sign,
        house,
        retrograde: Boolean(b?.isRetrograde),
        longitude,
      };
    });

    const aspects = (horoscope.Aspects?.all ?? [])
      .map((a: any) => ({
        point1: a?.point1Label ?? a?.point1Key ?? "Unknown",
        point2: a?.point2Label ?? a?.point2Key ?? "Unknown",
        type: a?.label ?? a?.aspectKey ?? "Unknown",
        orb: Number(a?.orb ?? 0),
      }))
      .filter((a: NatalAspect) => Number.isFinite(a.orb))
      .sort((a: NatalAspect, b: NatalAspect) => a.orb - b.orb)
      .slice(0, 8);

    const elementCounts = bodies.reduce(
      (acc, b) => {
        const el = elementFromSign(b.sign);
        acc[el] += 1;
        return acc;
      },
      { Fire: 0, Earth: 0, Air: 0, Water: 0 },
    );
    const dominantElement = (Object.entries(elementCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "Water") as string;

    const house2Sign = horoscope.Houses?.[1]?.Sign?.label ?? "Unknown";
    const house6Sign = horoscope.Houses?.[5]?.Sign?.label ?? "Unknown";
    const house10Sign = horoscope.Houses?.[9]?.Sign?.label ?? "Unknown";

    const purposePath: PurposePathSummary = {
      vocationLane: `10th house ${house10Sign}: ${signToWorkTheme(house10Sign)}.`,
      serviceLane: `6th house ${house6Sign}: ${signToWorkTheme(house6Sign)}.`,
      spiritualLane: `2nd house ${house2Sign}: build values and self-worth through ${signToWorkTheme(house2Sign)}.`,
    };

    const chart: NatalChartSummary = {
      sunSign: horoscope.CelestialBodies?.sun?.Sign?.label ?? "Unknown",
      moonSign: horoscope.CelestialBodies?.moon?.Sign?.label ?? "Unknown",
      ascendantSign: horoscope.Ascendant?.Sign?.label ?? "Unknown",
      midheavenSign: horoscope.Midheaven?.Sign?.label ?? "Unknown",
      houseSystem: "placidus",
      zodiac: "tropical",
      bodies,
      aspects,
      dominantElement,
      purposePath,
      coordinates: coords!,
    };

    return { chart, missing: [] };
  } catch (error) {
    return {
      chart: null,
      missing: [],
      error: error instanceof Error ? error.message : "Unknown chart calculation error",
    };
  }
}

export function computeCurrentTransits(profile: MysticalProfileInput, natalChart: NatalChartSummary | null): {
  transits: TransitSummary | null;
  error?: string;
} {
  if (!natalChart) return { transits: null };

  const { coords } = resolveBirthInputs(profile);
  if (!coords) {
    return { transits: null, error: "Missing coordinates for transit calculations." };
  }

  try {
    const now = new Date();
    const transitHoroscope = makeHoroscope({
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    const transitBodies = ["jupiter", "saturn", "uranus", "neptune", "pluto", "mars"] as const;

    const natalPoints = [
      ...natalChart.bodies
        .filter((b) => ["sun", "moon", "mercury", "venus", "mars", "ascendantSign", "midheavenSign"].includes(b.key))
        .map((b) => ({ key: b.key, longitude: b.longitude })),
    ];

    const influences: TransitInfluence[] = [];

    for (const transitKey of transitBodies) {
      const tBody = transitHoroscope.CelestialBodies[transitKey];
      const tLon = Number(tBody?.ChartPosition?.Ecliptic?.DecimalDegrees ?? NaN);
      if (!Number.isFinite(tLon)) continue;

      for (const natal of natalPoints) {
        const diff = angleDistance(tLon, natal.longitude);
        const aspect = detectMajorAspect(diff);
        if (!aspect) continue;
        const details = transitInterpretation(aspect.aspect, transitKey, natal.key);
        influences.push({
          transitBody: transitKey,
          natalPoint: natal.key,
          aspect: aspect.aspect,
          orb: Number(aspect.orb.toFixed(2)),
          interpretation: details.interpretation,
          action: details.action,
        });
      }
    }

    const sorted = influences.sort((a, b) => a.orb - b.orb).slice(0, 5);

    return {
      transits: {
        generatedAt: new Date().toISOString(),
        influences: sorted,
      },
    };
  } catch (error) {
    return {
      transits: null,
      error: error instanceof Error ? error.message : "Unknown transit calculation error",
    };
  }
}
