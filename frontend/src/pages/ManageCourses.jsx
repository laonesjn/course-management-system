import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaEdit,
  FaEye,
  FaPlus,
  FaSave,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";


const EMPTY_COURSE = {
  title: "",
  category: "",
  level: "Beginner",
  duration: "",
  price: "",
  image: "",
  description: "",
  max_students: "",
};

const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];


// Utility function to convert duration string into total days for numeric comparison
function parseDurationToDays(duration) {
  if (!duration) return 0;
  const str = String(duration).trim().toLowerCase();
  const match = str.match(/(\d+)\s*([a-z]+)?/);
  if (!match) return 0;
  const val = parseInt(match[1], 10);
  if (isNaN(val)) return 0;
  const unit = match[2] || "";
  if (unit.startsWith("week")) return val * 7;
  if (unit.startsWith("month")) return val * 30;
  if (unit.startsWith("year")) return val * 365;
  if (unit.startsWith("day")) return val;
  return val;
}


// Utility function to match course IDs (raw, padded C001 format, or leading C)
function matchesCourseId(courseId, term) {
  if (!term || courseId === undefined || courseId === null) return false;
  const cleanTerm = term.trim().toLowerCase();
  const rawId = String(courseId).trim().toLowerCase();
  const paddedId = `c${rawId.padStart(3, "0")}`;
  const cId = `c${rawId}`;

  return (
    rawId === cleanTerm ||
    paddedId === cleanTerm ||
    cId === cleanTerm ||
    rawId.includes(cleanTerm) ||
    paddedId.includes(cleanTerm) ||
    cId.includes(cleanTerm)
  );
}


// Utility function to check search query match across Title, Category, and Course ID
function matchesSearch(course, term) {
  if (!term || !term.trim()) return true;
  const cleanTerm = term.trim().toLowerCase();
  const titleMatch = String(course.title ?? "").toLowerCase().includes(cleanTerm);
  const categoryMatch = String(course.category ?? "").toLowerCase().includes(cleanTerm);
  const idMatch = matchesCourseId(course.id, cleanTerm);
  return titleMatch || categoryMatch || idMatch;
}


// Load the course list.
async function fetchAllCourses() {
  const response = await api.get("/courses");

  return response.data.courses;
}


