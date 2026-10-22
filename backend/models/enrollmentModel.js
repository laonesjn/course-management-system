const db = require("../config/db");

const Enrollment = {

  // Create enrollment
  async create(studentId, courseId) {
    const [result] = await db.execute(
      `INSERT INTO enrollments
       (student_id, course_id)
       VALUES (?, ?)`,
      [studentId, courseId]
    );

    return result.insertId;
  },


  // Check if student is already enrolled
  async findByStudentAndCourse(studentId, courseId) {
    const [rows] = await db.execute(
      `SELECT *
       FROM enrollments
       WHERE student_id = ?
       AND course_id = ?`,
      [studentId, courseId]
    );

    return rows[0];
  },

  // Get enrollment by ID
  async getById(id) {
    const [rows] = await db.execute(
      `SELECT * FROM enrollments WHERE id = ?`,
      [id]
    );
    return rows[0];
  },


  // Get all courses enrolled by a student
  async getByStudent(studentId) {
    const [rows] = await db.execute(
      `SELECT
          e.id,
          e.enrolled_at,
          c.id AS course_id,
          c.title,
          c.category,
          c.level,
          c.duration,
          c.price,
          c.image,
          c.description
       FROM enrollments e
       JOIN courses c
         ON e.course_id = c.id
       WHERE e.student_id = ?
       ORDER BY e.enrolled_at DESC`,
      [studentId]
    );

    return rows;
  },


  // Get all students enrolled in a course
  async getByCourse(courseId) {
    const [rows] = await db.execute(
      `SELECT
          e.id,
          e.enrolled_at,
          u.id AS student_id,
          u.username,
          u.full_name
       FROM enrollments e
       JOIN users u
         ON e.student_id = u.id
       WHERE e.course_id = ?
       ORDER BY e.enrolled_at DESC`,
      [courseId]
    );

    return rows;
  },


  // Get all enrollments
  async getAll() {
    const [rows] = await db.execute(
      `SELECT
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

       JOIN users u
         ON e.student_id = u.id

       JOIN courses c
         ON e.course_id = c.id

       ORDER BY e.enrolled_at DESC`
    );

    return rows;
  },


  // Get enrollments with server-side search, filtering, sorting, and pagination
  async getAllPaginated({
    q = null,
    courseId = null,
    from = null,
    to = null,
    sortColumn = "e.enrolled_at",
    sortDirection = "DESC",
    page = 1,
    limit = 20,
  }) {
    const whereClauses = [];
    const params = [];

    // Search by student full name or student username
    if (q) {
      // Safely escape %, _, and \ for literal matching in LIKE
      const escapedQ = q.replace(/[%_\\]/g, "\\$&");
      whereClauses.push(
        "(u.full_name LIKE ? ESCAPE '\\\\' OR u.username LIKE ? ESCAPE '\\\\')"
      );
      params.push(`%${escapedQ}%`, `%${escapedQ}%`);
    }

    // Filter by course ID
    if (courseId) {
      whereClauses.push("e.course_id = ?");
      params.push(courseId);
    }

    // Date range filtering
    if (from) {
      whereClauses.push("e.enrolled_at >= ?");
      params.push(from);
    }

    if (to) {
      whereClauses.push("e.enrolled_at <= ?");
      params.push(to);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // 1. Separate COUNT(*) query with the exact same criteria
    const countSql = `
      SELECT COUNT(*) AS total
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN courses c ON e.course_id = c.id
      ${whereSql}
    `;

    const [countRows] = await db.execute(countSql, params);
    const total = Number(countRows[0]?.total || 0);

    // 2. Data retrieval query with pagination and stable secondary sort (e.id)
    const offset = (page - 1) * limit;

    const ALLOWED_COLUMNS = {
      "e.enrolled_at": "e.enrolled_at",
      "u.full_name": "u.full_name",
      "c.title": "c.title",
    };
    const validSortCol = ALLOWED_COLUMNS[sortColumn] || "e.enrolled_at";
    const validSortDir = sortDirection.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const dataSql = `
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
      ${whereSql}
      ORDER BY ${validSortCol} ${validSortDir}, e.id ${validSortDir}
      LIMIT ? OFFSET ?
    `;

    const [enrollments] = await db.execute(dataSql, [...params, limit, offset]);

    return {
      enrollments,
      total,
    };
  },


  // Delete enrollment
  async delete(id) {
    const [result] = await db.execute(
      `DELETE FROM enrollments
       WHERE id = ?`,
      [id]
    );

    return result;
  },

  // Delete enrollment by student
  async deleteByStudentAndId(id, studentId) {
    const [result] = await db.execute(
      `DELETE FROM enrollments
       WHERE id = ? AND student_id = ?`,
      [id, studentId]
    );

    return result;
  },

};

module.exports = Enrollment;
