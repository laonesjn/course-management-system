const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");

const db = require("../config/db");

// Enroll in a course
const enrollInCourse = async (req, res) => {
  let connection;
  try {
    const { courseId } = req.body;
    const studentId = req.user.id;

    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required" });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [courses] = await connection.execute(
      'SELECT *, CAST((SELECT COUNT(*) FROM enrollments WHERE course_id = ?) AS UNSIGNED) AS enrolled_count FROM courses WHERE id = ? FOR UPDATE',
      [courseId, courseId]
    );

    const course = courses[0];
    if (!course) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "Course not found" });
    }

    const [existing] = await connection.execute(
      'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );
    if (existing.length > 0) {
      await connection.rollback();
      connection.release();
      return res.status(409).json({ message: "You are already enrolled in this course" });
    }

    if (course.max_students !== null && course.enrolled_count >= course.max_students) {
      await connection.rollback();
      connection.release();
      return res.status(409).json({ message: "Course is full" });
    }

    const [result] = await connection.execute(
      'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
      [studentId, courseId]
    );

    await connection.commit();
    connection.release();

    res.status(201).json({
      message: "Course enrollment successful",
      enrollmentId: result.insertId,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error("Error enrolling in course:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};


// Get logged-in student's courses
const getMyEnrollments = async (req, res) => {
  try {
    const studentId = req.user.id;

    const enrollments =
      await Enrollment.getByStudent(studentId);

    res.status(200).json({
      message: "Enrollments retrieved successfully",
      enrollments,
    });

  } catch (error) {
    console.error(
      "Error getting student enrollments:",
      error.message
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Get students enrolled in a course
const getCourseEnrollments = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check whether course exists
    const course = await Course.getById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    const enrollments =
      await Enrollment.getByCourse(courseId);

    res.status(200).json({
      message: "Course enrollments retrieved successfully",
      course,
      enrollments,
    });

  } catch (error) {
    console.error(
      "Error getting course enrollments:",
      error.message
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Helper function to validate date boundaries
const parseDateBoundary = (dateStr, isEnd = false) => {
  if (dateStr === undefined || dateStr === null || dateStr === "") {
    return { value: null };
  }
  if (typeof dateStr !== "string") {
    return { error: "Date must be a string." };
  }
  const trimmed = dateStr.trim();
  if (!trimmed) {
    return { value: null };
  }

  // Strict YYYY-MM-DD format
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { error: "Invalid calendar date." };
    }
    const d = new Date(Date.UTC(year, month - 1, day));
    if (
      d.getUTCFullYear() !== year ||
      d.getUTCMonth() !== month - 1 ||
      d.getUTCDate() !== day
    ) {
      return { error: "Invalid calendar date." };
    }
    return {
      value: isEnd ? `${trimmed} 23:59:59` : `${trimmed} 00:00:00`,
      dateOnly: trimmed,
      timestamp: isEnd ? d.getTime() + 86399000 : d.getTime(),
    };
  }

  // Allow standard ISO / datetime formats
  const ts = Date.parse(trimmed);
  if (isNaN(ts)) {
    return { error: "Malformed date." };
  }
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const dateOnly = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return {
    value: formatted,
    dateOnly,
    timestamp: ts,
  };
};

const SORT_ALLOWLIST = {
  date: "e.enrolled_at",
  enrolled_at: "e.enrolled_at",
  "enrollment date": "e.enrolled_at",
  enrollment_date: "e.enrolled_at",
  student: "u.full_name",
  "student name": "u.full_name",
  student_name: "u.full_name",
  name: "u.full_name",
  full_name: "u.full_name",
  course: "c.title",
  "course name": "c.title",
  course_name: "c.title",
  "course title": "c.title",
  course_title: "c.title",
  title: "c.title",
};

// Get all enrollments with server-side search, filtering, sorting, and pagination
const getAllEnrollments = async (req, res) => {
  try {
    // Administrator authorization check
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
      });
    }

    const { q, courseId, from, to, sort, order, page, limit } = req.query;

    // Validate page
    let parsedPage = 1;
    if (page !== undefined && page !== null && page !== "") {
      const pageStr = String(page).trim();
      if (!/^\d+$/.test(pageStr)) {
        return res.status(400).json({
          message: "Invalid page parameter. Page must be a positive integer starting from 1.",
        });
      }
      parsedPage = parseInt(pageStr, 10);
      if (parsedPage < 1) {
        return res.status(400).json({
          message: "Invalid page parameter. Page must be a positive integer starting from 1.",
        });
      }
    }

    // Validate limit
    let parsedLimit = 20;
    if (limit !== undefined && limit !== null && limit !== "") {
      const limitStr = String(limit).trim();
      if (!/^\d+$/.test(limitStr)) {
        return res.status(400).json({
          message: "Invalid limit parameter. Limit must be an integer between 1 and 100.",
        });
      }
      parsedLimit = parseInt(limitStr, 10);
      if (parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({
          message: "Invalid limit parameter. Limit must be an integer between 1 and 100.",
        });
      }
    }

    // Validate courseId
    let parsedCourseId = null;
    if (courseId !== undefined && courseId !== null && courseId !== "") {
      const courseIdStr = String(courseId).trim();
      if (!/^\d+$/.test(courseIdStr) || parseInt(courseIdStr, 10) <= 0) {
        return res.status(400).json({
          message: "Invalid course ID parameter.",
        });
      }
      parsedCourseId = parseInt(courseIdStr, 10);
    }

    // Validate from and to dates
    let fromParsed = { value: null };
    let toParsed = { value: null };

    if (from !== undefined && from !== null && from !== "") {
      fromParsed = parseDateBoundary(from, false);
      if (fromParsed.error) {
        return res.status(400).json({
          message: "Invalid 'from' date parameter.",
        });
      }
    }

    if (to !== undefined && to !== null && to !== "") {
      toParsed = parseDateBoundary(to, true);
      if (toParsed.error) {
        return res.status(400).json({
          message: "Invalid 'to' date parameter.",
        });
      }
    }

    if (fromParsed.value && toParsed.value) {
      if (
        (fromParsed.dateOnly &&
          toParsed.dateOnly &&
          fromParsed.dateOnly > toParsed.dateOnly) ||
        fromParsed.timestamp > toParsed.timestamp
      ) {
        return res.status(400).json({
          message: "Invalid date range: 'from' date cannot be later than 'to' date.",
        });
      }
    }

    // Validate sort
    let sortColumn = "e.enrolled_at";
    if (sort !== undefined && sort !== null && sort !== "") {
      const sortKey = String(sort).toLowerCase().trim();
      if (!SORT_ALLOWLIST[sortKey]) {
        return res.status(400).json({
          message: "Invalid sort field. Supported sort fields: enrollment date, student, course.",
        });
      }
      sortColumn = SORT_ALLOWLIST[sortKey];
    }

    // Validate order
    let sortDirection = "DESC";
    if (order !== undefined && order !== null && order !== "") {
      const orderKey = String(order).toLowerCase().trim();
      if (orderKey !== "asc" && orderKey !== "desc") {
        return res.status(400).json({
          message: "Invalid sort direction. Supported sort directions: asc, desc.",
        });
      }
      sortDirection = orderKey.toUpperCase();
    }

    // Execute queries
    const { enrollments, total } = await Enrollment.getAllPaginated({
      q: q ? String(q).trim() : null,
      courseId: parsedCourseId,
      from: fromParsed.value,
      to: toParsed.value,
      sortColumn,
      sortDirection,
      page: parsedPage,
      limit: parsedLimit,
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / parsedLimit);

    return res.status(200).json({
      message: "Enrollments retrieved successfully",
      enrollments,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error getting all enrollments:", error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Delete enrollment
const deleteEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    const result =
      await Enrollment.delete(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Enrollment not found",
      });
    }

    res.status(200).json({
      message: "Enrollment deleted successfully",
    });

  } catch (error) {
    console.error(
      "Error deleting enrollment:",
      error.message
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Cancel student's own enrollment
const cancelMyEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid enrollment ID" });
    }

    const existing = await Enrollment.getById(id);
    if (!existing) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    if (existing.student_id !== studentId) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    const result = await Enrollment.deleteByStudentAndId(id, studentId);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    res.status(200).json({ message: "Enrollment cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling enrollment:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};



module.exports = {
  enrollInCourse,
  getMyEnrollments,
  getCourseEnrollments,
  getAllEnrollments,
  deleteEnrollment,
  cancelMyEnrollment,
};
