export const ROLE_OPTIONS = [
  {
    id: 'admin',
    label: 'Admin',
    destination: 'System control center',
    permissions: ['Manage users', 'Configure services', 'Review audit logs'],
  },
  {
    id: 'driver',
    label: 'Driver',
    destination: 'Driver route board',
    permissions: ['View assigned shipments', 'Update delivery status', 'Report incidents'],
  },
  {
    id: 'support',
    label: 'Customer Support',
    destination: 'Customer support desk',
    permissions: ['Search shipments', 'Open customer cases', 'Send status updates'],
  },
  {
    id: 'logistics',
    label: 'Logistical Management',
    destination: 'Logistics operations hub',
    permissions: ['Plan capacity', 'Assign carriers', 'Monitor exceptions'],
  },
]
