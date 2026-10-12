import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireUser } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit/server";
import type {
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
  TaskPriority,
  Profile,
} from "@/types/database.types";

// ============================================================================
// CUSTOM PROJECT & TASK ERRORS
// ============================================================================

export class ProjectNotFoundError extends Error {
  constructor(message: string = "Project not found") {
    super(message);
    this.name = "ProjectNotFoundError";
  }
}

export class TaskNotFoundError extends Error {
  constructor(message: string = "Task not found") {
    super(message);
    this.name = "TaskNotFoundError";
  }
}

// ============================================================================
// RESILIENT IN-MEMORY STORE (FOR TESTING & RPC FALLBACK)
// ============================================================================

interface MemoryProjectStore {
  projects: Project[];
  tasks: Task[];
  sequences: Record<string, number>;
}

export const memoryProjectStore: MemoryProjectStore = {
  projects: [],
  tasks: [],
  sequences: {},
};

export function resetMemoryProjectStore(): void {
  memoryProjectStore.projects = [];
  memoryProjectStore.tasks = [];
  memoryProjectStore.sequences = {};
}

export function getNextProjectNumber(companyId: string): string {
  const key = `${companyId}:PRJ`;
  if (!memoryProjectStore.sequences[key]) {
    memoryProjectStore.sequences[key] = 100;
  }
  memoryProjectStore.sequences[key] += 1;
  return `PRJ-${memoryProjectStore.sequences[key]}`;
}

export function getNextTaskNumber(companyId: string): string {
  const key = `${companyId}:TSK`;
  if (!memoryProjectStore.sequences[key]) {
    memoryProjectStore.sequences[key] = 1000;
  }
  memoryProjectStore.sequences[key] += 1;
  return `TSK-${memoryProjectStore.sequences[key]}`;
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "Project name must be at least 2 characters").max(150),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  managerName: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.coerce.number().min(0).default(0),
  status: z.enum(["Planning", "Active", "On Hold", "Completed", "Cancelled"]).default("Planning"),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const createTaskSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  name: z.string().trim().min(2, "Task name must be at least 2 characters").max(200),
  assignedEmployeeId: z.string().optional().nullable(),
  assignedEmployeeName: z.string().optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(["To Do", "In Progress", "Review", "Completed"]).default("To Do"),
  description: z.string().trim().max(2000).optional().nullable(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        size: z.number().optional(),
        mimeType: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

export const updateTaskSchema = createTaskSchema.partial();

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

export async function getProjects(
  companyId: string,
  filters?: {
    status?: ProjectStatus;
    search?: string;
  },
  viewerUser?: Profile
): Promise<Project[]> {
  await requirePermission(companyId, "projects.read", viewerUser);

  let list = memoryProjectStore.projects.filter((p) => p.company_id === companyId);
  if (filters?.status) {
    list = list.filter((p) => p.status === filters.status);
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.project_code.toLowerCase().includes(s) ||
        (p.customer_name && p.customer_name.toLowerCase().includes(s)) ||
        (p.manager_name && p.manager_name.toLowerCase().includes(s))
    );
  }

  return list;
}

export async function getProjectById(
  companyId: string,
  projectId: string,
  viewerUser?: Profile
): Promise<Project | null> {
  await requirePermission(companyId, "projects.read", viewerUser);

  const project = memoryProjectStore.projects.find(
    (p) => p.company_id === companyId && (p.id === projectId || p.project_code === projectId)
  );
  return project || null;
}

