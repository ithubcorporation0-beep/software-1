"use client";

import * as React from "react";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Calendar,
  User,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  MoreVertical,
  Paperclip,
  CheckSquare,
  BarChart3,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type {
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
  TaskPriority,
  Customer,
  HREmployee,
} from "@/types/database.types";
import {
  createProjectAction,
  updateProjectAction,
  createTaskAction,
  updateTaskStatusAction,
  updateTaskAction,
} from "./actions";

interface ProjectsClientProps {
  companyId: string;
  currency: string;
  initialProjects: Project[];
  initialTasks: Task[];
  customers: Customer[];
  employees: HREmployee[];
}

const KANBAN_COLUMNS: { id: TaskStatus; title: string; color: string; border: string }[] = [
  { id: "To Do", title: "To Do", color: "bg-slate-500/10 text-slate-400", border: "border-slate-500/30" },
  { id: "In Progress", title: "In Progress", color: "bg-blue-500/10 text-blue-400", border: "border-blue-500/30" },
  { id: "Review", title: "Review / QA", color: "bg-amber-500/10 text-amber-400", border: "border-amber-500/30" },
  { id: "Completed", title: "Completed", color: "bg-emerald-500/10 text-emerald-400", border: "border-emerald-500/30" },
];

export function ProjectsClient({
  companyId,
  currency,
  initialProjects,
  initialTasks,
  customers,
  employees,
}: ProjectsClientProps) {
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks);
  const [activeTab, setActiveTab] = React.useState<"kanban" | "projects" | "analytics">("kanban");
  const [isPending, startTransition] = React.useTransition();

  // Filters
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("all");
  const [selectedPriority, setSelectedPriority] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Banners
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Modals
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = React.useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  // Sync state if props change
  React.useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Derived tasks filtered
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      if (selectedProjectId !== "all" && task.project_id !== selectedProjectId) return false;
      if (selectedPriority !== "all" && task.priority !== selectedPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = task.name.toLowerCase().includes(q);
        const matchCode = task.task_code.toLowerCase().includes(q);
        const matchEmp = (task.assigned_employee_name || "").toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchEmp) return false;
      }
      return true;
    });
  }, [tasks, selectedProjectId, selectedPriority, searchQuery]);

  // Statistics
  const stats = React.useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === "Active").length;
    const totalBudget = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
    const completedTasks = tasks.filter((t) => t.status === "Completed").length;
    const pendingTasks = tasks.filter((t) => t.status !== "Completed").length;
    const urgentTasks = tasks.filter((t) => t.priority === "Urgent" && t.status !== "Completed").length;

    return {
      totalProjects,
      activeProjects,
      totalBudget,
      completedTasks,
      pendingTasks,
      urgentTasks,
    };
  }, [projects, tasks]);

  // Status transitions
  const handleMoveTaskStatus = (taskId: string, targetStatus: TaskStatus) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus, updated_at: new Date().toISOString() } : t))
    );

    startTransition(async () => {
      const res = await updateTaskStatusAction(companyId, taskId, targetStatus);
      if (!res.success) {
        setErrorMessage(res.message || "Failed to update task status.");
        // Rollback
        setTasks(initialTasks);
      } else {
        setSuccessMessage(`Task updated to ${targetStatus}`);
        if (res.data) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
        }
      }
    });
  };

  // Create Project handler
  const handleCreateProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const customerId = formData.get("customerId")?.toString() || undefined;
    const customer = customers.find((c) => c.id === customerId);

    const managerId = formData.get("managerId")?.toString() || undefined;
    const manager = employees.find((em) => em.id === managerId);

    const payload = {
      name: formData.get("name")?.toString() || "",
      customerId: customerId || null,
      customerName: customer ? customer.name : null,
      managerId: managerId || null,
      managerName: manager ? manager.full_name : null,
      startDate: formData.get("startDate")?.toString() || null,
      endDate: formData.get("endDate")?.toString() || null,
      budget: Number(formData.get("budget")) || 0,
      status: (formData.get("status")?.toString() || "Planning") as ProjectStatus,
      description: formData.get("description")?.toString() || null,
    };

    startTransition(async () => {
      const res = await createProjectAction(companyId, payload);
      if (!res.success) {
        setErrorMessage(res.message || "Failed to create project");
      } else {
        setSuccessMessage(res.message || "Project created");
        if (res.data) {
          setProjects((prev) => [res.data, ...prev]);
        }
        setIsNewProjectModalOpen(false);
      }
    });
  };

  // Create Task handler
  const handleCreateTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const assignedId = formData.get("assignedEmployeeId")?.toString() || undefined;
    const assignedEmp = employees.find((em) => em.id === assignedId);

    const payload = {
      projectId: formData.get("projectId")?.toString() || "",
      name: formData.get("name")?.toString() || "",
      assignedEmployeeId: assignedId || null,
      assignedEmployeeName: assignedEmp ? assignedEmp.full_name : null,
      priority: (formData.get("priority")?.toString() || "Medium") as TaskPriority,
      startDate: formData.get("startDate")?.toString() || null,
      dueDate: formData.get("dueDate")?.toString() || null,
      status: (formData.get("status")?.toString() || "To Do") as TaskStatus,
      description: formData.get("description")?.toString() || null,
    };

    startTransition(async () => {
      const res = await createTaskAction(companyId, payload);
      if (!res.success) {
        setErrorMessage(res.message || "Failed to create task");
      } else {
        setSuccessMessage(res.message || "Task created");
        if (res.data) {
          setTasks((prev) => [...prev, res.data]);
        }
        setIsNewTaskModalOpen(false);
      }
    });
  };

  // Helper for priority badges
  const renderPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "Urgent":
        return <Badge variant="destructive" className="animate-pulse">Urgent</Badge>;
      case "High":
        return <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30">High</Badge>;
      case "Medium":
        return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">Medium</Badge>;
      case "Low":
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border border-slate-500/30">Low</Badge>;
    }
  };

  // Helper for project status badges
  const renderProjectStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Active</Badge>;
      case "Planning":
        return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">Planning</Badge>;
      case "On Hold":
        return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">On Hold</Badge>;
      case "Completed":
        return <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30">Completed</Badge>;
      case "Cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setErrorMessage(null)}>Dismiss</Button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSuccessMessage(null)}>Dismiss</Button>
        </div>
      )}

      {/* Top Strategic PMO Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground font-mono">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{stats.activeProjects}</span> active capital initiatives
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Portfolio Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground font-mono">
              {currency} {stats.totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Allocated across all projects</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Velocity</CardTitle>
            <CheckSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground font-mono">{stats.completedTasks} / {tasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {tasks.length > 0 ? Math.round((stats.completedTasks / tasks.length) * 100) : 0}% delivery completion
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Urgent Backlog</CardTitle>
            <Flame className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">{stats.urgentTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending critical priority tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tab Controls & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("kanban")}
            className="gap-2"
          >
            <Layers className="h-4 w-4" />
            Kanban Board
          </Button>
          <Button
            variant={activeTab === "projects" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("projects")}
            className="gap-2"
          >
            <Briefcase className="h-4 w-4" />
            Projects Roster ({projects.length})
          </Button>
          <Button
            variant={activeTab === "analytics" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("analytics")}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Budget & Milestones
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNewProjectModalOpen(true)}
            className="gap-1 border-border hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
          <Button
            size="sm"
            onClick={() => setIsNewTaskModalOpen(true)}
            className="gap-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        </div>
      </div>

      {/* TAB 1: FUNCTIONAL KANBAN BOARD */}
      {activeTab === "kanban" && (
        <div className="space-y-4">
          {/* Kanban Toolbar Filters */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks, code, employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-background border-input text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Project:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-9 px-3 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Projects ({projects.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Priority:</span>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="h-9 px-3 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Kanban Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className="bg-muted/20 rounded-xl border border-border p-3 min-h-[500px] flex flex-col"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${col.color}`}>
                        {col.title}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">({colTasks.length})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setIsNewTaskModalOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colTasks.length === 0 ? (
                      <div className="h-36 flex flex-col items-center justify-center border border-dashed border-border rounded-lg p-4 text-center">
                        <p className="text-xs text-muted-foreground">No tasks in {col.title}</p>
                      </div>
                    ) : (
                      colTasks.map((task) => {
                        const parentProject = projects.find((p) => p.id === task.project_id);
                        return (
                          <div
                            key={task.id}
                            className="bg-card hover:bg-muted/30 border border-border rounded-lg p-3.5 shadow-2xs transition-all group"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-mono font-bold text-primary">
                                {task.task_code}
                              </span>
                              {renderPriorityBadge(task.priority)}
                            </div>

                            <h4 className="text-sm font-semibold text-foreground mb-1 leading-snug">
                              {task.name}
                            </h4>

                            {parentProject && (
                              <p className="text-xs text-muted-foreground mb-2 truncate">
                                📁 {parentProject.name}
                              </p>
                            )}

                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                {task.description}
                              </p>
                            )}

                            {/* Task Metadata Footer */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                              <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate">{task.assigned_employee_name || "Unassigned"}</span>
                              </div>

                              {task.due_date && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{task.due_date}</span>
                                </div>
                              )}
                            </div>

                            {/* Quick Status Workflow Arrows */}
                            <div className="mt-3 pt-2 flex items-center justify-between border-t border-border opacity-80 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center gap-1">
                                {col.id !== "To Do" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                                    disabled={isPending}
                                    onClick={() => {
                                      const prevCol =
                                        col.id === "Completed"
                                          ? "Review"
                                          : col.id === "Review"
                                          ? "In Progress"
                                          : "To Do";
                                      handleMoveTaskStatus(task.id, prevCol);
                                    }}
                                  >
                                    <ArrowLeft className="h-3 w-3 mr-1" />
                                    Back
                                  </Button>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                {col.id !== "Completed" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-xs text-primary hover:text-primary-foreground hover:bg-primary"
                                    disabled={isPending}
                                    onClick={() => {
                                      const nextCol =
                                        col.id === "To Do"
                                          ? "In Progress"
                                          : col.id === "In Progress"
                                          ? "Review"
                                          : "Completed";
                                      handleMoveTaskStatus(task.id, nextCol);
                                    }}
                                  >
                                    Advance
                                    <ArrowRight className="h-3 w-3 ml-1" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PROJECTS ROSTER TABLE */}
      {activeTab === "projects" && (
        <Card className="bg-card border-border shadow-xs">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Enterprise Projects Roster</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Deliverables, customer alignments, assigned PM managers, and budgets.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsNewProjectModalOpen(true)}
                className="gap-1 bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Add Project
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl">
                <Briefcase className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-foreground">No projects registered yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create your first capital project initiative</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-muted-foreground font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Project Name</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Manager</th>
                      <th className="py-2.5 px-3">Budget</th>
                      <th className="py-2.5 px-3">Progress</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Timeline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {projects.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-xs text-primary">
                          {p.project_code}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-foreground">
                          <div>{p.name}</div>
                          {p.description && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-xs">{p.description}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {p.customer_name || <span className="italic">Internal</span>}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {p.manager_name || <span className="italic">Unassigned</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-foreground font-semibold">
                          {currency} {(p.budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="w-32">
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-muted-foreground">Completion</span>
                              <span className="font-semibold text-primary">{p.progress_pct || 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${p.progress_pct || 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {renderProjectStatusBadge(p.status)}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground font-mono">
                          {p.start_date || "N/A"} → {p.end_date || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: BUDGET & MILESTONES REPORTING */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-base text-foreground font-semibold">Project Budget Distribution</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Total authorized capital allocation by initiative</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {projects.length === 0 ? (
                <p className="text-xs text-muted-foreground">No project budgets to display.</p>
              ) : (
                projects.map((p) => {
                  const pct = stats.totalBudget > 0 ? Math.round((p.budget / stats.totalBudget) * 100) : 0;
                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-foreground">{p.name} ({p.project_code})</span>
                        <span className="font-mono text-muted-foreground">
                          {currency} {p.budget.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-base text-foreground font-semibold">Task Priority & Workload Breakdown</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Delivery pipeline capacity by urgency level</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(["Urgent", "High", "Medium", "Low"] as TaskPriority[]).map((pr) => {
                const count = tasks.filter((t) => t.priority === pr).length;
                const completed = tasks.filter((t) => t.priority === pr && t.status === "Completed").length;
                const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0;

                return (
                  <div key={pr} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">
                        {pr} Priority ({count} tasks - {completed} closed)
                      </span>
                      <span className="text-muted-foreground font-mono">{pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          pr === "Urgent"
                            ? "bg-rose-500"
                            : pr === "High"
                            ? "bg-amber-500"
                            : pr === "Medium"
                            ? "bg-blue-500"
                            : "bg-slate-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="text-base font-semibold text-foreground">Create Capital Project</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Project Name *</label>
                <Input name="name" required placeholder="e.g. Next-Gen Cloud Migration" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Customer / Client</label>
                  <select
                    name="customerId"
                    className="w-full h-9 px-3 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Internal Corporate Project</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Project Manager</label>
                  <select
                    name="managerId"
                    className="w-full h-9 px-3 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select PM Manager</option>
                    {employees.map((em) => (
                      <option key={em.id} value={em.id}>{em.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Budget ({currency})</label>
                  <Input name="budget" type="number" min="0" step="100" defaultValue="0" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue="Planning"
                    className="w-full h-9 px-3 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Start Date</label>
                  <Input name="startDate" type="date" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Target End Date</label>
                  <Input name="endDate" type="date" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Description / Deliverables Scope</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full p-2.5 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Strategic objectives, milestone commitments..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewProjectModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="bg-primary text-primary-foreground">
                  {isPending ? "Saving..." : "Create Project"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="text-base font-semibold text-foreground">Create Task</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsNewTaskModalOpen(false)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Project *</label>
                <select
                  name="projectId"
                  required
                  defaultValue={selectedProjectId !== "all" ? selectedProjectId : projects[0]?.id || ""}
                  className="w-full h-9 px-3 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Task Name *</label>
                <Input name="name" required placeholder="e.g. Design GraphQL API Schema" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Assigned Employee</label>
                  <select
                    name="assignedEmployeeId"
                    className="w-full h-9 px-3 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((em) => (
                      <option key={em.id} value={em.id}>{em.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Priority</label>
                  <select
                    name="priority"
                    defaultValue="Medium"
                    className="w-full h-9 px-3 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Initial Status</label>
                  <select
                    name="status"
                    defaultValue="To Do"
                    className="w-full h-9 px-3 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Due Date</label>
                  <Input name="dueDate" type="date" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Description / Acceptance Criteria</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full p-2.5 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Task specifications, documentation links..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewTaskModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="bg-primary text-primary-foreground">
                  {isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
