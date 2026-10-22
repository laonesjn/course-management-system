import { useEffect, useState, useCallback } from "react";
import {
  FaTrash,
  FaSearch,
  FaFilter,
  FaRedo,
  FaAngleDoubleLeft,
  FaAngleLeft,
  FaAngleRight,
  FaAngleDoubleRight,
} from "react-icons/fa";

import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function ManageEnrollments() {
  // Course list for dropdown
  const [courses, setCourses] = useState([]);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortField, setSortField] = useState("enrolled_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Data state
  const [enrollments, setEnrollments] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // ---------- Load course options once ----------
  useEffect(() => {
    const loadCourseOptions = async () => {
      try {
        const response = await api.get("/courses");
        setCourses(response.data.courses || []);
      } catch (err) {
        console.error("Could not load course options:", err.message);
      }
    };

    loadCourseOptions();
  }, []);

  // ---------- Load enrollments from backend ----------
  const loadEnrollments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        limit,
        sort: sortField,
        order: sortOrder,
      };

      if (searchTerm.trim()) {
        params.q = searchTerm.trim();
      }
      if (selectedCourseId) {
        params.courseId = selectedCourseId;
      }
      if (fromDate) {
        params.from = fromDate;
      }
      if (toDate) {
        params.to = toDate;
      }

      const response = await api.get("/enrollments", { params });

      const fetchedEnrollments = response.data.enrollments || [];
      const fetchedPagination = response.data.pagination || {
        page,
        limit,
        total: 0,
        totalPages: 0,
      };

      // Page correction: If the current page is empty after deletion and earlier pages exist,
      // navigate to previous available page
      if (
        fetchedEnrollments.length === 0 &&
        fetchedPagination.total > 0 &&
        page > 1
      ) {
        setPage((prev) => Math.max(1, Math.min(prev - 1, fetchedPagination.totalPages)));
        return;
      }

      setEnrollments(fetchedEnrollments);
      setPagination(fetchedPagination);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load enrollments"
      );
      setEnrollments([]);
      setPagination({
        page,
        limit,
        total: 0,
        totalPages: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm,
    selectedCourseId,
    fromDate,
    toDate,
    sortField,
    sortOrder,
    page,
    limit,
  ]);

  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments, reloadKey]);

  // ---------- Filter change handlers (reset page to 1) ----------
  const handleSearchChange = (e) => {
    setSuccess("");
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleCourseChange = (e) => {
    setSuccess("");
    setSelectedCourseId(e.target.value);
    setPage(1);
  };

  const handleFromDateChange = (e) => {
    setSuccess("");
    setFromDate(e.target.value);
    setPage(1);
  };

  const handleToDateChange = (e) => {
    setSuccess("");
    setToDate(e.target.value);
    setPage(1);
  };

  const handleSortFieldChange = (e) => {
    setSuccess("");
    setSortField(e.target.value);
    setPage(1);
  };

  const handleSortOrderChange = (e) => {
    setSuccess("");
    setSortOrder(e.target.value);
    setPage(1);
  };

  const handleLimitChange = (e) => {
    setSuccess("");
    setLimit(parseInt(e.target.value, 10));
    setPage(1);
  };

  const handleResetFilters = () => {
    setSuccess("");
    setSearchTerm("");
    setSelectedCourseId("");
    setFromDate("");
    setToDate("");
    setSortField("enrolled_at");
    setSortOrder("desc");
    setLimit(20);
    setPage(1);
  };

  // ---------- Delete enrollment ----------
  const handleDelete = async (enrollment) => {
    const studentName = enrollment.full_name || enrollment.username;
    const courseTitle = enrollment.title ? ` from "${enrollment.title}"` : "";
    const confirmed = window.confirm(
      `Remove ${studentName}${courseTitle}?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/enrollments/${enrollment.id}`);
      setSuccess(response.data.message);

      // If we are deleting the last record on the current page and an earlier page exists,
      // navigate to the previous page
      if (enrollments.length === 1 && page > 1) {
        setPage((prevPage) => prevPage - 1);
      } else {
        setReloadKey((k) => k + 1);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not delete the enrollment."
      );
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
  };

  // Compute result range format: Showing 1–20 of 137 or Showing 0-0 of 0
  const getResultRange = () => {
    const total = pagination.total || 0;
    if (total === 0 || enrollments.length === 0) {
      return "Showing 0–0 of 0";
    }
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(start + enrollments.length - 1, total);
    return `Showing ${start}–${end} of ${total}`;
  };

  const isFirstDisabled = page <= 1 || pagination.totalPages === 0 || loading;
  const isPreviousDisabled = page <= 1 || pagination.totalPages === 0 || loading;
  const isNextDisabled =
    page >= pagination.totalPages || pagination.totalPages === 0 || loading;
  const isLastDisabled =
    page >= pagination.totalPages || pagination.totalPages === 0 || loading;

  return (
    <>
      <Navbar />

      <div className="container">
        <div className="page-header">
          <div>
            <h1>Manage Enrollments</h1>
            <p className="page-subtitle">
              Search, filter, sort, and manage student enrollments across all courses.
            </p>
          </div>
        </div>

        {/* ---------- Filter & Search Section ---------- */}
        <section className="section-card enrollment-filter-panel">
          <div className="section-card-header">
            <h2>
              <FaFilter className="icon" /> Filters & Search
            </h2>
            {(searchTerm || selectedCourseId || fromDate || toDate || sortField !== "enrolled_at" || sortOrder !== "desc" || limit !== 20) && (
              <button
                type="button"
                className="btn btn-small btn-outline"
                onClick={handleResetFilters}
              >
                <FaRedo className="icon" /> Reset Filters
              </button>
            )}
          </div>

          <div className="enrollment-filters-grid">
            {/* Student Search */}
            <div className="filter-group">
              <label htmlFor="student-search">Search Student</label>
              <div className="input-with-icon">
                <input
                  id="student-search"
                  type="text"
                  className="input"
                  placeholder="Student name or username..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>

            {/* Course Filter */}
            <div className="filter-group">
              <label htmlFor="course-filter">Filter by Course</label>
              <select
                id="course-filter"
                className="input"
                value={selectedCourseId}
                onChange={handleCourseChange}
              >
                <option value="">All Courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="filter-group">
              <label htmlFor="from-date">Enrolled From</label>
              <input
                id="from-date"
                type="date"
                className="input"
                value={fromDate}
                onChange={handleFromDateChange}
              />
            </div>

            {/* Date To */}
            <div className="filter-group">
              <label htmlFor="to-date">Enrolled To</label>
              <input
                id="to-date"
                type="date"
                className="input"
                value={toDate}
                onChange={handleToDateChange}
              />
            </div>

            {/* Sort Field */}
            <div className="filter-group">
              <label htmlFor="sort-field">Sort By</label>
              <select
                id="sort-field"
                className="input"
                value={sortField}
                onChange={handleSortFieldChange}
              >
                <option value="enrolled_at">Enrollment Date</option>
                <option value="student">Student Name</option>
                <option value="course">Course Name</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="filter-group">
              <label htmlFor="sort-order">Sort Order</label>
              <select
                id="sort-order"
                className="input"
                value={sortOrder}
                onChange={handleSortOrderChange}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            {/* Page Size */}
            <div className="filter-group">
              <label htmlFor="limit-select">Per Page</label>
              <select
                id="limit-select"
                className="input"
                value={limit}
                onChange={handleLimitChange}
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
          </div>
        </section>

        {/* ---------- Messages ---------- */}
        {success && <p className="success">{success}</p>}
        {error && <p className="error">{error}</p>}

        {/* ---------- Table & Pagination Section ---------- */}
        <section className="section-card">
          <div className="section-card-header enrollment-header-split">
            <div>
              <h2>Enrollment Records</h2>
              <span className="result-range-text">{getResultRange()}</span>
            </div>

            <div className="enrollment-meta-badge">
              <span>Page {pagination.totalPages === 0 ? 0 : page} of {pagination.totalPages}</span>
              <span className="dot-divider">•</span>
              <span>{pagination.total} total matching</span>
            </div>
          </div>

          {loading && <p className="loading">Loading enrollments...</p>}

          {!loading && enrollments.length === 0 && (
            <p className="empty">
              No enrollments found matching the selected criteria.
            </p>
          )}

          {!loading && enrollments.length > 0 && (
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
                    <th className="table-actions-column">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td>{enrollment.full_name}</td>
                      <td>{enrollment.username}</td>
                      <td>{enrollment.title}</td>
                      <td>{enrollment.category}</td>
                      <td>
                        <span className="tag tag-level">{enrollment.level}</span>
                      </td>
                      <td>{formatDate(enrollment.enrolled_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-small btn-danger"
                          onClick={() => handleDelete(enrollment)}
                        >
                          <FaTrash />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------- Pagination Controls ---------- */}
          <div className="pagination-bar">
            <div className="pagination-info">
              <span>{getResultRange()}</span>
              {pagination.total > 0 && (
                <span className="pagination-pages-info">
                  (Page {page} of {pagination.totalPages})
                </span>
              )}
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                id="btn-first-page"
                className="btn btn-small btn-outline-dark"
                onClick={() => setPage(1)}
                disabled={isFirstDisabled}
                aria-label="First page"
              >
                <FaAngleDoubleLeft className="icon" /> First
              </button>

              <button
                type="button"
                id="btn-prev-page"
                className="btn btn-small btn-outline-dark"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={isPreviousDisabled}
                aria-label="Previous page"
              >
                <FaAngleLeft className="icon" /> Previous
              </button>

              <span className="pagination-current-page">
                Page {pagination.totalPages === 0 ? 0 : page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                id="btn-next-page"
                className="btn btn-small btn-outline-dark"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={isNextDisabled}
                aria-label="Next page"
              >
                Next <FaAngleRight className="icon" />
              </button>

              <button
                type="button"
                id="btn-last-page"
                className="btn btn-small btn-outline-dark"
                onClick={() => setPage(pagination.totalPages)}
                disabled={isLastDisabled}
                aria-label="Last page"
              >
                Last <FaAngleDoubleRight className="icon" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}

export default ManageEnrollments;