export async function createProject(
  companyId: string,
  input: z.input<typeof createProjectSchema>,
  creatorUser?: Profile
): Promise<Project> {
  await requirePermission(companyId, "projects.write", creatorUser);
  const user = creatorUser || (await requireUser());
  const validated = createProjectSchema.parse(input);

  const projectCode = getNextProjectNumber(companyId);
  const id = `prj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newProject: Project = {
    id,
    company_id: companyId,
    project_code: projectCode,
    name: validated.name,
    customer_id: validated.customerId || null,
    customer_name: validated.customerName || null,
    manager_id: validated.managerId || null,
    manager_name: validated.managerName || null,
    start_date: validated.startDate || null,
    end_date: validated.endDate || null,
    budget: validated.budget,
    status: validated.status,
    description: validated.description || null,
    progress_pct: 0,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  memoryProjectStore.projects.unshift(newProject);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "PROJECT_CREATED",
    resource: "projects",
    resourceId: id,
    details: {
      projectCode,
      name: validated.name,
      status: validated.status,
      budget: validated.budget,
    },
  });

  return newProject;
}

export async function updateProject(
  companyId: string,
  projectId: string,
  input: z.input<typeof updateProjectSchema>,
  editorUser?: Profile
): Promise<Project> {
  await requirePermission(companyId, "projects.write", editorUser);
  const user = editorUser || (await requireUser());
  const validated = updateProjectSchema.parse(input);

  const idx = memoryProjectStore.projects.findIndex(
    (p) => p.company_id === companyId && (p.id === projectId || p.project_code === projectId)
  );
  if (idx === -1) {
    throw new ProjectNotFoundError(`Project [${projectId}] not found.`);
  }

  const existing = memoryProjectStore.projects[idx];
  const now = new Date().toISOString();

  const updated: Project = {
    ...existing,
    name: validated.name || existing.name,
    customer_id: validated.customerId !== undefined ? validated.customerId : existing.customer_id,
    customer_name: validated.customerName !== undefined ? validated.customerName : existing.customer_name,
    manager_id: validated.managerId !== undefined ? validated.managerId : existing.manager_id,
    manager_name: validated.managerName !== undefined ? validated.managerName : existing.manager_name,
    start_date: validated.startDate !== undefined ? validated.startDate : existing.start_date,
    end_date: validated.endDate !== undefined ? validated.endDate : existing.end_date,
    budget: validated.budget !== undefined ? validated.budget : existing.budget,
    status: validated.status || existing.status,
    description: validated.description !== undefined ? validated.description : existing.description,
    updated_at: now,
  };

  memoryProjectStore.projects[idx] = updated;

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "PROJECT_UPDATED",
    resource: "projects",
    resourceId: existing.id,
    details: { changes: validated },
  });

  return updated;
}

// ============================================================================
// TASK & KANBAN OPERATIONS
// ============================================================================

export async function getTasks(
  companyId: string,
  filters?: {
    projectId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
  },
  viewerUser?: Profile
): Promise<Task[]> {
  await requirePermission(companyId, "projects.read", viewerUser);

  let list = memoryProjectStore.tasks.filter((t) => t.company_id === companyId);
  if (filters?.projectId) {
    list = list.filter((t) => t.project_id === filters.projectId);
  }
  if (filters?.status) {
    list = list.filter((t) => t.status === filters.status);
  }
  if (filters?.priority) {
    list = list.filter((t) => t.priority === filters.priority);
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        t.task_code.toLowerCase().includes(s) ||
        (t.assigned_employee_name && t.assigned_employee_name.toLowerCase().includes(s))
    );
  }

  // Sort by order
  return list.sort((a, b) => a.sort_order - b.sort_order);
}

export async function createTask(
  companyId: string,
  input: z.input<typeof createTaskSchema>,
  creatorUser?: Profile
): Promise<Task> {
  await requirePermission(companyId, "projects.write", creatorUser);
  const user = creatorUser || (await requireUser());
  const validated = createTaskSchema.parse(input);

  const project = memoryProjectStore.projects.find(
    (p) => p.company_id === companyId && p.id === validated.projectId
  );
  if (!project) {
    throw new ProjectNotFoundError(`Target project [${validated.projectId}] not found.`);
  }

  const taskCode = getNextTaskNumber(companyId);
  const id = `tsk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newTask: Task = {
    id,
    company_id: companyId,
    project_id: validated.projectId,
    task_code: taskCode,
    name: validated.name,
    assigned_employee_id: validated.assignedEmployeeId || null,
    assigned_employee_name: validated.assignedEmployeeName || null,
    priority: validated.priority,
    start_date: validated.startDate || null,
    due_date: validated.dueDate || null,
    status: validated.status,
    description: validated.description || null,
    attachments: validated.attachments || [],
    sort_order: memoryProjectStore.tasks.filter((t) => t.project_id === validated.projectId).length,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  memoryProjectStore.tasks.push(newTask);
  recalculateProjectProgress(companyId, validated.projectId);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "TASK_CREATED",
    resource: "tasks",
    resourceId: id,
    details: {
      taskCode,
      name: validated.name,
      projectId: validated.projectId,
      priority: validated.priority,
      status: validated.status,
    },
  });

  return newTask;
}

