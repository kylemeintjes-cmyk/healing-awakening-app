import { adminAuth } from "@/lib/firebaseAdmin";
import { NextRequest } from "next/server";

export async function requireUser(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const token = header.replace("Bearer ", "");
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: decoded.name ?? null,
    };
  } catch {
    return null;
  }
}
