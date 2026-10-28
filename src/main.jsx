import './apiFetch';
import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import './scrollbar.css';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from './AuthContext';
import Layout from './components/Layout';
import RoleBasedRedirect from './components/RoleBasedRedirect';
import NotFound from './notFound';
// Every page is its own file, fetched the first time it is opened (the dashboard
// used to be one 2.7MB bundle downloaded before anything showed).
const Permissions = lazy(() => import('./pages/users/Permissions'));
const ActivityLog = lazy(() => import('./pages/activity/ActivityLog'));
const OnlineNow = lazy(() => import('./pages/activity/OnlineNow'));
import Login from './login';
import Unauthorized from './unauthorized';
const Registrations = lazy(() => import('./pages/registrations/registrations'));
const Dashboard = lazy(() => import('./pages/dashoard'));
const Notifications = lazy(() => import('./pages/notifications/notifications'));
const AllRegistrations = lazy(() => import('./pages/registrations/allRegistrations'));
const RegistrationsDetails = lazy(() => import('./pages/registrations/detailsRegistrations'));
const PendingRegistrations = lazy(() => import('./pages/registrations/pendingRegistrations'));
const ApprovedRegistrations = lazy(() => import('./pages/registrations/approvedRegistrations'));
const RejectedRegistrations = lazy(() => import('./pages/registrations/rejectedRegistrations'));
const DirectRegistrations = lazy(() => import('./pages/registrations/directRegistrations'));
const Courses = lazy(() => import('./pages/courses/courses'));
const AllCourses = lazy(() => import('./pages/courses/allCourses'));
const Categories = lazy(() => import('./pages/courses/categories/categories'));
const AllCategories = lazy(() => import('./pages/courses/categories/allCategories'));
const DetailsCategories = lazy(() => import('./pages/courses/categories/detailsCategories'));
const AllStudents = lazy(() => import('./pages/students/allStudents'));
const StudentsDetails = lazy(() => import('./pages/students/detailsStudents'));
const UsersDashboards = lazy(() => import('./pages/users/users'));
const AddUsers = lazy(() => import('./pages/students/addStudents'));
const AddStudents = lazy(() => import('./pages/students/addStudents'));
const AddCategories = lazy(() => import('./pages/courses/categories/addCategories'));
const CategorySeo = lazy(() => import('./pages/courses/categories/CategorySeo'));
const AddCourses = lazy(() => import('./pages/courses/addCourses'));
const EditCourse = lazy(() => import('./pages/courses/editCourse'));
const CourseDetails = lazy(() => import('./pages/courses/detailsCourses'));
const ProfilePage = lazy(() => import('./pages/sitings/profile'));
const AddCoursesSame = lazy(() => import('./pages/courses/addSame'));
import { CourseProvider } from './pages/context/DashoaedContexr';
const BlockUnblockUserPage = lazy(() => import('./pages/students/blockStudent'));
const BlockedUsers = lazy(() => import('./pages/students/BlockedUsers'));
const PaidCourseStudents = lazy(() => import('./pages/students/PaidCourseStudents'));
const Complaints = lazy(() => import('./pages/complaints/Complaints'));
const OnboardingLeads = lazy(() => import('./pages/onboarding/OnboardingLeads'));
const OnboardingQuestions = lazy(() => import('./pages/onboarding/OnboardingQuestions'));
const CourseStudents = lazy(() => import('./pages/students/CourseStudents'));
const QRFormStudents = lazy(() => import('./pages/students/QRFormStudents'));
const AllCoursesTrainer = lazy(() => import('./pages/users/allcorcrsestrainer'));
const Trainer1 = lazy(() => import('./pages/users/allcorcrsestrainer'));
const OurPartnersImageUpload = lazy(() => import('./pages/clients&Our partners/Our partners'));
const ClientsImageUpload = lazy(() => import('./pages/clients&Our partners/clients'));
const OffersImageUpload = lazy(() => import('./pages/offers/Offers'));
const CoursesPartner = lazy(() => import('./pages/courses/courcesPartner'));
const CourseDetailsPartner = lazy(() => import('./pages/courses/detailsCoursesPartner'));
const EditCourses = lazy(() => import('./pages/courses/editCourse'));
const EditCoursesPartner = lazy(() => import('./pages/courses/editCoursesPartner'));
const StudentInvoice = lazy(() => import('./pages/students/StudentInvoice'));
const CourseAttendance = lazy(() => import('./pages/courses/CourseAttendance'));
const Consultations = lazy(() => import('./pages/consultations/Consultations'));
const TrainerApplications = lazy(() => import('./pages/trainerApplications/TrainerApplications'));
const TaxOverview = lazy(() => import('./pages/tax/TaxOverview'));
const GatewayNotifications = lazy(() => import('./pages/payments/GatewayNotifications'));
const PaymentsLog = lazy(() => import('./pages/payments/PaymentsLog'));
const TaxInvoices = lazy(() => import('./pages/tax/TaxInvoices'));
const TaxInvoiceDetails = lazy(() => import('./pages/tax/TaxInvoiceDetails'));
const VatReturn = lazy(() => import('./pages/tax/VatReturn'));
const TaxSettings = lazy(() => import('./pages/tax/TaxSettings'));
const BundleDiscounts = lazy(() => import('./pages/discounts/BundleDiscounts'));
const InvoiceDrafts = lazy(() => import('./pages/tax/InvoiceDrafts'));
const DraftEditor = lazy(() => import('./pages/tax/DraftEditor'));
const AgingReport = lazy(() => import('./pages/tax/AgingReport'));
const Articles = lazy(() => import('./pages/articles/Articles'));
const ArticleCategories = lazy(() => import('./pages/articles/ArticleCategories'));
const DatabaseBackup = lazy(() => import('./pages/settings/DatabaseBackup'));
const WhatsappSettings = lazy(() => import('./pages/settings/WhatsappSettings'));
const Redirects = lazy(() => import('./pages/settings/Redirects'));
const TrainerChats = lazy(() => import('./pages/settings/TrainerChats'));
const CourseRatings = lazy(() => import('./pages/courses/courseRatings'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
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
              <Route path="/courses/categories/seo" element={<CategorySeo />} />
              <Route path="/courses/categories/:categoryId/details" element={<DetailsCategories />} />
              <Route path="CoursesPartner" element={<CoursesPartner />} />
              
              <Route path="/payments" element={<PaymentsLog />} />
              <Route path="/complaints" element={<Complaints />} />
              <Route path="/onboarding" element={<OnboardingLeads />} />
              <Route path="/onboarding/questions" element={<OnboardingQuestions />} />
              {['tap', 'tamara', 'tabby', 'paypal', 'paytabs'].map((g) => (
                <Route key={g} path={`/payments/${g}`} element={<GatewayNotifications key={g} gateway={g} />} />
              ))}
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
              <Route path="/trainer-applications" element={<TrainerApplications />} />
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
              <Route path="/settings/whatsapp" element={<WhatsappSettings />} />
              <Route path="/settings/redirects" element={<Redirects />} />
              <Route path="/trainer-chats" element={<TrainerChats />} />

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
              <Route path="/online" element={<OnlineNow />} />
              <Route path="allcorcrsestrainer" element={<Trainer1 />} />

              <Route path="/ProfilePage" element={<ProfilePage />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/notifications/:notificationsId" element={<RegistrationsDetails />} />
   
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

function PageLoading() {
  return <div className="flex h-64 items-center justify-center text-gray-500">جاري التحميل...</div>;
}

createRoot(document.getElementById('root')).render(
 
    <CourseProvider>
    <StrictMode>
    <App />
  </StrictMode>,
  </CourseProvider>
);
