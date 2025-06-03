import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/auth/Login"
import Register from "./pages/auth/Register"
import Dashboard from "./pages/dashboard/Dashboard"
import UserProfile from "./pages/profile/Userprofile"
import PersonalProjects from "./pages/projects/PersonalProjects"
import ProfessionalProjects from "./pages/projects/ProfessionalProjects"
import PersonalTasks from "./pages/tasks/PersonalTasks"
import ProjectDetailsSwitch from "./pages/projects/ProjectDetailsSwitch"
import TaskDetails from "./pages/tasks/TaskDetails"
import CalendarPage from "./pages/CalendarPage"
import NotificationsPage from "./pages/notifications/NotificationsPage"
import Layout from "./components/layout/Layout"
import ProtectedRoute from "./components/auth/ProtectedRoute"
import { AuthProvider } from "./context/AuthContext"
import { TaskProvider } from "./context/TaskContext"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import "./App.css"
import ProductivityReport from "./pages/reports/ProductivityReport"
import ProfessionalTaskDetails from "./pages/tasks/ProfessionalTaskDetails"

function App() {
  return (
    <AuthProvider>
      <TaskProvider>
        <Router>
          <ToastContainer position="top-right" autoClose={3000} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/personal-projects" element={<PersonalProjects />} />
              <Route path="/professional-projects" element={<ProfessionalProjects />} />
              <Route path="/tasks" element={<PersonalTasks />} />
              <Route path="/projects/:type/:projectId" element={<ProjectDetailsSwitch />} />
              <Route path="/tasks/:type/:taskId" element={<TaskDetails />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/reports/productivity" element={<ProductivityReport />} />
              <Route path="/tasks/professional/:id" element={<ProfessionalTaskDetails />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </TaskProvider>
    </AuthProvider>
  )
}

export default App
