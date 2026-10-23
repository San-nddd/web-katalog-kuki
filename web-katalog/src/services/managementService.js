import { api } from './api'

export async function getManagementDashboard() {
  const response = await api.get('/management/dashboard')
  return response.data
}