function ManageCourses() {

  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search, Filter, and Sort states (CR-003)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  // Form visibility + which course is being edited (null = adding new)
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState(EMPTY_COURSE);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);


  // ---------- Load the course list once, when the page opens ----------
  useEffect(() => {

    const loadCourses = async () => {

      try {

        setCourses(await fetchAllCourses());

      } catch (error) {

        setError(
          error.response?.data?.message ||
          "Failed to load courses"
        );

      } finally {

        setLoading(false);

      }
    };

    loadCourses();

  }, []);


  // ---------- Reload the list after a create / update / delete ----------
  const refreshCourses = async () => {
    setCourses(await fetchAllCourses());
  };


  // ---------- Search, Filter, and Sort helpers (CR-003) ----------

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection((prevDirection) =>
        prevDirection === "asc" ? "desc" : "asc"
      );
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };


  const handleReset = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSelectedLevel("All");
    setSortColumn("");
    setSortDirection("asc");
  };


  // Dynamic categories list derived from loaded courses
  const categories = [
    "All",
    ...new Set(courses.map((course) => course.category).filter(Boolean)),
  ];


  // Combined filtering pipeline
  const filteredCourses = courses.filter((course) => {
    const matchesQuery = matchesSearch(course, searchTerm);
    const matchesCategory =
      selectedCategory === "All" || course.category === selectedCategory;
    const matchesLevel =
      selectedLevel === "All" || course.level === selectedLevel;

    return matchesQuery && matchesCategory && matchesLevel;
  });


  // Column sorting pipeline
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (!sortColumn) return 0;

    let comparison;

    switch (sortColumn) {
      case "id":
        comparison = (Number(a.id) || 0) - (Number(b.id) || 0);
        break;
      case "title":
        comparison = String(a.title ?? "")
          .toLowerCase()
          .localeCompare(String(b.title ?? "").toLowerCase());
        break;
      case "category":
        comparison = String(a.category ?? "")
          .toLowerCase()
          .localeCompare(String(b.category ?? "").toLowerCase());
        break;
      case "level":
        comparison = String(a.level ?? "")
          .toLowerCase()
          .localeCompare(String(b.level ?? "").toLowerCase());
        break;
      case "duration":
        comparison =
          parseDurationToDays(a.duration) - parseDurationToDays(b.duration);
        break;
      case "price":
        comparison = (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
        break;
      case "max_students":
        comparison = (a.max_students ?? Infinity) - (b.max_students ?? Infinity);
        break;
      default:
        comparison = 0;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });


  const renderSortableHeader = (columnKey, label) => {
    const isSorted = sortColumn === columnKey;
    const indicator = isSorted
      ? sortDirection === "asc"
        ? " ↑"
        : " ↓"
      : "";

    return (
      <th
        key={columnKey}
        className="th-sortable"
        onClick={() => handleSort(columnKey)}
        aria-sort={
          isSorted
            ? sortDirection === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        {label}
        <span className="sort-indicator">{indicator}</span>
      </th>
    );
  };


  // ---------- Form helpers ----------

  const handleChange = (event) => {

    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
  };


  const openAddForm = () => {
    setShowForm(true);
    setEditingId(null);
    setFormData(EMPTY_COURSE);
    setFormError("");
    setFieldErrors({});
    setError("");
    setSuccess("");
  };


  const openEditForm = (course) => {
    setShowForm(true);
    setEditingId(course.id);

    // Fill the form with the existing course values.
    setFormData({
      title: course.title || "",
      category: course.category || "",
      level: course.level || "Beginner",
      duration: course.duration || "",
      price: String(course.price ?? ""),
      image: course.image || "",
      description: course.description || "",
      max_students:
        course.max_students !== null && course.max_students !== undefined
          ? String(course.max_students)
          : "",
    });

    setFormError("");
    setFieldErrors({});
    setError("");
    setSuccess("");
  };


  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_COURSE);
    setFormError("");
    setFieldErrors({});
  };


  // ---------- Create / Update ----------
  const handleSubmit = async (event) => {

    // Stop the browser from reloading the page
    event.preventDefault();

    setFormError("");
    setFieldErrors({});
    setError("");
    setSuccess("");


    // ---------- Client side validation ----------
    if (
      !formData.title.trim() ||
      !formData.category.trim() ||
      !formData.level
    ) {
      setFormError("Title, category and level are required.");
      return;
    }

    if (!formData.duration.trim()) {
      setFormError("Duration is required (for example: 8 Weeks).");
      return;
    }

    if (formData.price === "" || Number(formData.price) < 0) {
      setFormError("Please enter a valid price.");
      return;
    }


    const maxStudentsVal = String(formData.max_students ?? "").trim();

    // The backend expects price to be a number
    const coursePayload = {
      title: formData.title.trim(),
      category: formData.category.trim(),
      level: formData.level,
      duration: formData.duration.trim(),
      price: Number(formData.price),
      image: formData.image.trim(),
      description: formData.description.trim(),
      max_students: maxStudentsVal !== "" ? Number(maxStudentsVal) : null,
    };


    setSaving(true);

    try {

      if (editingId) {

        // ---------- Update an existing course ----------
        const response = await api.put(
          `/courses/${editingId}`,
          coursePayload
        );

        setSuccess(response.data.message);

      } else {

        // ---------- Create a new course ----------
        const response = await api.post("/courses", coursePayload);

        setSuccess(response.data.message);

      }

      closeForm();

      // Show fresh data from the backend while preserving search/filter/sort state
      await refreshCourses();

    } catch (error) {

      const responseData = error.response?.data;

      setFormError(
        responseData?.message ||
        "Could not save the course. Please try again."
      );
      setFieldErrors(responseData?.errors || {});

    } finally {

      setSaving(false);

    }
  };


  // ---------- Delete ----------
  const handleDelete = async (course) => {

    // Always confirm before a destructive action
    const confirmed = window.confirm(
      `Delete "${course.title}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {

      const response = await api.delete(`/courses/${course.id}`);

      setSuccess(response.data.message);

      await refreshCourses();

    } catch (error) {

      setError(
        error.response?.data?.message ||
        "Could not delete the course."
      );

    }
  };



  return (

    <>
      <Navbar />

      <div className="container">

        <div className="page-header">

          <div>
            <h1>Manage Courses</h1>

            <p className="page-subtitle">
              Add new courses, update the existing ones, or remove courses
              that are no longer offered.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={showForm ? closeForm : openAddForm}
          >
            {showForm ? <FaTimes /> : <FaPlus />}
            {showForm ? "Cancel" : "Add Course"}
          </button>

        </div>


        {/* ---------- Success / error messages ---------- */}

        {success && <p className="success">{success}</p>}

        {error && <p className="error">{error}</p>}


        {/* ---------- Add / Edit form ---------- */}

        {showForm && (

          <section className="section-card">

            <div className="section-card-header">
              <h2>{editingId ? "Edit Course" : "New Course"}</h2>
            </div>


            <form className="form" onSubmit={handleSubmit}>

              <div className="form-row">

                <div className="form-group">
                  <label htmlFor="title">Title *</label>

                  <input
                    id="title"
                    className={`input${fieldErrors.title ? " input-error" : ""}`}
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. React"
                    aria-invalid={Boolean(fieldErrors.title)}
                    aria-describedby={fieldErrors.title ? "title-error" : undefined}
                  />
                  {fieldErrors.title && <p id="title-error" className="field-error">{fieldErrors.title}</p>}
                </div>


                <div className="form-group">
                  <label htmlFor="category">Category *</label>

                  <input
                    id="category"
                    className={`input${fieldErrors.category ? " input-error" : ""}`}
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="e.g. Frontend"
                    aria-invalid={Boolean(fieldErrors.category)}
                    aria-describedby={fieldErrors.category ? "category-error" : undefined}
                  />
                  {fieldErrors.category && <p id="category-error" className="field-error">{fieldErrors.category}</p>}
                </div>

              </div>


              <div className="form-row">

                <div className="form-group">
                  <label htmlFor="level">Level *</label>

                  <select
                    id="level"
                    className={`input${fieldErrors.level ? " input-error" : ""}`}
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    aria-invalid={Boolean(fieldErrors.level)}
                    aria-describedby={fieldErrors.level ? "level-error" : undefined}
                  >
                    {LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.level && <p id="level-error" className="field-error">{fieldErrors.level}</p>}
                </div>


                <div className="form-group">
                  <label htmlFor="duration">Duration *</label>

                  <input
                    id="duration"
                    className={`input${fieldErrors.duration ? " input-error" : ""}`}
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    placeholder="e.g. 10 Weeks"
                    aria-invalid={Boolean(fieldErrors.duration)}
                    aria-describedby={fieldErrors.duration ? "duration-error" : undefined}
                  />
                  {fieldErrors.duration && <p id="duration-error" className="field-error">{fieldErrors.duration}</p>}
                </div>


                <div className="form-group">
                  <label htmlFor="price">Price (Rs.) *</label>

                  <input
                    id="price"
                    className={`input${fieldErrors.price ? " input-error" : ""}`}
                    type="number"
                    min="0"
                    step="0.01"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="e.g. 25000"
                    aria-invalid={Boolean(fieldErrors.price)}
                    aria-describedby={fieldErrors.price ? "price-error" : undefined}
                  />
                  {fieldErrors.price && <p id="price-error" className="field-error">{fieldErrors.price}</p>}
                </div>


                <div className="form-group">
                  <label htmlFor="max_students">Maximum Students</label>

                  <input
                    id="max_students"
                    className={`input${fieldErrors.max_students ? " input-error" : ""}`}
                    type="number"
                    min="1"
                    name="max_students"
                    value={formData.max_students}
                    onChange={handleChange}
                    placeholder="Blank for Unlimited"
                    aria-invalid={Boolean(fieldErrors.max_students)}
                    aria-describedby={fieldErrors.max_students ? "max_students-error" : undefined}
                  />
                  {fieldErrors.max_students && <p id="max_students-error" className="field-error">{fieldErrors.max_students}</p>}
                </div>

              </div>


              <div className="form-group">
                <label htmlFor="image">Image URL</label>

                <input
                  id="image"
                  className={`input${fieldErrors.image ? " input-error" : ""}`}
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://placehold.co/300x180?text=React"
                  aria-invalid={Boolean(fieldErrors.image)}
                  aria-describedby={fieldErrors.image ? "image-error" : undefined}
                />
                {fieldErrors.image && <p id="image-error" className="field-error">{fieldErrors.image}</p>}
              </div>


              <div className="form-group">
                <label htmlFor="description">Description</label>

                <textarea
                  id="description"
                  className={`input${fieldErrors.description ? " input-error" : ""}`}
                  rows="4"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Short summary of what students will learn."
                  aria-invalid={Boolean(fieldErrors.description)}
                  aria-describedby={fieldErrors.description ? "description-error" : undefined}
                />
                {fieldErrors.description && <p id="description-error" className="field-error">{fieldErrors.description}</p>}
              </div>


              {formError && <p className="error">{formError}</p>}


              <div className="form-actions">

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  <FaSave />
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Course"
                      : "Create Course"}
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeForm}
                  disabled={saving}
                >
                  <FaTimes />
                  Cancel
                </button>

              </div>

            </form>

          </section>

        )}



        {/* ---------- Course table ---------- */}

        <section className="section-card">

          <div className="section-card-header">
            <h2>All Courses{courses.length > 0 ? ` (${courses.length})` : ""}</h2>

            <Link to="/admin/enrollments" className="link-inline">
              <FaEye /> Manage enrollments
            </Link>
          </div>


          {/* ---------- Search & Filter Bar ---------- */}
          {!loading && courses.length > 0 && (
            <div className="filter-bar filter-bar-admin">

              <div className="filter-field filter-search-field">
                <label htmlFor="course-search">Search courses</label>
                <input
                  id="course-search"
                  type="text"
                  className="input"
                  placeholder="Title, category, or course ID (e.g. C001)..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <div className="filter-field">
                <label htmlFor="course-category-filter">Category</label>
                <select
                  id="course-category-filter"
                  className="input"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-field">
                <label htmlFor="course-level-filter">Level</label>
                <select
                  id="course-level-filter"
                  className="input"
                  value={selectedLevel}
                  onChange={(event) => setSelectedLevel(event.target.value)}
                >
                  {["All", ...LEVEL_OPTIONS].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="btn btn-outline-dark"
                onClick={handleReset}
              >
                Reset Filters
              </button>

            </div>
          )}


          {loading && <p className="loading">Loading courses...</p>}


          {!loading && courses.length === 0 && (
            <p className="empty">
              No courses yet. Click "Add Course" to create the first one.
            </p>
          )}


          {!loading && courses.length > 0 && (

            <>
              <p className="result-count">
                Showing {sortedCourses.length} of {courses.length} courses
              </p>

              {sortedCourses.length === 0 ? (
                <p className="empty">No courses found.</p>
              ) : (

                <div className="table-wrapper">

                  <table className="table">

                    <thead>
                      <tr>
                        {renderSortableHeader("id", "ID")}
                        <th>Image</th>
                        {renderSortableHeader("title", "Title")}
                        {renderSortableHeader("category", "Category")}
                        {renderSortableHeader("level", "Level")}
                        {renderSortableHeader("duration", "Duration")}
                        {renderSortableHeader("price", "Price")}
                        {renderSortableHeader("max_students", "Capacity")}
                        <th className="table-actions-column">Actions</th>
                      </tr>
                    </thead>

                    <tbody>

                      {sortedCourses.map((course) => (

                        <tr key={course.id}>

                          <td>{course.id}</td>

                          <td>
                            <img
                              src={course.image}
                              alt={course.title}
                              className="table-thumb"
                            />
                          </td>

                          <td>{course.title}</td>

                          <td>{course.category}</td>

                          <td>
                            <span className="tag tag-level">
                              {course.level}
                            </span>
                          </td>

                          <td>{course.duration}</td>

                          <td>Rs. {course.price}</td>

                          <td>
                            {course.max_students !== null && course.max_students !== undefined
                              ? `${course.enrolled_count ?? 0}/${course.max_students}`
                              : `Unlimited (${course.enrolled_count ?? 0})`}
                          </td>

                          <td>
                            <div className="table-actions">

                              <button
                                type="button"
                                className="btn btn-small btn-outline"
                                onClick={() => openEditForm(course)}
                              >
                                <FaEdit />
                                Edit
                              </button>

                              <button
                                type="button"
                                className="btn btn-small btn-danger"
                                onClick={() => handleDelete(course)}
                              >
                                <FaTrash />
                                Delete
                              </button>

                            </div>
                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}
            </>

          )}

        </section>

      </div>

      <Footer />

    </>
  );
}

export default ManageCourses;
