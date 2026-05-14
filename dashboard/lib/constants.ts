// dashboard/lib/constants.ts

export const ROLES = {
  SUPER_ADMIN: 'SuperAdmin',
  ADMINISTRATOR: 'Administrator',
  OPERATOR: 'PJ Ormawa',
} as const;

export const ALL_ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMINISTRATOR] as const;
export const ALL_OPERATOR_ROLES = [...ALL_ADMIN_ROLES, ROLES.OPERATOR] as const;

export type RoleValue = typeof ROLES[keyof typeof ROLES];
