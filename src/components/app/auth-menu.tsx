"use client";

import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/thegridcn/button";
import type { AppAuthUser } from "@/lib/auth";

export async function performLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
}

export function AuthMenu({ user }: { user: AppAuthUser | null }) {
  const router = useRouter();

  if (!user) {
    return (
      <Button asChild variant="outline" className="gap-2 border-primary/30 bg-card/70 font-mono uppercase tracking-[0.18em] text-primary hover:bg-primary/10">
        <a href="/login?next=/dashboard" aria-label="Log in">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_color-mix(in_oklch,var(--glow)_80%,transparent)]" />
          Guest
          <LogIn className="h-4 w-4" />
        </a>
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" className="gap-2 border-primary/35 bg-card/75 font-mono uppercase tracking-[0.18em] text-primary hover:bg-primary/10" onClick={() => router.push("/dashboard")}>
      <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_color-mix(in_oklch,var(--glow)_80%,transparent)]" />
      <span className="max-w-32 truncate">{user.username}</span>
    </Button>
  );
}
