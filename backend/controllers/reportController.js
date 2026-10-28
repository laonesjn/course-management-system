const Report = require("../models/reportModel");

// Get system-wide reporting overview (Admin only)
const getAdminOverview = async (req, res) => {
  try {
    // Administrator authorization check
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
      });
    }

    const report = await Report.getAdminOverview();

    return res.status(200).json({
      message: "Overview report retrieved successfully",
      report,
    });
  } catch (error) {
    console.error("Error retrieving admin overview report:", error.message);
    return res.status(500).json({
      message: "Failed to generate overview report",
    });
  }
};

// Get personal learning activity report (Student only)
const getStudentReport = async (req, res) => {
  try {
    // Student authorization check
    if (req.user?.role !== "student") {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
      });
    }

    // Strictly restrict to the authenticated student's user ID
    const studentId = req.user.id;

    const report = await Report.getStudentReport(studentId);

    return res.status(200).json({
      message: "Student report retrieved successfully",
      report,
    });
  } catch (error) {
    console.error("Error retrieving student report:", error.message);
    return res.status(500).json({
      message: "Failed to generate student report",
    });
  }
};

module.exports = {
  getAdminOverview,
  getStudentReport,
};
