const express = require("express");
const router = express.Router();

const {
  getAdminOverview,
  getStudentReport,
} = require("../controllers/reportController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Admin-only overview report
router.get(
  "/overview",
  authMiddleware,
  roleMiddleware(["admin"]),
  getAdminOverview
);

// Student-only personal report
router.get(
  "/my",
  authMiddleware,
  roleMiddleware(["student"]),
  getStudentReport
);

module.exports = router;
