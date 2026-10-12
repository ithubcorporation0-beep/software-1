import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLayout } from "@/components/layout/content-layout";
import { ProjectsClient } from "./projects-client";
import { getProjects, getTasks } from "@/lib/projects/server";
import { getCustomers } from "@/lib/crm/server";
import { getHREmployees } from "@/lib/hr/server";
import { getCompanySettings } from "@/lib/company/server";
import { getCurrentUser } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function ProjectsPage() {
  const companyId = DEFAULT_COMPANY_ID;
  let currentUser: any = null;

  try {
    currentUser = await getCurrentUser();
  } catch {
    // Falls back
  }

  const [projects, tasks, customerResult, employees, companySettings] = await Promise.all([
    getProjects(companyId, {}, currentUser || undefined).catch(() => []),
    getTasks(companyId, {}, currentUser || undefined).catch(() => []),
    getCustomers(companyId).catch(() => ({ data: [] })),
    getHREmployees(companyId, {}, currentUser || undefined).catch(() => []),
    getCompanySettings(companyId).catch(() => ({ currency: "PKR" })),
  ]);

  return (
    <ContentLayout>
      <PageHeader
        title="Projects & PMO Portfolio"
        description="Strategic capital initiatives, interactive Kanban workflow boards, milestones, and deliverable tracking."
        breadcrumbs={[{ label: "Projects & PMO" }]}
      />

      <ProjectsClient
        companyId={companyId}
        currency={companySettings.currency || "PKR"}
        initialProjects={projects}
        initialTasks={tasks}
        customers={customerResult.data || []}
        employees={employees}
      />
    </ContentLayout>
  );
}
