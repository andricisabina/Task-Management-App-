import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { departmentsApi } from '../../services/api';

const AddDepartmentModal = ({ show, onHide, onAdd, existingDepartments = [] }) => {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await departmentsApi.getDepartments();
        // Filter out departments that are already in the project
        const availableDepartments = response.data.data.filter(
          dept => !existingDepartments.includes(dept.id)
        );
        setDepartments(availableDepartments);
      } catch (error) {
        console.error('Error fetching departments:', error);
        toast.error('Failed to fetch departments');
      }
    };

    if (show) {
      fetchDepartments();
    }
  }, [show, existingDepartments]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedDepartment) {
      return toast.error('Please select a department');
    }
    if (!leaderEmail) {
      return toast.error('Please enter leader email');
    }

    onAdd({
      departmentId: parseInt(selectedDepartment),
      leaderEmail
    });

    // Reset form
    setSelectedDepartment('');
    setLeaderEmail('');
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Department & Leader</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Department</Form.Label>
            <Form.Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              required
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Leader Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter leader's email"
              value={leaderEmail}
              onChange={(e) => setLeaderEmail(e.target.value)}
              required
            />
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Department'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AddDepartmentModal; 