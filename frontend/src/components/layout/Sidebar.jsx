"use client"

import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { User, Home, CheckSquare, Folder, Briefcase, BarChart2, Menu, X } from "react-feather"
import { useAuth } from "../../context/AuthContext"
import Logo from "../common/Logo"
import "./Sidebar.css"

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true)
  const { currentUser, logout } = useAuth()
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
              <User />
            </div>
            <span>My Profile</span>
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className="nav-item">
            <Home className="nav-icon" />
            <span>Home</span>
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
            <span>Professional Projects</span>
          </NavLink>

          <button className="nav-item report-btn">
            <BarChart2 className="nav-icon" />
            <span>Productivity report</span>
          </button>
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
