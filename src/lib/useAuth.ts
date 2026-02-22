import React from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebaseClient";

export function useAuthUser() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
