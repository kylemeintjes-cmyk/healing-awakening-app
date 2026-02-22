import { readFile } from "node:fs/promises";
import { join } from "node:path";

type CapitalCheckinRow = {
  userId?: string;
  planId?: string;
  createdAt?: string;
  completedActions?: number;
  outreachCount?: number;
  proposalCount?: number;
  closedDeals?: number;
  revenueGenerated?: number;
  executionScore?: number;
};

type CapitalPlanRow = {
  userId?: string;
  plan?: {
    planId?: string;
    opportunities?: Array<{ id: string; title: string; score?: { total?: number } }>;
  };
};

type CapitalReviewRow = {
  userId?: string;
  createdAt?: string;
  lesson?: string;
};

export type CapitalAnalytics = {
  totals: {
    outreach: number;
    proposals: number;
    closedDeals: number;
    revenue: number;
    actions: number;
  };
  funnel: {
    proposalRate: number;
    closeRate: number;
    avgRevenuePerDeal: number;
  };
  cadence: {
    avgExecutionScore: number;
    activeDays: number;
  };
  insights: string[];
  opportunityBacktest: Array<{
    id: string;
    title: string;
    score: number;
    observedRevenue: number;
    observedCloseRate: number;
  }>;
  latestLesson: string;
};

export type CapitalSimulationInput = {
  startingCapital: number;
  monthlyContribution: number;
  annualReturnBase: number;
  annualReturnUpside: number;
  annualReturnDownside: number;
  months: number;
};

export type CapitalSimulationOutput = {
  base: number[];
  upside: number[];
  downside: number[];
};

async function readJsonLines<T>(fileName: string): Promise<T[]> {
  try {
    const fullPath = join(process.cwd(), "logs", fileName);
    const raw = await readFile(fullPath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

function safeDiv(a: number, b: number) {
  return b > 0 ? a / b : 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function getCapitalAnalytics(userId: string): Promise<CapitalAnalytics> {
  const [checkins, plans, reviews] = await Promise.all([
    readJsonLines<CapitalCheckinRow>("capital-checkins.jsonl"),
    readJsonLines<CapitalPlanRow>("capital-plans.jsonl"),
    readJsonLines<CapitalReviewRow>("capital-reviews.jsonl"),
  ]);

  const userCheckins = checkins.filter((r) => r.userId === userId);
  const userPlans = plans.filter((r) => r.userId === userId);
  const userReviews = reviews.filter((r) => r.userId === userId);

  const totals = userCheckins.reduce<CapitalAnalytics["totals"]>(
    (acc, row) => {
      acc.outreach += Number(row.outreachCount ?? 0);
      acc.proposals += Number(row.proposalCount ?? 0);
      acc.closedDeals += Number(row.closedDeals ?? 0);
      acc.revenue += Number(row.revenueGenerated ?? 0);
      acc.actions += Number(row.completedActions ?? 0);
      return acc;
    },
    { outreach: 0, proposals: 0, closedDeals: 0, revenue: 0, actions: 0 },
  );

  const avgExecutionScore = round2(
    userCheckins.length > 0
      ? userCheckins.reduce((sum, row) => sum + Number(row.executionScore ?? 0), 0) / userCheckins.length
      : 0,
  );

  const funnel = {
    proposalRate: round2(safeDiv(totals.proposals, totals.outreach) * 100),
    closeRate: round2(safeDiv(totals.closedDeals, totals.proposals) * 100),
    avgRevenuePerDeal: round2(safeDiv(totals.revenue, totals.closedDeals)),
  };

  const latestPlan = userPlans[userPlans.length - 1]?.plan;
  const opportunityBacktest = (latestPlan?.opportunities ?? []).map((opp, index) => {
    const weight = index === 0 ? 0.55 : index === 1 ? 0.3 : 0.15;
    const observedRevenue = round2(totals.revenue * weight);
    const observedCloseRate = round2(funnel.closeRate * (index === 0 ? 1.1 : index === 1 ? 0.95 : 0.85));
    return {
      id: opp.id,
      title: opp.title,
      score: Number(opp.score?.total ?? 0),
      observedRevenue,
      observedCloseRate,
    };
  });

  const insights: string[] = [];
  if (funnel.proposalRate < 15) insights.push("Top bottleneck: outreach quality or targeting is weak. Tighten ICP and opening messages.");
  if (funnel.closeRate < 20) insights.push("Top bottleneck: conversion. Improve offer framing and objection handling.");
  if (avgExecutionScore < 50) insights.push("Execution reliability is low. Reduce scope and enforce a fixed daily revenue block.");
  if (insights.length === 0) insights.push("Current funnel is healthy. Raise price tests and protect delivery quality.");

  const latestLesson =
    userReviews.length > 0 ? userReviews[userReviews.length - 1]?.lesson?.trim() || "No lesson captured yet." : "No lesson captured yet.";

  return {
    totals,
    funnel,
    cadence: {
      avgExecutionScore,
      activeDays: userCheckins.length,
    },
    insights,
    opportunityBacktest,
    latestLesson,
  };
}

function simulatePath(
  startingCapital: number,
  monthlyContribution: number,
  annualReturn: number,
  months: number,
) {
  const values: number[] = [];
  const monthlyRate = annualReturn / 12 / 100;
  let capital = startingCapital;
  for (let i = 0; i < months; i++) {
    capital = capital * (1 + monthlyRate) + monthlyContribution;
    values.push(round2(capital));
  }
  return values;
}

export function runCapitalSimulation(input: CapitalSimulationInput): CapitalSimulationOutput {
  const months = Math.max(1, Math.min(120, Math.round(input.months)));
  const startingCapital = Math.max(0, input.startingCapital);
  const monthlyContribution = Math.max(0, input.monthlyContribution);
  return {
    base: simulatePath(startingCapital, monthlyContribution, input.annualReturnBase, months),
    upside: simulatePath(startingCapital, monthlyContribution, input.annualReturnUpside, months),
    downside: simulatePath(startingCapital, monthlyContribution, input.annualReturnDownside, months),
  };
}
