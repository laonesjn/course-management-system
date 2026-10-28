const db = require("../config/db");

const Report = {
  // Get system-wide overview statistics for administrators
  // Uses SQL aggregation without loops or N+1 queries.
  // Note: Since current schema does not have a status column, all records in enrollments
  // represent active enrollments. If CR-011 introduces a status column (e.g. pending/approved),
  // queries should filter by status = 'approved' where applicable.
  async getAdminOverview() {
    // 1. Scalar summary metrics
    const [
      [[coursesCount]],
      [[studentsCount]],
      [[enrollmentsCount]],
      [[activeStudentsCount]],
      [[last30DaysCount]],
      [[noEnrollmentCoursesCount]],
      [categoryBreakdown],
      [topCourses],
      [recentEnrollments],
    ] = await Promise.all([
      // Total courses
      db.execute("SELECT COUNT(*) AS total_courses FROM courses"),

      // Total students
      db.execute("SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'"),

      // Total enrollments
      db.execute("SELECT COUNT(*) AS total_enrollments FROM enrollments"),

      // Number of distinct students with at least one enrollment
      db.execute("SELECT COUNT(DISTINCT student_id) AS students_with_enrollments FROM enrollments"),

      // Enrollments during the last 30 days
      db.execute(
        "SELECT COUNT(*) AS enrollments_last_30_days FROM enrollments WHERE enrolled_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
      ),

      // Number of courses with no enrollments
      db.execute(
        "SELECT COUNT(*) AS courses_with_no_enrollments FROM courses c LEFT JOIN enrollments e ON c.id = e.course_id WHERE e.id IS NULL"
      ),

      // Enrollments by category (all categories included with left join)
      db.execute(`
        SELECT 
          c.category, 
          COUNT(e.id) AS enrollment_count
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        GROUP BY c.category
        ORDER BY enrollment_count DESC, c.category ASC
      `),

      // Top five courses by enrollment count
      db.execute(`
        SELECT 
          c.id, 
          c.title, 
          c.category, 
          c.level, 
          COUNT(e.id) AS enrollment_count
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        GROUP BY c.id, c.title, c.category, c.level
        ORDER BY enrollment_count DESC, c.title ASC
        LIMIT 5
      `),

      // Recent enrollments (up to 6) for dashboard preview
      db.execute(`
        SELECT 
          e.id,
          e.enrolled_at,
          u.id AS student_id,
          u.username,
          u.full_name,
          c.id AS course_id,
          c.title,
          c.category,
          c.level
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        JOIN courses c ON e.course_id = c.id
        ORDER BY e.enrolled_at DESC
        LIMIT 6
      `),
    ]);

    return {
      totalCourses: Number(coursesCount?.total_courses || 0),
      totalStudents: Number(studentsCount?.total_students || 0),
      totalEnrollments: Number(enrollmentsCount?.total_enrollments || 0),
      studentsWithEnrollments: Number(activeStudentsCount?.students_with_enrollments || 0),
      enrollmentsLast30Days: Number(last30DaysCount?.enrollments_last_30_days || 0),
      coursesWithNoEnrollments: Number(noEnrollmentCoursesCount?.courses_with_no_enrollments || 0),
      categories: categoryBreakdown.map((row) => ({
        category: row.category,
        enrollment_count: Number(row.enrollment_count || 0),
        count: Number(row.enrollment_count || 0),
      })),
      topCourses: topCourses.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        level: row.level,
        enrollment_count: Number(row.enrollment_count || 0),
        count: Number(row.enrollment_count || 0),
      })),
      recentEnrollments,
    };
  },

  // Get personal reporting statistics for a logged-in student
  async getStudentReport(studentId) {
    const [
      [[summary]],
      [recentEnrollments],
      [categoryBreakdown],
      [[coursesCount]],
      [[studentsCount]],
    ] = await Promise.all([
      // Core student metrics: enrolled courses, distinct categories, earliest & latest enrollment, total value
      db.execute(
        `
        SELECT
          COUNT(e.id) AS enrolled_courses,
          COUNT(DISTINCT c.category) AS distinct_categories,
          MIN(e.enrolled_at) AS earliest_enrollment,
          MAX(e.enrolled_at) AS latest_enrollment,
          COALESCE(SUM(c.price), 0) AS total_enrolled_value
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ?
        `,
        [studentId]
      ),

      // Recent enrollments for this student (up to 5)
      db.execute(
        `
        SELECT 
          e.id, 
          e.enrolled_at, 
          c.id AS course_id, 
          c.title, 
          c.category, 
          c.level, 
          c.duration,
          c.price
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ?
        ORDER BY e.enrolled_at DESC
        LIMIT 5
        `,
        [studentId]
      ),

      // Category breakdown for this student
      db.execute(
        `
        SELECT 
          c.category, 
          COUNT(e.id) AS count
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ?
        GROUP BY c.category
        ORDER BY count DESC, c.category ASC
        `,
        [studentId]
      ),

      // Overall catalog counts to populate student dashboard stat cards without extra endpoints
      db.execute("SELECT COUNT(*) AS total_courses FROM courses"),
      db.execute("SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'"),
    ]);

    return {
      enrolledCourses: Number(summary?.enrolled_courses || 0),
      distinctCategories: Number(summary?.distinct_categories || 0),
      earliestEnrollment: summary?.earliest_enrollment || null,
      latestEnrollment: summary?.latest_enrollment || null,
      totalEnrolledValue: Number(summary?.total_enrolled_value || 0),
      recentEnrollments,
      categoryBreakdown: categoryBreakdown.map((row) => ({
        category: row.category,
        count: Number(row.count || 0),
      })),
      totalCoursesAvailable: Number(coursesCount?.total_courses || 0),
      totalRegisteredStudents: Number(studentsCount?.total_students || 0),
    };
  },
};

module.exports = Report;
