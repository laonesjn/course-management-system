const db = require("../config/db");

function trimValue(value) {
  if (typeof value !== "string") {
    return value;
  }

  const str = value;
  const trimmed = str.trim();

  return trimmed;
}

const Course = {

  // Get all courses
  async getAll() {
    const [rows] = await db.execute(
      `SELECT 
         c.*, 
         CAST(COUNT(e.id) AS UNSIGNED) AS enrolled_count
       FROM courses c
       LEFT JOIN enrollments e ON c.id = e.course_id
       GROUP BY c.id`
    );

    return rows.map(row => {
      const is_full = row.max_students !== null ? row.enrolled_count >= row.max_students : false;
      const seats_remaining = row.max_students !== null ? row.max_students - row.enrolled_count : null;
      return { ...row, is_full: !!is_full, seats_remaining };
    });
  },


  // Get one course
  async getById(id) {
    const [rows] = await db.execute(
      `SELECT 
         c.*, 
         CAST(COUNT(e.id) AS UNSIGNED) AS enrolled_count
       FROM courses c
       LEFT JOIN enrollments e ON c.id = e.course_id
       WHERE c.id = ?
       GROUP BY c.id`,
      [id]
    );

    if (rows.length === 0) return null;
    const row = rows[0];
    row.is_full = row.max_students !== null ? row.enrolled_count >= row.max_students : false;
    row.seats_remaining = row.max_students !== null ? row.max_students - row.enrolled_count : null;
    row.is_full = !!row.is_full;
    return row;
  },


  // Find a course with the same title, optionally excluding one course.
  async findByTitle(title, excludeId = null) {
    const trimmedTitle = trimValue(title);
    const query = excludeId === null
      ? "SELECT id FROM courses WHERE title = ? LIMIT 1"
      : "SELECT id FROM courses WHERE title = ? AND id <> ? LIMIT 1";
    const values = excludeId === null ? [trimmedTitle] : [trimmedTitle, excludeId];
    const [rows] = await db.execute(query, values);

    return rows[0];
  },


  // Create course
  async create(course) {

    const {
      title: rawTitle,
      category: rawCategory,
      level: rawLevel,
      duration: rawDuration,
      price,
      image: rawImage,
      description: rawDescription,
      max_students,
    } = course;

    const title = trimValue(rawTitle);
    const category = trimValue(rawCategory);
    const level = trimValue(rawLevel);
    const duration = trimValue(rawDuration);
    const image = trimValue(rawImage);
    const description = trimValue(rawDescription);

    const [result] = await db.execute(
      `INSERT INTO courses
       (title, category, level, duration, price, image, description, max_students)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        category,
        level,
        duration,
        price,
        image,
        description,
        max_students,
      ]
    );

    return result.insertId;
  },


  // Update course
  async update(id, course) {

    const {
      title: rawTitle,
      category: rawCategory,
      level: rawLevel,
      duration: rawDuration,
      price,
      image: rawImage,
      description: rawDescription,
      max_students,
    } = course;

    const title = trimValue(rawTitle);
    const category = trimValue(rawCategory);
    const level = trimValue(rawLevel);
    const duration = trimValue(rawDuration);
    const image = trimValue(rawImage);
    const description = trimValue(rawDescription);

    const [result] = await db.execute(
      `UPDATE courses
       SET title = ?,
           category = ?,
           level = ?,
           duration = ?,
           price = ?,
           image = ?,
           description = ?,
           max_students = ?
       WHERE id = ?`,
      [
        title,
        category,
        level,
        duration,
        price,
        image,
        description,
        max_students,
        id,
      ]
    );

    return result;
  },


  // Delete course
  async delete(id) {

    const [result] = await db.execute(
      "DELETE FROM courses WHERE id = ?",
      [id]
    );

    return result;
  },

};

module.exports = Course;
