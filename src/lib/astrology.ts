export type ZodiacSign =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces";

export type SignProfile = {
  sign: ZodiacSign;
  element: "Fire" | "Earth" | "Air" | "Water";
  modality: "Cardinal" | "Fixed" | "Mutable";
  ruler: string;
  coreTheme: string;
  gifts: string[];
  purposePaths: string[];
  shadows: string[];
  vocationThemes: string[];
  prompts: string[];
};

export const SIGN_PROFILES: Record<ZodiacSign, SignProfile> = {
  Aries: {
    sign: "Aries",
    element: "Fire",
    modality: "Cardinal",
    ruler: "Mars",
    coreTheme: "Initiation and courageous action",
    gifts: ["courage", "leadership", "rapid mobilization"],
    purposePaths: ["pioneering", "activism", "founding new initiatives"],
    shadows: ["impatience", "reactivity", "burnout through overdrive"],
    vocationThemes: ["entrepreneurship", "emergency response", "performance"],
    prompts: ["Where are you being called to initiate rather than wait?"],
  },
  Taurus: {
    sign: "Taurus",
    element: "Earth",
    modality: "Fixed",
    ruler: "Venus",
    coreTheme: "Stability, embodiment, and value creation",
    gifts: ["steadiness", "craft mastery", "resource building"],
    purposePaths: ["building sustainable systems", "healing through body and beauty", "financial grounding"],
    shadows: ["rigidity", "resistance to change", "comfort-stagnation"],
    vocationThemes: ["design", "finance", "somatic healing", "food/agriculture"],
    prompts: ["What are you meant to cultivate for the long term?"],
  },
  Gemini: {
    sign: "Gemini",
    element: "Air",
    modality: "Mutable",
    ruler: "Mercury",
    coreTheme: "Learning, translating, and connecting",
    gifts: ["communication", "pattern linking", "adaptive thinking"],
    purposePaths: ["teaching", "writing", "bridging different worlds"],
    shadows: ["scattered focus", "nervous overdrive", "surface-leveling"],
    vocationThemes: ["media", "education", "consulting", "community building"],
    prompts: ["What truth are you here to translate clearly?"],
  },
  Cancer: {
    sign: "Cancer",
    element: "Water",
    modality: "Cardinal",
    ruler: "Moon",
    coreTheme: "Care, protection, and emotional attunement",
    gifts: ["nurturing leadership", "emotional intelligence", "intuitive safeguarding"],
    purposePaths: ["holding healing spaces", "family systems restoration", "community care"],
    shadows: ["over-protection", "withdrawal", "mood-driven decisions"],
    vocationThemes: ["therapy", "caregiving", "hospitality", "education"],
    prompts: ["Where can your care become structure, not self-sacrifice?"],
  },
  Leo: {
    sign: "Leo",
    element: "Fire",
    modality: "Fixed",
    ruler: "Sun",
    coreTheme: "Creative radiance and heart-led expression",
    gifts: ["creative leadership", "inspiration", "confidence transmission"],
    purposePaths: ["performance", "leadership through example", "youth mentorship"],
    shadows: ["ego inflation", "approval dependence", "dramatic avoidance of vulnerability"],
    vocationThemes: ["arts", "leadership", "education", "brand/storytelling"],
    prompts: ["How can your visibility serve collective courage?"],
  },
  Virgo: {
    sign: "Virgo",
    element: "Earth",
    modality: "Mutable",
    ruler: "Mercury",
    coreTheme: "Refinement, service, and intelligent systems",
    gifts: ["analysis", "precision", "healing through practical order"],
    purposePaths: ["systems improvement", "healing professions", "quality stewardship"],
    shadows: ["perfectionism", "self-criticism", "over-functioning"],
    vocationThemes: ["health", "operations", "research", "editing"],
    prompts: ["What system are you here to heal through precision?"],
  },
  Libra: {
    sign: "Libra",
    element: "Air",
    modality: "Cardinal",
    ruler: "Venus",
    coreTheme: "Harmony, justice, and relational intelligence",
    gifts: ["mediation", "aesthetic balance", "fair-minded strategy"],
    purposePaths: ["conflict resolution", "justice work", "partnership creation"],
    shadows: ["people-pleasing", "indecision", "avoidance of necessary friction"],
    vocationThemes: ["law", "diplomacy", "design", "partnership leadership"],
    prompts: ["Where is your diplomacy meant to create real justice?"],
  },
  Scorpio: {
    sign: "Scorpio",
    element: "Water",
    modality: "Fixed",
    ruler: "Mars/Pluto",
    coreTheme: "Depth, transformation, and truth under pressure",
    gifts: ["psychological insight", "resilience", "transformational leadership"],
    purposePaths: ["trauma-informed work", "investigation", "shadow integration"],
    shadows: ["control patterns", "suspicion", "emotional extremity"],
    vocationThemes: ["psychology", "research", "strategy", "healing arts"],
    prompts: ["What are you here to transmute, not avoid?"],
  },
  Sagittarius: {
    sign: "Sagittarius",
    element: "Fire",
    modality: "Mutable",
    ruler: "Jupiter",
    coreTheme: "Meaning, exploration, and vision transmission",
    gifts: ["big-picture synthesis", "teaching wisdom", "optimistic expansion"],
    purposePaths: ["teaching/philosophy", "cross-cultural bridgework", "vision leadership"],
    shadows: ["dogmatism", "restlessness", "overpromising"],
    vocationThemes: ["education", "travel", "publishing", "coaching"],
    prompts: ["What truth are you here to embody and teach?"],
  },
  Capricorn: {
    sign: "Capricorn",
    element: "Earth",
    modality: "Cardinal",
    ruler: "Saturn",
    coreTheme: "Mastery, responsibility, and enduring impact",
    gifts: ["discipline", "strategic building", "long-term leadership"],
    purposePaths: ["institution building", "legacy work", "ethical authority"],
    shadows: ["workaholism", "emotional suppression", "fear of failure"],
    vocationThemes: ["leadership", "policy", "operations", "architecture"],
    prompts: ["What structure are you here to build for future generations?"],
  },
  Aquarius: {
    sign: "Aquarius",
    element: "Air",
    modality: "Fixed",
    ruler: "Saturn/Uranus",
    coreTheme: "Innovation, systems change, and collective evolution",
    gifts: ["future vision", "systems redesign", "community innovation"],
    purposePaths: ["social innovation", "technology for good", "movement strategy"],
    shadows: ["detachment", "contrarianism", "disconnection from embodiment"],
    vocationThemes: ["technology", "organizing", "policy innovation", "network leadership"],
    prompts: ["What future are you here to prototype now?"],
  },
  Pisces: {
    sign: "Pisces",
    element: "Water",
    modality: "Mutable",
    ruler: "Jupiter/Neptune",
    coreTheme: "Compassion, imagination, and spiritual synthesis",
    gifts: ["empathic perception", "symbolic intelligence", "healing imagination"],
    purposePaths: ["spiritual care", "creative healing", "meaning-making in suffering"],
    shadows: ["boundary diffusion", "escapism", "martyr patterns"],
    vocationThemes: ["healing arts", "music/film", "spiritual mentoring", "nonprofit service"],
    prompts: ["How can your sensitivity become service with boundaries?"],
  },
};

export function getSignProfile(sign: string | null | undefined): SignProfile | null {
  if (!sign) return null;
  return SIGN_PROFILES[sign as ZodiacSign] ?? null;
}
