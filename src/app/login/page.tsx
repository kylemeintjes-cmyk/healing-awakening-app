"use client";

import React from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebaseClient";

export default function LoginPage() {
  const [error, setError] = React.useState("");

  async function handleGoogle() {
    setError("");
    try {
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
    } catch (err) {
      setError("Google sign-in failed. Check your Firebase settings.");
    }
  }

  return (
    <div className="container">
      <header className="top-nav">
        <div>
          <p className="pill">Sign in</p>
          <h1 className="section-title">Continue with Google</h1>
        </div>
        <a href="/">Back</a>
      </header>

      <div className="divider" />

      <section className="card stack">
        <p className="subtle">
          Sign in to save your healing plan, check-ins, and journal.
        </p>
        <button className="cta" onClick={handleGoogle}>
          Continue with Google
        </button>
        <p className="subtle text-sm">
          Apple sign-in can be enabled later.
        </p>
        {error && <p className="subtle text-sm">{error}</p>}
      </section>
    </div>
  );
}
