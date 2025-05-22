"use client"

import { createContext, useState, useContext, useEffect } from "react"
import { authApi } from "../services/api"
import { toast } from "react-toastify"

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token")
      if (token) {
        const response = await authApi.getMe()
        setCurrentUser(response.data)
      }
    } catch (error) {
      localStorage.removeItem("token")
    } finally {
      setLoading(false)
    }
  }

  // Login function
  const login = async (credentials) => {
    try {
      const response = await authApi.login(credentials)
      const { token, user } = response
      localStorage.setItem("token", token)
      setCurrentUser(user)
      return { success: true }
    } catch (error) {
      toast.error(error.message)
      return { success: false, error: error.message }
    }
  }

  // Register function
  const register = async (userData) => {
    try {
      const response = await authApi.register(userData)
      const { token, user } = response
      localStorage.setItem("token", token)
      setCurrentUser(user)
      return { success: true }
    } catch (error) {
      toast.error(error.message)
      return { success: false, error: error.message }
    }
  }

  // Update profile function
  const updateProfile = async (updates) => {
    try {
      const response = await authApi.updateDetails(updates)
      setCurrentUser(response.data)
      localStorage.setItem("user", JSON.stringify(response.data))
      toast.success("Profile updated successfully")
      return { success: true }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error(error.message)
      return { success: false, error: error.message }
    }
  }

  // Logout function
  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setCurrentUser(null)
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    }
  }

  const value = {
    currentUser,
    login,
    register,
    logout,
    loading,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}