export async function updateTaskStatus(
  companyId: string,
  taskId: string,
  newStatus: TaskStatus,
  editorUser?: Profile
): Promise<Task> {
  await requirePermission(companyId, "projects.write", editorUser);
  const user = editorUser || (await requireUser());

  const idx = memoryProjectStore.tasks.findIndex(
    (t) => t.company_id === companyId && t.id === taskId
  );
  if (idx === -1) {
    throw new TaskNotFoundError(`Task [${taskId}] not found.`);
  }

  const existing = memoryProjectStore.tasks[idx];
  const oldStatus = existing.status;
  const now = new Date().toISOString();

  const updated: Task = {
    ...existing,
    status: newStatus,
    updated_at: now,
  };

  memoryProjectStore.tasks[idx] = updated;
  recalculateProjectProgress(companyId, existing.project_id);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "TASK_STATUS_UPDATED",
    resource: "tasks",
    resourceId: taskId,
    details: {
      taskCode: existing.task_code,
      name: existing.name,
      from: oldStatus,
      to: newStatus,
    },
  });

  return updated;
}

export async function updateTask(
  companyId: string,
  taskId: string,
  input: z.input<typeof updateTaskSchema>,
  editorUser?: Profile
): Promise<Task> {
  await requirePermission(companyId, "projects.write", editorUser);
  const user = editorUser || (await requireUser());
  const validated = updateTaskSchema.parse(input);

  const idx = memoryProjectStore.tasks.findIndex(
    (t) => t.company_id === companyId && t.id === taskId
  );
  if (idx === -1) {
    throw new TaskNotFoundError(`Task [${taskId}] not found.`);
  }

  const existing = memoryProjectStore.tasks[idx];
  const now = new Date().toISOString();

  const updated: Task = {
    ...existing,
    name: validated.name || existing.name,
    assigned_employee_id:
      validated.assignedEmployeeId !== undefined ? validated.assignedEmployeeId : existing.assigned_employee_id,
    assigned_employee_name:
      validated.assignedEmployeeName !== undefined ? validated.assignedEmployeeName : existing.assigned_employee_name,
    priority: validated.priority || existing.priority,
    start_date: validated.startDate !== undefined ? validated.startDate : existing.start_date,
    due_date: validated.dueDate !== undefined ? validated.dueDate : existing.due_date,
    status: validated.status || existing.status,
    description: validated.description !== undefined ? validated.description : existing.description,
    attachments: validated.attachments || existing.attachments,
    updated_at: now,
  };

  memoryProjectStore.tasks[idx] = updated;
  recalculateProjectProgress(companyId, existing.project_id);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "TASK_UPDATED",
    resource: "tasks",
    resourceId: taskId,
    details: { changes: validated },
  });

  return updated;
}

function recalculateProjectProgress(companyId: string, projectId: string): void {
  const pIdx = memoryProjectStore.projects.findIndex(
    (p) => p.company_id === companyId && p.id === projectId
  );
  if (pIdx === -1) return;

  const projectTasks = memoryProjectStore.tasks.filter(
    (t) => t.company_id === companyId && t.project_id === projectId
  );
  if (projectTasks.length === 0) {
    memoryProjectStore.projects[pIdx].progress_pct = 0;
    return;
  }

  const completed = projectTasks.filter((t) => t.status === "Completed").length;
  const progressPct = Math.round((completed / projectTasks.length) * 100);
  memoryProjectStore.projects[pIdx].progress_pct = progressPct;
}
