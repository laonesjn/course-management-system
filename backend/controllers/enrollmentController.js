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


// Get all enrollments
const getAllEnrollments = async (req, res) => {
  try {
    const enrollments =
      await Enrollment.getAll();

    res.status(200).json({
      message: "All enrollments retrieved successfully",
      enrollments,
    });

  } catch (error) {
    console.error(
      "Error getting all enrollments:",
      error.message
    );

    res.status(500).json({
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
