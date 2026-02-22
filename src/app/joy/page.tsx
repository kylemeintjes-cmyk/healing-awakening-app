import Link from "next/link";
import { JoyConsole } from "@/components/joy-console";

export default function JoyPage() {
  return (
    <div className="container stack">
      <header className="top-nav">
        <div>
          <p className="pill">Joy OS</p>
          <h1 className="section-title">Joy-first growth engine.</h1>
        </div>
        <Link href="/">Home</Link>
      </header>
      <p className="subtle">
        Less pressure. More joy. Better momentum. Build a week that feels good and compounds.
      </p>
      <JoyConsole />
    </div>
  );
}
