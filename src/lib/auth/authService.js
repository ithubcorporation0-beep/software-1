import { ROLES } from '../../types';

const DEMO_USERS = [
  {
    id: 'usr-admin',
    name: 'Sarah Jenkins',
    email: 's.jenkins@nexus-erp.corp',
    role: ROLES.SUPER_ADMIN,
    title: 'Chief Operations Officer',
    avatar: 'SJ'
  },
  {
    id: 'usr-inv-mgr',
    name: 'Marcus Vance',
    email: 'm.vance@nexus-erp.corp',
    role: ROLES.INVENTORY_MANAGER,
    title: 'Lead Inventory Controller',
    avatar: 'MV'
  },
  {
    id: 'usr-ops',
    name: 'Elena Rostova',
    email: 'e.rostova@nexus-erp.corp',
    role: ROLES.OPERATIONS_STAFF,
    title: 'Logistics Specialist',
    avatar: 'ER'
  },
  {
    id: 'usr-fin',
    name: 'Julian Hayes',
    email: 'j.hayes@nexus-erp.corp',
    role: ROLES.FINANCE_MANAGER,
    title: 'Finance Director',
    avatar: 'JH'
  }
];

const AUTH_STORAGE_KEY = 'it_hub_erp_auth_user';

export const AuthService = {
  getCurrentUser() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return DEMO_USERS[0]; // Default to Super Admin
  },

  setCurrentUser(user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  },

  getAvailableUsers() {
    return DEMO_USERS;
  },

  switchUser(userId) {
    const found = DEMO_USERS.find(u => u.id === userId);
    if (found) {
      this.setCurrentUser(found);
      return found;
    }
    return this.getCurrentUser();
  }
};
