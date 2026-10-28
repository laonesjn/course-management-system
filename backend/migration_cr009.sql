USE course_management;

-- CR-009: Reporting and Analytics Endpoints Performance Indexes
-- Index for role-based student count aggregation
CREATE INDEX idx_users_role ON users(role);

-- Index for category-based course aggregation
CREATE INDEX idx_courses_category ON courses(category);
