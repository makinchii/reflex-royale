import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function UiLabPage() {
  return (
    <main className="min-h-screen bg-[var(--gridcn-bg)] p-6 text-[var(--gridcn-text)]">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <Badge>UI Lab</Badge>
          <h1 className="text-3xl font-semibold tracking-tight">GridCN Compatibility Baseline</h1>
          <p className="text-sm text-[var(--gridcn-muted)]">This page is isolated from gameplay routes and is used to harden primitives before migration.</p>
        </header>

        <Card className="border-[var(--gridcn-border)] bg-[var(--gridcn-surface)]">
          <CardHeader>
            <CardTitle>Core Primitives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Room code" />
              <Input placeholder="Player name" />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
