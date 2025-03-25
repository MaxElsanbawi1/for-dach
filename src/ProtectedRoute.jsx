import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Show a loading spinner or placeholder while checking authentication
    return <div>Loading...</div>;
  }

  if (!user) {
    // Redirect to login page and store the current location for later redirection
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Optional: Role-based access control
  if (roles && !roles.includes(user.role)) {
    // Redirect to a "not authorized" page or home page
    return <Navigate to="/login" replace />;
  }

  // If authenticated (and authorized, if roles are specified), render the child routes
  return <Outlet />;
};

export default ProtectedRoute;