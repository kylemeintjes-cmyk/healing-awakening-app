type LifeArea = "general" | "work" | "relationships" | "health" | "money" | "spiritual";

const LIFE_AREA_LENSES: Record<LifeArea, { coherenceQuestions: string[]; tarotArchetypes: string[] }> = {
  general: {
    coherenceQuestions: [
      "What part of your life feels most alive vs most draining?",
      "Where are you acting from fear rather than truth?",
      "What would integrity look like this week?",
    ],
    tarotArchetypes: ["Temperance", "The Hermit", "The Star"],
  },
  work: {
    coherenceQuestions: [
      "Does your work use your strongest gifts or mostly your coping strategies?",
      "Where are you overperforming to earn worth?",
      "What one contribution would create the highest real value this week?",
    ],
    tarotArchetypes: ["The Magician", "The Emperor", "Three of Pentacles"],
  },
  relationships: {
    coherenceQuestions: [
      "Where are your boundaries unclear?",
      "What relationship asks for direct truth right now?",
      "What pattern repeats when you abandon yourself to keep peace?",
    ],
    tarotArchetypes: ["Two of Cups", "Justice", "Strength"],
  },
  health: {
    coherenceQuestions: [
      "What body signal are you ignoring?",
      "Which daily habit restores the most stability?",
      "What can be removed to reduce load this week?",
    ],
    tarotArchetypes: ["Temperance", "Queen of Pentacles", "The Empress"],
  },
  money: {
    coherenceQuestions: [
      "Are your money choices aligned with long-term values?",
      "Where is scarcity fear driving short-term decisions?",
      "What one move would improve cashflow clarity this month?",
    ],
    tarotArchetypes: ["King of Pentacles", "Justice", "Wheel of Fortune"],
  },
  spiritual: {
    coherenceQuestions: [
      "What practices actually deepen presence instead of performance?",
      "Where are you seeking signs instead of taking aligned action?",
      "What vow or devotion needs renewal now?",
    ],
    tarotArchetypes: ["The High Priestess", "The Hierophant", "Judgement"],
  },
};

export function getMysticKnowledgePack(input: { lifeArea: LifeArea; sign?: string | null }) {
  const area = LIFE_AREA_LENSES[input.lifeArea] ?? LIFE_AREA_LENSES.general;
  return {
    lifeArea: input.lifeArea,
    sign: input.sign ?? "unknown",
    coherenceQuestions: area.coherenceQuestions,
    tarotArchetypes: area.tarotArchetypes,
  };
}
