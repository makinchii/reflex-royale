"use client";

import * as React from "react";
import "@/components/thegridcn-intensity.css";
import { Badge } from "@/components/thegridcn/badge";
import { Button } from "@/components/thegridcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/thegridcn/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/thegridcn/dialog";
import { Dropdown } from "@/components/thegridcn/dropdown";
import { Input } from "@/components/thegridcn/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/thegridcn/table";
import { ToastProvider, useToast } from "@/components/thegridcn/toast";

function UiLabInner() {
  const { addToast } = useToast();
  const [roomName, setRoomName] = React.useState("Grid Room Alpha");

  const sampleRows = [
    { node: "GRID-01", status: "Online", latency: "8ms" },
    { node: "GRID-02", status: "Online", latency: "11ms" },
    { node: "GRID-03", status: "Warning", latency: "43ms" }
  ];

  return (
    <main className="ui-lab" data-theme="tron">
      <div className="ui-lab-shell">
        <header>
          <div className="ui-css-sentinel" role="status">
            CSS pipeline loaded
          </div>
          <Badge variant="secondary">UI Lab</Badge>
          <h1>GridCN Compatibility Baseline</h1>
          <p>This page is isolated from gameplay routes and is used to harden primitives before migration.</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Core Primitives</CardTitle>
            <CardDescription>Direct GridCN component source only.</CardDescription>
          </CardHeader>
          <CardContent className="ui-lab-row" style={{ display: "grid", gap: 16 }}>
            <div className="ui-lab-row">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>

              <Dropdown
                align="left"
                items={[
                  {
                    label: "Copy room link",
                    shortcut: "CMD+C",
                    onSelect: () => addToast({ title: "Room copied", description: "Invite link copied", variant: "success" })
                  },
                  {
                    label: "Sync players",
                    onSelect: () => addToast({ title: "Sync started", description: "Live sync enabled", variant: "info" })
                  },
                  { separator: true, label: "separator" },
                  {
                    label: "Close room",
                    variant: "danger",
                    onSelect: () => addToast({ title: "Room closed", description: "All players disconnected", variant: "error" })
                  }
                ]}
              >
                <Button variant="outline">Menu</Button>
              </Dropdown>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Room Settings</DialogTitle>
                    <DialogDescription>Adjust a sample room setting to validate modal behavior.</DialogDescription>
                  </DialogHeader>
                  <Input value={roomName} onChange={(event) => setRoomName(event.target.value)} />
                  <DialogFooter>
                    <Button onClick={() => addToast({ title: "Saved", description: `Room name set to ${roomName}`, variant: "success" })}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="ui-lab-grid">
              <Input placeholder="Room code" />
              <Input placeholder="Player name" />
            </div>

            <Table>
              <TableCaption>Sample telemetry table (Batch B primitive validation).</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Node</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleRows.map((row) => (
                  <TableRow key={row.node}>
                    <TableCell>{row.node}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.latency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="ui-lab-grid">
              <Card>
                <CardHeader>
                  <CardTitle>Node Telemetry</CardTitle>
                  <CardDescription>GridCN component composition</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Zone</span>
                    <span className="font-mono">TRON-SECTOR-7</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sync</span>
                    <Badge>98.4%</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Signal</span>
                    <span className="font-mono">Stable</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Room Health</CardTitle>
                  <CardDescription>GridCN component composition</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Latency</span>
                    <Badge variant="destructive">43ms</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Packet Loss</span>
                    <span className="font-mono">0.7%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rejoins</span>
                    <span className="font-mono">1</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="ui-lab-row">
              <Button onClick={() => addToast({ title: "Connected", description: "Live room sync active", variant: "success" })}>Success Toast</Button>
              <Button variant="outline" onClick={() => addToast({ title: "Heads up", description: "A player reconnected", variant: "warning" })}>Warning Toast</Button>
              <Button variant="ghost" onClick={() => addToast({ title: "Error", description: "Socket timeout", variant: "error" })}>Error Toast</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function UiLabPage() {
  return (
    <ToastProvider>
      <UiLabInner />
    </ToastProvider>
  );
}
