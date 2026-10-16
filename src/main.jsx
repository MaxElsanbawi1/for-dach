import './apiFetch';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import './scrollbar.css';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from './AuthContext';
import Layout from './components/Layout';
import RoleBasedRedirect from './components/RoleBasedRedirect';
import NotFound from './notFound';
import Permissions from './pages/users/Permissions';
import ActivityLog from './pages/activity/ActivityLog';
import Login from './login';
import Unauthorized from './unauthorized';
import Registrations from './pages/registrations/registrations';
import Dashboard from './pages/dashoard';
import Notifications from './pages/notifications/notifications';
import AllRegistrations from './pages/registrations/allRegistrations';
import RegistrationsDetails from './pages/registrations/detailsRegistrations';
import PendingRegistrations from './pages/registrations/pendingRegistrations';
import ApprovedRegistrations from './pages/registrations/approvedRegistrations';
import RejectedRegistrations from './pages/registrations/rejectedRegistrations';
import DirectRegistrations from './pages/registrations/directRegistrations';
import Courses from './pages/courses/courses';
import AllCourses from './pages/courses/allCourses';
import Categories from './pages/courses/categories/categories';
import AllCategories from './pages/courses/categories/allCategories';
import DetailsCategories from './pages/courses/categories/detailsCategories';
import AllStudents from './pages/students/allStudents';
import StudentsDetails from './pages/students/detailsStudents';
import UsersDashboards from './pages/users/users';
import AddUsers from './pages/students/addStudents';
import AddStudents from './pages/students/addStudents';
import AddCategories from './pages/courses/categories/addCategories';
import AddCourses from './pages/courses/addCourses';
import EditCourse from './pages/courses/editCourse';
import CourseDetails from './pages/courses/detailsCourses';
import ProfilePage from './pages/sitings/profile';
import AddCoursesSame from './pages/courses/addSame';
import { CourseProvider } from './pages/context/DashoaedContexr';
import BlockUnblockUserPage from './pages/students/blockStudent';
import BlockedUsers from './pages/students/BlockedUsers';
import PaidCourseStudents from './pages/students/PaidCourseStudents';
import Complaints from './pages/complaints/Complaints';
import OnboardingLeads from './pages/onboarding/OnboardingLeads';
import OnboardingQuestions from './pages/onboarding/OnboardingQuestions';
import CourseStudents from './pages/students/CourseStudents';
import QRFormStudents from './pages/students/QRFormStudents';
import AllCoursesTrainer from './pages/users/allcorcrsestrainer';
import Trainer1 from './pages/users/allcorcrsestrainer';
import OurPartnersImageUpload from './pages/clients&Our partners/Our partners';
import ClientsImageUpload from './pages/clients&Our partners/clients';
import OffersImageUpload from './pages/offers/Offers';
import CoursesPartner from './pages/courses/courcesPartner';
import CourseDetailsPartner from './pages/courses/detailsCoursesPartner';
import EditCourses from './pages/courses/editCourse';
import EditCoursesPartner from './pages/courses/editCoursesPartner';
import StudentInvoice from './pages/students/StudentInvoice';
import CourseAttendance from './pages/courses/CourseAttendance';
import Consultations from './pages/consultations/Consultations';
import TaxOverview from './pages/tax/TaxOverview';
import TamaraNotifications from './pages/payments/TamaraNotifications';
import PaymentsLog from './pages/payments/PaymentsLog';
import TaxInvoices from './pages/tax/TaxInvoices';
import TaxInvoiceDetails from './pages/tax/TaxInvoiceDetails';
import VatReturn from './pages/tax/VatReturn';
import TaxSettings from './pages/tax/TaxSettings';
import BundleDiscounts from './pages/discounts/BundleDiscounts';
import InvoiceDrafts from './pages/tax/InvoiceDrafts';
import DraftEditor from './pages/tax/DraftEditor';
import AgingReport from './pages/tax/AgingReport';
import Articles from './pages/articles/Articles';
import ArticleCategories from './pages/articles/ArticleCategories';
import DatabaseBackup from './pages/settings/DatabaseBackup';
import CourseRatings from './pages/courses/courseRatings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route path="unauthorized" element={<Unauthorized />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
            <Route index element={<RoleBasedRedirect />} />
            <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/registrations" element={<Registrations />} />
              <Route path="/registrations/all" element={<AllRegistrations />} />
              <Route path="/registrations/pending" element={<PendingRegistrations />} />
              <Route path="/registrations/direct" element={<DirectRegistrations />} />
              <Route path="/registrations/approved" element={<ApprovedRegistrations />} />
              <Route path="/registrations/rejected" element={<RejectedRegistrations />} />
              <Route path="/registrations/:registrationId/details" element={<RegistrationsDetails />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/add" element={<AddCourses />} />
              <Route path="/courses/addSame" element={<AddCoursesSame />} />
              <Route path="/courses/all" element={<AllCourses />} />
              <Route path="/courses/:courseId/details" element={<CourseDetails />} />
              <Route path="/courses/:courseId/detailsPartner" element={<CourseDetailsPartner />} />
              <Route path="/courses/:courseId/edit" element={<EditCourses />} />
              <Route path="/courses/:courseId/editPartner" element={<EditCoursesPartner />} />
              <Route path="ClientImageUpload" element={<ClientsImageUpload />} />
              <Route path="OurPartnersImageUpload" element={<OurPartnersImageUpload />} />
              <Route path="OffersImageUpload" element={<OffersImageUpload />} />
              <Route path="/courses/:courseId/attendance" element={<CourseAttendance />} />

              <Route path="/courses/categories" element={<AllCategories />} />
              <Route path="/courses/categories/add" element={<AddCategories />} />
              <Route path="/courses/categories/:categoryId/details" element={<DetailsCategories />} />
              <Route path="CoursesPartner" element={<CoursesPartner />} />
              
              <Route path="/payments" element={<PaymentsLog />} />
              <Route path="/complaints" element={<Complaints />} />
              <Route path="/onboarding" element={<OnboardingLeads />} />
              <Route path="/onboarding/questions" element={<OnboardingQuestions />} />
              <Route path="/payments/tamara" element={<TamaraNotifications />} />
              <Route path="/tax" element={<TaxOverview />} />
              <Route path="/tax/invoices" element={<TaxInvoices />} />
                 <Route path="/courses/ratings" element={<CourseRatings />} />
              <Route path="/tax/invoices/:invoiceId" element={<TaxInvoiceDetails />} />
              {/* Drafts are the only editable stage — issued invoices have no edit route. */}
              <Route path="/tax/drafts" element={<InvoiceDrafts />} />
              <Route path="/tax/drafts/:draftId" element={<DraftEditor />} />
              <Route path="/tax/aging" element={<AgingReport />} />
              <Route path="/tax/vat-return" element={<VatReturn />} />
              <Route path="/tax/settings" element={<TaxSettings />} />
              <Route path="/discounts" element={<BundleDiscounts />} />
              <Route path="/consultations" element={<Consultations />} />
              <Route path="/consultations/networks" element={<Consultations fixedType="networks" />} />
              <Route path="/consultations/other" element={<Consultations fixedType="other" />} />
              <Route path="/consultations/software" element={<Consultations fixedType="software" />} />
              <Route path="/consultations/security" element={<Consultations fixedType="security" />} />
              <Route path="/consultations/ai" element={<Consultations fixedType="ai" />} />
              <Route path="/consultations/cloud" element={<Consultations fixedType="cloud" />} />
              <Route path="/consultations/marketing" element={<Consultations fixedType="marketing" />} />
              <Route path="/consultations/support" element={<Consultations fixedType="support" />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/articles/categories" element={<ArticleCategories />} />
              <Route path="/settings/database-backup" element={<DatabaseBackup />} />

              <Route path="/students" element={<Dashboard />} />

              <Route path="/students/add" element={<AddStudents />} />
              <Route path="/students/blocked" element={<BlockUnblockUserPage />} />
              <Route path="/students/Allblocked" element={<BlockedUsers />} />
              <Route path="/students/all" element={<AllStudents />} />
              <Route path="/students/course-students" element={<CourseStudents />} />
              <Route path="/students/paid-course-students" element={<PaidCourseStudents />} />
              <Route path="/students/qr-form" element={<QRFormStudents />} />
              <Route path="/students/:userId/details" element={<StudentsDetails />} />
              <Route path="/students/invoice" element={<StudentInvoice />} />

              <Route path="/users" element={<UsersDashboards />} />
              <Route path="/users/add" element={<AddUsers />} />
              <Route path="/users/permissions" element={<Permissions />} />
              <Route path="/activity" element={<ActivityLog />} />
              <Route path="allcorcrsestrainer" element={<Trainer1 />} />

              <Route path="/ProfilePage" element={<ProfilePage />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/notifications/:notificationsId" element={<RegistrationsDetails />} />
   
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')).render(
 
    <CourseProvider>
    <StrictMode>
    <App />
  </StrictMode>,
  </CourseProvider>
);
