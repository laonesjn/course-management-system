import { useEffect, useState } from "react";

import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CourseCard from "../components/CourseCard";

function Courses() {

  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");


  // ---------- Load courses from the backend ----------
  useEffect(() => {

    const getCourses = async () => {

      try {

        const response = await api.get("/courses");

        // The backend always puts the array inside "courses".
        setCourses(response.data.courses);

      } catch (error) {

        setError(
          error.response?.data?.message ||
          "Failed to load courses"
        );

      } finally {

        setLoading(false);

      }
    };

    getCourses();

  }, []);


  // ---------- Build the category list from the loaded courses ----------
  const categories = [
    "All",
    ...new Set(courses.map((course) => course.category).filter(Boolean)),
  ];


  const clearFilters = () => {
    setSearchText("");
    setSelectedCategory("All");
    setSelectedLevel("All");
    setMinPrice("");
    setMaxPrice("");
  };


  const removeFilter = (filterName) => {
    const setters = {
      search: setSearchText,
      category: setSelectedCategory,
      level: setSelectedLevel,
      minPrice: setMinPrice,
      maxPrice: setMaxPrice,
    };

    setters[filterName](filterName === "category" || filterName === "level" ? "All" : "");
  };


  const activeFilters = [
    searchText && { name: "search", label: `Search: ${searchText}` },
    selectedCategory !== "All" && { name: "category", label: `Category: ${selectedCategory}` },
    selectedLevel !== "All" && { name: "level", label: `Level: ${selectedLevel}` },
    minPrice !== "" && { name: "minPrice", label: `Min price: Rs. ${minPrice}` },
    maxPrice !== "" && { name: "maxPrice", label: `Max price: Rs. ${maxPrice}` },
  ].filter(Boolean);


  // ---------- Apply every active filter using AND logic ----------
  const filteredCourses = courses.filter((course) => {

    const searchableText = [
      course.title,
      course.category,
      course.level,
      course.description,
      course.duration,
    ]
      .map((value) => String(value ?? "").toLowerCase())
      .join(" ");

    const matchesSearch = searchableText.includes(searchText.trim().toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      course.category === selectedCategory;

    const matchesLevel =
      selectedLevel === "All" || course.level === selectedLevel;

    const price = Number(course.price);
    const matchesMinPrice = minPrice === "" || price >= Number(minPrice);
    const matchesMaxPrice = maxPrice === "" || price <= Number(maxPrice);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesLevel &&
      matchesMinPrice &&
      matchesMaxPrice
    );
  });


  return (

    <>
      <Navbar />

      <div className="container">

        <div className="page-header">

          <div>
            <h1>Our Courses</h1>
            <p className="page-subtitle">
              Browse the full catalogue and view the details of any course.
            </p>
          </div>

        </div>


        {/* ---------- Filters ---------- */}

        {!loading && !error && courses.length > 0 && (

          <div className="filter-bar">

            <div className="filter-field filter-search-field">
              <label htmlFor="course-search">Search courses</label>
              <input
                id="course-search"
                type="search"
                className="input"
                placeholder="Title, topic, level, or duration"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="course-category">Category</label>
              <select
                id="course-category"
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
              <label htmlFor="course-level">Level</label>
              <select
                id="course-level"
                className="input"
                value={selectedLevel}
                onChange={(event) => setSelectedLevel(event.target.value)}
              >
                {['All', 'Beginner', 'Intermediate', 'Advanced'].map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field price-field">
              <label htmlFor="min-price">Price range</label>
              <div className="price-inputs">
                <input
                  id="min-price"
                  type="number"
                  className="input"
                  min="0"
                  placeholder="Min"
                  aria-label="Minimum price"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                />
                <span aria-hidden="true">to</span>
                <input
                  id="max-price"
                  type="number"
                  className="input"
                  min="0"
                  placeholder="Max"
                  aria-label="Maximum price"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                />
              </div>
            </div>

            <button type="button" className="btn btn-outline-dark clear-filters" onClick={clearFilters}>
              Clear All Filters
            </button>

            {activeFilters.length > 0 && (
              <div className="active-filters" aria-label="Active filters">
                {activeFilters.map((filter) => (
                  <button
                    type="button"
                    className="filter-chip"
                    key={filter.name}
                    onClick={() => removeFilter(filter.name)}
                    aria-label={`Remove ${filter.label}`}
                  >
                    {filter.label} <span aria-hidden="true">x</span>
                  </button>
                ))}
              </div>
            )}

          </div>

        )}


        {/* ---------- Loading state ---------- */}

        {loading && (
          <p className="loading">Loading courses...</p>
        )}


        {/* ---------- Error state ---------- */}

        {error && !loading && (
          <p className="error">{error}</p>
        )}


        {/* ---------- Empty state ---------- */}

        {!loading && !error && courses.length === 0 && (
          <p className="empty">
            No courses are currently available.
          </p>
        )}


        {!loading && !error && courses.length > 0 && (
          <p className="result-count">
            Showing {filteredCourses.length} of {courses.length} courses
          </p>
        )}


        {!loading && !error && courses.length > 0 && filteredCourses.length === 0 && (
          <p className="empty">
            No courses match your selected filters.
          </p>
        )}


        {/* ---------- Course list ---------- */}

        {!loading && !error && filteredCourses.length > 0 && (

          <>
            <div className="course-grid">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </>

        )}

      </div>

      <Footer />

    </>
  );
}

export default Courses;
