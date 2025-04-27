"use client"

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { toast } from "react-toastify"
import Logo from "../../components/common/Logo"
import "./Auth.css"

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await login(formData)
      if (result.success) {
        toast.success("Login successful!")
        navigate("/")
      } else {
        toast.error(result.error || "Login failed. Please check your credentials.")
      }
    } catch (error) {
      toast.error("Login failed. Please try again.")
      console.error("Login error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container gradient-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <Logo />
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="Enter email..."
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="Enter password..."
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <div className="auth-footer">
          You don't have an account?{" "}
          <Link to="/register" className="auth-link">
            Register here.
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Login
