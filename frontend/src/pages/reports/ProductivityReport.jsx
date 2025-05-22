import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { toast } from "react-toastify";

const ProductivityReport = () => {
  const [personalStats, setPersonalStats] = useState(null);
  const [professionalStats, setProfessionalStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [personal, professional] = await Promise.all([
          api.get("/personal-tasks/stats"),
          api.get("/professional-tasks/stats")
        ]);
        setPersonalStats(personal.data.data);
        setProfessionalStats(professional.data.data);
      } catch (err) {
        toast.error("Failed to load productivity stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h2>Productivity Report</h2>
      {loading && <div>Loading...</div>}
      {!loading && (
        <>
          <section style={{ marginBottom: 32 }}>
            <h3>Personal Tasks</h3>
            {personalStats ? (
              <>
                <div>Tasks Completed: {personalStats.statusCounts?.find(s => s.status === 'completed')?.count || 0}</div>
                <div>In Progress: {personalStats.statusCounts?.find(s => s.status === 'in-progress')?.count || 0}</div>
                <div>Overdue: {personalStats.overdueTasks || 0}</div>
                <div>Completion Rate: {personalStats.completionRate?.toFixed(1) || 0}%</div>
                {/* TODO: Add charts/tables for personal productivity */}
              </>
            ) : <div>No data</div>}
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3>Professional Tasks</h3>
            {professionalStats ? (
              <>
                <div>Tasks Completed: {professionalStats.statusCounts?.find(s => s.status === 'completed')?.count || 0}</div>
                <div>In Progress: {professionalStats.statusCounts?.find(s => s.status === 'in-progress')?.count || 0}</div>
                <div>Overdue: {professionalStats.overdueTasks || 0}</div>
                <div>Completion Rate: {professionalStats.completionRate?.toFixed(1) || 0}%</div>
                {/* TODO: Add charts/tables for professional productivity */}
                {/* TODO: Show productivity by project, by user, by department */}
              </>
            ) : <div>No data</div>}
          </section>
        </>
      )}
    </div>
  );
};

export default ProductivityReport; 