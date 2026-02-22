import Link from "next/link";
import { HumanConsole } from "@/components/human-console";

export default function HumanPage() {
  return (
    <div className="container stack">
      <header className="top-nav">
        <div>
          <p className="pill">Human OS</p>
          <h1 className="section-title">Personal Operating System for humans.</h1>
        </div>
        <Link href="/">Home</Link>
      </header>
      <p className="subtle">
        Measure what matters daily, diagnose bottlenecks, and align decisions with execution and wellbeing.
      </p>
      <HumanConsole />
    </div>
  );
}
