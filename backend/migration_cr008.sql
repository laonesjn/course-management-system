USE course_management;

-- CR-008: Indexes for server-side search, filtering, sorting, and pagination on enrollments
-- Index for date range filtering and sorting on enrollments
CREATE INDEX idx_enrollments_enrolled_at ON enrollments(enrolled_at);

-- Composite index for course filtering with date sorting
CREATE INDEX idx_enrollments_course_date ON enrollments(course_id, enrolled_at);

-- Index for student name search and sorting
CREATE INDEX idx_users_full_name ON users(full_name);

-- Index for course title sorting
CREATE INDEX idx_courses_title ON courses(title);
