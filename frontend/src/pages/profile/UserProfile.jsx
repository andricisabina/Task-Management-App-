"use client"

import { useState, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import { toast } from "react-toastify"
import { User, Camera } from "react-feather"
import "./UserProfile.css"
import { useNavigate } from "react-router-dom"

const UserProfile = () => {
  const { currentUser, updateProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [avatar, setAvatar] = useState(currentUser?.avatarUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    username: currentUser?.username || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const uploadImageToServer = async (file) => {
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('photo', file);

      console.log('Uploading file...'); // Debug log

      const response = await fetch('http://localhost:5000/api/users/profile-upload', {
        method: 'PUT',
        body: formData,
        credentials: 'include',
      });

      console.log('Response status:', response.status); // Debug log

      const data = await response.json();
      console.log('Response data:', data); // Debug log

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      // Update avatar state with the new profile photo path
      const profilePhotoUrl = `http://localhost:5000/${data.data.profilePhoto}`;
      setAvatar(profilePhotoUrl);
      toast.success('Profile photo updated successfully!');
      
    } catch (error) {
      console.error('Upload error:', error); // Debug log
      toast.error(error.message || 'Failed to upload image');
      setAvatar(currentUser?.avatarUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size should be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      await uploadImageToServer(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    try {
      const updates = {
        name: formData.name,
        email: formData.email,
        username: formData.username,
      }

      if (formData.newPassword) {
        // In a real app, you would handle password update separately
        updates.password = formData.newPassword
      }

      const result = await updateProfile(updates)
      
      if (result.success) {
        toast.success("Profile updated successfully")
        setIsEditing(false)
      } else {
        throw new Error(result.error || "Failed to update profile")
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="profile-container">
      <h1 className="page-title">My Profile</h1>

      <div className="profile-card card">
        <div className="profile-header">
          <div className="profile-avatar">
            <div className={`avatar-placeholder ${isUploading ? 'uploading' : ''}`} onClick={handleAvatarClick}>
              {avatar ? (
                <img src={avatar} alt="Profile" className="avatar-image" />
              ) : (
                <User size={40} />
              )}
              {isUploading && <div className="upload-overlay">Uploading...</div>}
            </div>
            <button className="avatar-upload" onClick={handleAvatarClick} disabled={isUploading}>
              <Camera size={16} />
              <span className="sr-only">Upload photo</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden-input"
              aria-label="Upload profile photo"
              disabled={isUploading}
            />
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{currentUser?.name || "User"}</h2>
            <p className="profile-username">@{currentUser?.username || "username"}</p>
          </div>
          <button className="btn btn-secondary edit-profile-btn" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  className="form-input"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="password-section">
              <h3 className="section-title">Change Password</h3>

              <div className="form-group">
                <label htmlFor="currentPassword" className="form-label">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  className="form-input"
                  value={formData.currentPassword}
                  onChange={handleChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="newPassword" className="form-label">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    className="form-input"
                    value={formData.newPassword}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    className="form-input"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-details">
            <div className="detail-group">
              <h3 className="detail-label">Email</h3>
              <p className="detail-value">{currentUser?.email || "email@example.com"}</p>
            </div>
            {!isEditing && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32 }}>
                <button
                  className="btn btn-secondary"
                  style={{ borderRadius: 24, padding: '10px 32px', fontWeight: 600, fontSize: '1rem', margin: '0 auto' }}
                  onClick={() => {
                    if (logout) {
                      logout()
                    } else {
                      localStorage.removeItem('token')
                      sessionStorage.removeItem('token')
                    }
                    navigate('/login')
                  }}
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default UserProfile
