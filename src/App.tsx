import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DiaryPage from "./pages/DiaryPage";
import NewDiaryPage from "./pages/NewDiaryPage";
import CalendarPage from "./pages/CalendarPage";
import { AdminPanel } from "./pages/AdminPanel";
import { ReportsPage } from "./pages/ReportsPage";

import { TestCRUD } from "./components/TestCRUD";
import { AuthDebug } from "./components/AuthDebug";
import ProtectedRoute, { PublicRoute } from "./components/ProtectedRoute";
import "./App.css";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Rota raiz redireciona para dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Rota de login (pública) */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        {/* Dashboard (protegida) */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route
          path="/diaries"
          element={
            <ProtectedRoute>
              <DiaryPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/diaries/new"
          element={
            <ProtectedRoute>
              <NewDiaryPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        

        
        <Route
          path="/test-crud"
          element={
            <ProtectedRoute>
              <TestCRUD />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/auth-debug"
          element={
            <ProtectedRoute requireAuth={false}>
              <AuthDebug />
            </ProtectedRoute>
          }
        />
        
        {/* Rota para páginas não encontradas */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
