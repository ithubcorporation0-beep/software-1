const INITIAL_PROJECTS = [
  {
    id: 'proj-1',
    code: 'PRJ-NEO-01',
    name: 'Autonomous Warehouse Automation Phase II',
    lead: 'Sarah Jenkins',
    budget: 450000.00,
    spent: 280000.00,
    progress: 68,
    status: 'In Progress',
    dueDate: '2026-12-15'
  },
  {
    id: 'proj-2',
    code: 'PRJ-OPT-04',
    name: 'East Coast High-Density Pallet Staging',
    lead: 'Marcus Vance',
    budget: 180000.00,
    spent: 45000.00,
    progress: 25,
    status: 'In Progress',
    dueDate: '2027-02-28'
  },
  {
    id: 'proj-3',
    code: 'PRJ-AMS-09',
    name: 'European Customs Transit Port Gateway',
    lead: 'Lukas van Dijk',
    budget: 320000.00,
    spent: 315000.00,
    progress: 95,
    status: 'Review',
    dueDate: '2026-10-30'
  }
];

export const ProjectsService = {
  getProjects() {
    return INITIAL_PROJECTS;
  }
};
