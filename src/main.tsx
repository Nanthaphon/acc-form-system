import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { RequireAdmin } from './auth/RequireAdmin'
import Layout from './components/Layout'
import DialogHost from './components/dialog/DialogHost'
import LoginPage from './pages/LoginPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import ProfilePage from './pages/ProfilePage'
import DashboardPage from './pages/employee/DashboardPage'
import GroupPage from './pages/GroupPage'
import FormPage from './pages/employee/FormPage'
import SubmissionPreviewPage from './pages/SubmissionPreviewPage'
import HistoryPage from './pages/employee/HistoryPage'
import EmployeeListPage from './pages/admin/EmployeeListPage'
import AddEmployeePage from './pages/admin/AddEmployeePage'
import EditEmployeePage from './pages/admin/EditEmployeePage'
import EmployeeDetailPage from './pages/admin/EmployeeDetailPage'
import ImportCsvPage from './pages/admin/ImportCsvPage'
import PrintHistoryPage from './pages/admin/PrintHistoryPage'
import FormSettingsPage from './pages/admin/FormSettingsPage'
import SignInboxPage from './pages/SignInboxPage'
import AccessGroupsPage from './pages/admin/AccessGroupsPage'
import DepartmentsPage from './pages/admin/DepartmentsPage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/', element: <RequireAuth><Layout /></RequireAuth>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'group/:groupId', element: <GroupPage /> },
      { path: 'form/:formType/edit', element: <RequireAdmin><FormSettingsPage /></RequireAdmin> },
      { path: 'form/:formType', element: <FormPage /> },
      { path: 'submission/:id', element: <FormPage /> },
      { path: 'submission/:id/preview', element: <SubmissionPreviewPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'sign', element: <SignInboxPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'change-password', element: <ChangePasswordPage /> },
      { path: 'admin/employees', element: <RequireAdmin><EmployeeListPage /></RequireAdmin> },
      { path: 'admin/employees/new', element: <RequireAdmin><AddEmployeePage /></RequireAdmin> },
      { path: 'admin/employees/:uid', element: <RequireAdmin><EmployeeDetailPage /></RequireAdmin> },
      { path: 'admin/employees/:uid/edit', element: <RequireAdmin><EditEmployeePage /></RequireAdmin> },
      { path: 'admin/import', element: <RequireAdmin><ImportCsvPage /></RequireAdmin> },
      { path: 'admin/prints', element: <RequireAdmin><PrintHistoryPage /></RequireAdmin> },
      { path: 'admin/access-groups', element: <RequireAdmin><AccessGroupsPage /></RequireAdmin> },
      { path: 'admin/departments', element: <RequireAdmin><DepartmentsPage /></RequireAdmin> },
      { path: 'admin/form-settings', element: <RequireAdmin><FormSettingsPage /></RequireAdmin> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider><RouterProvider router={router} /><DialogHost /></AuthProvider>
  </StrictMode>,
)
