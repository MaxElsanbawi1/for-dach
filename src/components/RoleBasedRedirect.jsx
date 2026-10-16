import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { firstPage } from '../access';

// Landing page after login: the first menu page this account may open.
const RoleBasedRedirect = () => {
  const navigate = useNavigate();
  const { access } = useAuth();

  useEffect(() => {
    if (!access) return;
    navigate(access.role === 'partner' ? '/CoursesPartner' : firstPage(access), { replace: true });
  }, [access, navigate]);

  return null;
};

export default RoleBasedRedirect;
