"use client";

import * as React from "react";
import Link from "next/link";
import { LucideIcon, Clock, Layers, ArrowLeft, ShieldCheck, FileCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface ComingSoonModuleProps {
  moduleName: string;
  moduleCode: string;
  targetPhase: string;
  icon: LucideIcon;
  description: string;
  plannedFeatures: string[];
  schemaRef?: string;
}

export function ComingSoonModule({
  moduleName,
  moduleCode,
  targetPhase,
  icon: Icon,
  description,
  plannedFeatures,
  schemaRef,
}: ComingSoonModuleProps) {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{moduleName}</h1>
            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
              <Clock className="mr-1 h-3 w-3" />
              Coming in a later phase ({targetPhase})
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Roadmap & Architecture Card */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-dashed">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Module Architecture & Phased Rollout Notice
                </CardTitle>
                <CardDescription>
                  Status: Module Code <span className="font-mono text-xs">{moduleCode}</span> reserved in Master Build Plan
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-md bg-muted/40 p-4 border text-sm text-muted-foreground leading-relaxed">
              <p>
                In accordance with <strong>IT-HUB ERP Engineering Standards</strong>, this module is scheduled for implementation in <strong>{targetPhase}</strong>.
                Its route and navigation entries are provisioned to maintain architectural stability and navigation consistency, but interactive operational controls remain locked to prevent false or simulated state mutations.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Scheduled Capabilities for {targetPhase}
              </h4>
              <ul className="grid gap-2 sm:grid-cols-2 text-sm text-foreground">
                {plannedFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 rounded border bg-card/60 p-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Technical Specs & Documentation References */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Security & RBAC Contract
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2.5">
              <p>
                Role permissions for this module are governed by the IT-HUB ERP Master Permissions Matrix.
              </p>
              <div className="rounded bg-muted p-2 font-mono text-[11px] text-foreground">
                Permission: {moduleCode.toLowerCase()}:read, {moduleCode.toLowerCase()}:write
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileCode className="h-4 w-4 text-primary" />
                Database Schema Contract
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2.5">
              <p>
                Relational entity models and migrations have been drafted in the architecture specifications:
              </p>
              <div className="rounded bg-muted p-2 font-mono text-[11px] text-foreground">
                {schemaRef || "supabase/migrations/20261010000000_init_erp_schema.sql"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
