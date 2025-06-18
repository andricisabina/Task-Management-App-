"use client"

import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { User, Home, CheckSquare, Folder, Briefcase, BarChart2, Menu, X, Bell, Calendar } from "react-feather"
import { useAuth } from "../../context/AuthContext"
import { useNotifications } from "../../context/NotificationContext"
import Logo from "../common/Logo"
import "./Sidebar.css"

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true)
  const { currentUser, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      <div className={`sidebar gradient-bg ${isOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <NavLink to="/profile" className="profile-link">
            <div className="profile-icon">
              {currentUser?.profilePhoto ? (
                <img
                  src={`http://localhost:5000/${currentUser.profilePhoto.replace("backend/", "")}`}
                  alt="Profile"
                  className="sidebar-profile-photo"
                  style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <User />
              )}
            </div>
            <span>My Profile</span>
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className="nav-item">
            <Home className="nav-icon" />
            <span>Home</span>
          </NavLink>

          <NavLink to="/calendar" className="nav-item">
            <Calendar className="nav-icon" />
            <span>Calendar</span>
          </NavLink>

          <NavLink to="/tasks" className="nav-item">
            <CheckSquare className="nav-icon" />
            <span>My Tasks</span>
          </NavLink>

          <NavLink to="/personal-projects" className="nav-item">
            <Folder className="nav-icon" />
            <span>My Projects</span>
          </NavLink>

          <NavLink to="/professional-projects" className="nav-item">
            <Briefcase className="nav-icon" />
            <span>Team Projects</span>
          </NavLink>

          <NavLink to="/notifications" className="nav-item">
            <Bell className="nav-icon" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span style={{
                background: '#ff5252',
                color: '#fff',
                borderRadius: '50%',
                padding: '2px 8px',
                fontSize: 13,
                fontWeight: 700,
                marginLeft: 8,
                minWidth: 22,
                display: 'inline-block',
                textAlign: 'center',
                lineHeight: '18px',
              }}>{unreadCount}</span>
            )}
          </NavLink>

          <NavLink to="/reports/productivity" className="nav-item">
            <BarChart2 className="nav-icon" />
            <span>Productivity</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <Logo size="small" />
        </div>
      </div>

      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {isOpen ? <X /> : <Menu />}
      </button>
    </>
  )
}

export default Sidebar
