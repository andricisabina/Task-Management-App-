"use client"

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { toast } from "react-toastify"
import Logo from "../../components/common/Logo"
import "./Auth.css"

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    organization: "", // Optional
    position: "", // Optional
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { register } = useAuth()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registerData } = formData
      const result = await register(registerData)
      
      if (result.success) {
        toast.success("Registration successful!")
        navigate("/")
      } else {
        toast.error(result.error || "Registration failed. Please try again.")
      }
    } catch (error) {
      toast.error("Registration failed. Please try again.")
      console.error("Registration error:", error)
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
              type="text"
              name="name"
              className="form-input"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="Email"
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
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              name="confirmPassword"
              className="form-input"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength="6"
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              name="organization"
              className="form-input"
              placeholder="Organization (Optional)"
              value={formData.organization}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              name="position"
              className="form-input"
              placeholder="Position (Optional)"
              value={formData.position}
              onChange={handleChange}
            />
          </div>
          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
        <div className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Login here.
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Register
