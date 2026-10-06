import { Navigate, useLocation } from "react-router-dom";

import { getUser, getToken } from "../services/auth";
import Navbar from "./Navbar";


function ProtectedRoute({ children, role }) {

  const location = useLocation();

  const token = getToken();
  const user = getUser();


  // ---------- 1. Not logged in ----------
  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }


  // ---------- 2. Logged in but wrong role ----------
  if (role && user.role !== role) {

    return (
      <>
        <Navbar />
        <div className="container" style={{ textAlign: "center", marginTop: "50px" }}>
          <h2>Access denied</h2>
          <p className="error" style={{ fontSize: "1.2rem", marginTop: "20px" }}>
            Access denied. You do not have permission to access this page.
          </p>
        </div>
      </>
    );
  }


  // ---------- 3. Allowed ----------
  return children;
}

export default ProtectedRoute;
