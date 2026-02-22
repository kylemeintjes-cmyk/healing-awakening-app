"use client";

import { OracleConsole } from "@/components/oracle-console";

export default function OraclePage() {
  return (
    <div className="container">
      <header className="top-nav">
        <div>
          <p className="pill">Mystical AI Oracle</p>
          <h1 className="section-title">Ask your local model directly</h1>
        </div>
        <a href="/">Back</a>
      </header>

      <div className="divider" />

      <OracleConsole surface="oracle_page" />
    </div>
  );
}
