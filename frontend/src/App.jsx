import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/auth/Login"
import Register from "./pages/auth/Register"
import Dashboard from "./pages/dashboard/Dashboard"
import UserProfile from "./pages/profile/Userprofile"
import PersonalProjects from "./pages/projects/PersonalProjects"
import ProfessionalProjects from "./pages/projects/ProfessionalProjects"
import PersonalTasks from "./pages/tasks/PersonalTasks"
import ProjectDetails from "./pages/projects/ProjectDetails"
import TaskDetails from "./pages/tasks/TaskDetails"
import Calendar from "./pages/calendar/Calendar"
import Layout from "./components/layout/Layout"
import ProtectedRoute from "./components/auth/ProtectedRoute"
import { AuthProvider } from "./context/AuthContext"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import "./App.css"

function App() {
  return (
    <AuthProvider>
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
            <Route path="/projects/:projectId" element={<ProjectDetails />} />
            <Route path="/tasks/:type/:taskId" element={<TaskDetails />} />
            <Route path="/calendar" element={<Calendar />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
