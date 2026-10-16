import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { allowed, needFor, matchPath, PARTNER_PAGES } from './access';

// Page guard. What a page needs comes from access.js, checked against the
// permissions the API returned for this account. Hiding a page here is only
// for the user's sake - the API refuses the same requests on its own.
const ProtectedRoute = () => {
  const { user, loading, access } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const path = location.pathname;

  // Partner accounts keep their own small area.
  if (access?.role === 'partner') {
    const ok = PARTNER_PAGES.some((p) => matchPath(p, path));
    return ok ? <Outlet /> : <Navigate to="/unauthorized" replace />;
  }

  // "/" is the landing redirect; it picks the first page the account can open.
  if (path === '/') return <Outlet />;

  const { need, roles } = needFor(path);
  if (!allowed(need, access, roles)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
