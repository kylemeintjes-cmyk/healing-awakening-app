import Link from "next/link";
import { CapitalConsole } from "@/components/capital-console";

export default function CapitalPage() {
  return (
    <div className="container stack">
      <header className="stack">
        <p className="pill">Capital OS</p>
        <h1 className="section-title">Skill-to-capital compounding engine.</h1>
        <p className="subtle">
          Detect blockers, rank opportunities, execute daily, and adapt weekly.
        </p>
        <div>
          <Link className="ghost" href="/joy">
            Open Joy OS
          </Link>
        </div>
      </header>
      <CapitalConsole />
    </div>
  );
}
