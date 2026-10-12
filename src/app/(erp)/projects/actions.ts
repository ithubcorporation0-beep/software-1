"use server";

import { revalidatePath } from "next/cache";
import {
  createProject,
  updateProject,
  createTask,
  updateTaskStatus,
  updateTask,
} from "@/lib/projects/server";
import type { TaskStatus } from "@/types/database.types";

export interface ActionState<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function createProjectAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const project = await createProject(companyId, payload);
    revalidatePath("/projects");
    return {
      success: true,
      message: `Project ${project.name} (${project.project_code}) created successfully.`,
      data: project,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to create project",
    };
  }
}

export async function updateProjectAction(
  companyId: string,
  projectId: string,
  payload: any
): Promise<ActionState> {
  try {
    const project = await updateProject(companyId, projectId, payload);
    revalidatePath("/projects");
    return {
      success: true,
      message: `Project ${project.name} updated successfully.`,
      data: project,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to update project",
    };
  }
}

export async function createTaskAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const task = await createTask(companyId, payload);
    revalidatePath("/projects");
    return {
      success: true,
      message: `Task ${task.name} (${task.task_code}) created successfully.`,
      data: task,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to create task",
    };
  }
}

export async function updateTaskStatusAction(
  companyId: string,
  taskId: string,
  newStatus: TaskStatus
): Promise<ActionState> {
  try {
    const task = await updateTaskStatus(companyId, taskId, newStatus);
    revalidatePath("/projects");
    return {
      success: true,
      message: `Task ${task.task_code} status transitioned to ${task.status}.`,
      data: task,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to update task status",
    };
  }
}

export async function updateTaskAction(
  companyId: string,
  taskId: string,
  payload: any
): Promise<ActionState> {
  try {
    const task = await updateTask(companyId, taskId, payload);
    revalidatePath("/projects");
    return {
      success: true,
      message: `Task ${task.name} updated successfully.`,
      data: task,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to update task",
    };
  }
}
