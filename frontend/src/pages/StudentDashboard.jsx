import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBook,
  FaEye,
  FaGraduationCap,
  FaSearch,
  FaLayerGroup,
  FaCalendarCheck,
  FaCalendarAlt,
} from "react-icons/fa";

import api from "../services/api";
import { getUser } from "../services/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function StudentDashboard() {
  const [report, setReport] = useState({
    enrolledCourses: 0,
    distinctCategories: 0,
    earliestEnrollment: null,
    latestEnrollment: null,
    totalEnrolledValue: 0,
    recentEnrollments: [],
    categoryBreakdown: [],
    totalCoursesAvailable: 0,
    totalRegisteredStudents: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = getUser();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await api.get("/reports/my");
        const data = response.data?.report || {};

        setReport({
          enrolledCourses: data.enrolledCourses || 0,
          distinctCategories: data.distinctCategories || 0,
          earliestEnrollment: data.earliestEnrollment || null,
          latestEnrollment: data.latestEnrollment || null,
          totalEnrolledValue: Number(data.totalEnrolledValue || 0),
          recentEnrollments: Array.isArray(data.recentEnrollments)
            ? data.recentEnrollments
            : [],
          categoryBreakdown: Array.isArray(data.categoryBreakdown)
            ? data.categoryBreakdown
            : [],
          totalCoursesAvailable: data.totalCoursesAvailable || 0,
          totalRegisteredStudents: data.totalRegisteredStudents || 0,
        });
      } catch (err) {
        // Robustness: Reporting failures should not crash the dashboard
        console.error("Failed to load student report:", err.message);
        setError(
          err.response?.data?.message || "Failed to load your learning report"
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const formatDate = (value) => {
    if (!value) return "None yet";
    return new Date(value).toLocaleDateString();
  };

  return (
    <>
      <Navbar />

      <div className="container">
        {/* ---------- Welcome Header ---------- */}
        <div className="page-header">
          <div>
            <h1>Student Dashboard</h1>
            <p className="page-subtitle">
              Welcome back, {user?.full_name || user?.username}! Here is a
              summary of your personal learning activity.
            </p>
          </div>

          <Link to="/courses" className="btn btn-primary">
            <FaSearch />
            Browse Courses
          </Link>
        </div>

        {/* ---------- Error Message ---------- */}
        {error && <p className="error">{error}</p>}

        {/* ---------- Personal Learning KPI Stat Cards ---------- */}
        <div className="dashboard-grid student-stats-grid">
          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : report.enrolledCourses}
            </span>
            <span className="dashboard-card-label">
              <FaGraduationCap className="icon" /> My Enrolled Courses
            </span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : report.distinctCategories}
            </span>
            <span className="dashboard-card-label">
              <FaLayerGroup className="icon" /> Distinct Categories
            </span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value font-date">
              {loading ? "..." : formatDate(report.earliestEnrollment)}
            </span>
            <span className="dashboard-card-label">
              <FaCalendarAlt className="icon" /> Earliest Enrollment
            </span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value font-date">
              {loading ? "..." : formatDate(report.latestEnrollment)}
            </span>
            <span className="dashboard-card-label">
              <FaCalendarCheck className="icon" /> Latest Enrollment
            </span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading
                ? "..."
                : `Rs. ${report.totalEnrolledValue.toLocaleString()}`}
            </span>
            <span className="dashboard-card-label">Total Course Value</span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : report.totalCoursesAvailable}
            </span>
            <span className="dashboard-card-label">Catalog Courses Available</span>
          </div>
        </div>

        {/* ---------- Category Breakdown Chips (if student has enrolled courses) ---------- */}
        {!loading && report.categoryBreakdown.length > 0 && (
          <div className="student-categories-bar">
            <span className="student-categories-title">
              My Learning Categories:
            </span>
            <div className="student-categories-chips">
              {report.categoryBreakdown.map((cat) => (
                <span key={cat.category} className="student-category-chip">
                  {cat.category}: <strong>{cat.count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ---------- Recent Enrollments ---------- */}
        <section className="section-card">
          <div className="section-card-header">
            <h2>My Recent Enrollments</h2>

            <Link to="/my-enrollments" className="link-inline">
              <FaEye /> View all
            </Link>
          </div>

          {loading && <p className="loading">Loading enrollments...</p>}

          {!loading && report.recentEnrollments.length === 0 && (
            <p className="empty">
              You have not enrolled in any courses yet. Browse the catalog to
              enroll in your first course!
            </p>
          )}

          {!loading && report.recentEnrollments.length > 0 && (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Duration</th>
                    <th>Enrolled On</th>
                  </tr>
                </thead>

                <tbody>
                  {report.recentEnrollments.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td>
                        <Link
                          to={`/courses/${enrollment.course_id}`}
                          className="font-weight-bold"
                        >
                          {enrollment.title}
                        </Link>
                      </td>
                      <td>{enrollment.category}</td>
                      <td>
                        <span className="tag tag-level">
                          {enrollment.level}
                        </span>
                      </td>
                      <td>{enrollment.duration || "-"}</td>
                      <td>{formatDate(enrollment.enrolled_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------- Quick Actions ---------- */}
        <section className="section-card">
          <div className="section-card-header">
            <h2>Quick Actions</h2>
          </div>

          <div className="quick-actions">
            <Link to="/courses" className="quick-action">
              <span className="quick-action-icon">
                <FaBook />
              </span>
              <span>Browse all courses</span>
            </Link>

            <Link to="/my-enrollments" className="quick-action">
              <span className="quick-action-icon">
                <FaGraduationCap />
              </span>
              <span>View my enrollments</span>
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}

export default StudentDashboard;
