/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Appointments from './pages/Appointments';
import ClinicalNotes from './pages/ClinicalNotes';
import Pharmacy from './pages/Pharmacy';
import Billing from './pages/Billing';
import Staff from './pages/Staff';
import ManageStaff from './pages/ManageStaff';
import Utilities from './pages/Utilities';
import Reports from './pages/Reports';
import VisitWorkflow from './pages/VisitWorkflow';
import Inventory from './pages/Inventory';

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />

        <Route path="/patients" element={
          <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']}>
            <Layout>
              <Patients />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/patients/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']}>
            <Layout>
              <PatientDetail />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/visits/:visitId/workflow" element={
          <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist', 'accountant']}>
            <Layout>
              <VisitWorkflow />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/appointments" element={
          <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']}>
            <Layout>
              <Appointments />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/clinical" element={
          <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']}>
            <Layout>
              <ClinicalNotes />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/pharmacy" element={
          <ProtectedRoute allowedRoles={['admin', 'pharmacist', 'doctor']}>
            <Layout>
              <Pharmacy />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/billing" element={
          <ProtectedRoute allowedRoles={['admin', 'accountant', 'receptionist']}>
            <Layout>
              <Billing />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/manage-staff" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <ManageStaff />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/staff" element={
          <ProtectedRoute allowedRoles={['admin', 'hr']}>
            <Layout>
              <Staff />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/utilities" element={
          <ProtectedRoute allowedRoles={['admin', 'accountant']}>
            <Layout>
              <Utilities />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['admin', 'accountant']}>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/inventory" element={
          <ProtectedRoute allowedRoles={['admin', 'pharmacist', 'nurse', 'doctor', 'receptionist', 'accountant']}>
            <Layout>
              <Inventory />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Router>
    </ThemeProvider>
  );
}

