import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBook,
  FaChartBar,
  FaSearch,
  FaUsers,
  FaCalendarAlt,
  FaExclamationCircle,
  FaTrophy,
  FaLayerGroup,
} from "react-icons/fa";

import api from "../services/api";
import { getUser } from "../services/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function AdminDashboard() {
  const [report, setReport] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalEnrollments: 0,
    studentsWithEnrollments: 0,
    enrollmentsLast30Days: 0,
    coursesWithNoEnrollments: 0,
    categories: [],
    topCourses: [],
    recentEnrollments: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = getUser();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await api.get("/reports/overview");
        const data = response.data?.report || {};

        setReport({
          totalCourses: data.totalCourses || 0,
          totalStudents: data.totalStudents || 0,
          totalEnrollments: data.totalEnrollments || 0,
          studentsWithEnrollments: data.studentsWithEnrollments || 0,
          enrollmentsLast30Days: data.enrollmentsLast30Days || 0,
          coursesWithNoEnrollments: data.coursesWithNoEnrollments || 0,
          categories: Array.isArray(data.categories) ? data.categories : [],
          topCourses: Array.isArray(data.topCourses) ? data.topCourses : [],
          recentEnrollments: Array.isArray(data.recentEnrollments)
            ? data.recentEnrollments
            : [],
        });
      } catch (err) {
        // Robustness: Reporting failures should not crash the dashboard
        console.error("Failed to load admin overview report:", err.message);
        setError(
          err.response?.data?.message || "Failed to load dashboard reporting data"
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
  };

  // Safe percentage helper with NaN protection
  const getPercentage = (count, total) => {
    if (!total || total <= 0 || !count || count <= 0) return 0;
    const pct = (count / total) * 100;
    return isNaN(pct) ? 0 : Math.round(pct);
  };

  return (
    <>
      <Navbar />

      <div className="container">
        {/* ---------- Welcome Header ---------- */}
        <div className="page-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="page-subtitle">
              Welcome back, {user?.full_name || user?.username}. Here is the
              system-wide performance and reporting overview.
            </p>
          </div>

          <Link to="/admin/courses" className="btn btn-primary">
            <FaChartBar />
            Manage Courses
          </Link>
        </div>

        {error && <p className="error">{error}</p>}

        {/* ---------- Core KPI Stat Cards ---------- */}
        <div className="dashboard-grid admin-stats-grid">
          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : report.totalCourses}
            </span>
            <span className="dashboard-card-label">Total Courses</span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : report.totalStudents}
            </span>
            <span className="dashboard-card-label">Total Students</span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : report.totalEnrollments}
            </span>
            <span className="dashboard-card-label">Total Enrollments</span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : report.studentsWithEnrollments}
            </span>
            <span className="dashboard-card-label">Students with Enrollments</span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : report.enrollmentsLast30Days}
            </span>
            <span className="dashboard-card-label">
              <FaCalendarAlt className="icon" /> Last 30 Days Enrollments
            </span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : report.coursesWithNoEnrollments}
            </span>
            <span className="dashboard-card-label">
              <FaExclamationCircle className="icon" /> Courses with No Enrollments
            </span>
          </div>
        </div>

        {/* ---------- Analytics Row: Top 5 Courses & Category Breakdown ---------- */}
        <div className="analytics-grid">
          {/* Top 5 Courses by Enrollment */}
          <section className="section-card">
            <div className="section-card-header">
              <h2>
                <FaTrophy className="icon text-warning" /> Top 5 Courses by Enrollments
              </h2>
              <Link to="/admin/courses" className="link-inline">
                View catalog
              </Link>
            </div>

            {loading && <p className="loading">Loading top courses...</p>}

            {!loading && report.topCourses.length === 0 && (
              <p className="empty">No course enrollment data available yet.</p>
            )}

            {!loading && report.topCourses.length > 0 && (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px" }}>Rank</th>
                      <th>Course</th>
                      <th>Category</th>
                      <th>Level</th>
                      <th style={{ textAlign: "right" }}>Enrollments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topCourses.map((course, idx) => (
                      <tr key={course.id}>
                        <td>
                          <span className={`rank-badge rank-${idx + 1}`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/courses/${course.id}`}
                            className="font-weight-bold"
                          >
                            {course.title}
                          </Link>
                        </td>
                        <td>{course.category}</td>
                        <td>
                          <span className="tag tag-level">{course.level}</span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "bold" }}>
                          {course.enrollment_count ?? course.count ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Category Breakdown with CSS Bars */}
          <section className="section-card">
            <div className="section-card-header">
              <h2>
                <FaLayerGroup className="icon text-primary" /> Enrollments by Category
              </h2>
            </div>

            {loading && <p className="loading">Loading category breakdown...</p>}

            {!loading && report.categories.length === 0 && (
              <p className="empty">No category data available yet.</p>
            )}

            {!loading && report.categories.length > 0 && (
              <div className="category-breakdown-list">
                {report.categories.map((item) => {
                  const count = item.enrollment_count ?? item.count ?? 0;
                  const pct = getPercentage(count, report.totalEnrollments);

                  return (
                    <div key={item.category} className="category-bar-row">
                      <div className="category-bar-header">
                        <span className="category-name">{item.category}</span>
                        <span className="category-stats">
                          <strong>{count}</strong>{" "}
                          <span className="text-muted">({pct}%)</span>
                        </span>
                      </div>
                      <div className="category-bar-track">
                        <div
                          className="category-bar-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ---------- Recent Enrollments Table ---------- */}
        <section className="section-card">
          <div className="section-card-header">
            <h2>Recent Enrollments</h2>

            <Link to="/admin/enrollments" className="link-inline">
              Manage enrollments
            </Link>
          </div>

          {loading && <p className="loading">Loading recent enrollments...</p>}

          {!loading && report.recentEnrollments.length === 0 && (
            <p className="empty">No enrollments have been made yet.</p>
          )}

          {!loading && report.recentEnrollments.length > 0 && (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Username</th>
                    <th>Course</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Enrolled On</th>
                  </tr>
                </thead>

                <tbody>
                  {report.recentEnrollments.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td>{enrollment.full_name}</td>
                      <td>{enrollment.username}</td>
                      <td>{enrollment.title}</td>
                      <td>{enrollment.category}</td>
                      <td>
                        <span className="tag tag-level">
                          {enrollment.level}
                        </span>
                      </td>
                      <td>{formatDate(enrollment.enrolled_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------- Admin Shortcuts ---------- */}
        <section className="section-card">
          <div className="section-card-header">
            <h2>Administration</h2>
          </div>

          <div className="quick-actions">
            <Link to="/admin/courses" className="quick-action">
              <span className="quick-action-icon">
                <FaBook />
              </span>
              <span>Add, edit and delete courses</span>
            </Link>

            <Link to="/admin/enrollments" className="quick-action">
              <span className="quick-action-icon">
                <FaUsers />
              </span>
              <span>View and remove enrollments</span>
            </Link>

            <Link to="/courses" className="quick-action">
              <span className="quick-action-icon">
                <FaSearch />
              </span>
              <span>See the public course list</span>
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}

export default AdminDashboard;
