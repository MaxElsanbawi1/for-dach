import React, { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X, Home, Users, Settings, BarChart, Dot, Bell, ChevronDown, ChevronUp, Search, User, LogOut, Contact, Package, Map, FileText, ShoppingBag, ChevronLeft, ChevronRight, Receipt, CreditCard, MessageSquare, UserPlus, Percent } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext'; // Import useAuth from your AuthContext
import { API as TAX_API } from '../pages/tax/taxApi';
import { visibleMenu } from '../access';
import TrainerSessionAlert from './TrainerSessionAlert';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // State for mobile sidebar
  const [openDropdown, setOpenDropdown] = useState(null); // Track which dropdown is open
  const [userDropdownOpen, setUserDropdownOpen] = useState(false); // Track user dropdown state
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false); // Track if sidebar is minimized
  const navigate = useNavigate(); // Initialize useNavigate for navigation
  const location = useLocation(); // Get the current route location
  const { logout, user, access, can } = useAuth(); // Use the logout function and user from AuthContext

const [totalPending, setTotalPending] = useState(0);
// The backend tracks read/unread per notification, so totalPending IS the unseen count.
const unseenCount = totalPending;

// Invoices sitting in the review queue. Polled rather than pushed, since the
// queue only changes when an order is paid or a registration is approved.
const [pendingInvoices, setPendingInvoices] = useState(0);
useEffect(() => {
  if (!can('tax.view')) return;
  let cancelled = false;
  const load = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${TAX_API}/tax/drafts/pending?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) setPendingInvoices(Number(data.total || 0));
    } catch (_) {
      /* the badge is informational — a failure must not disturb the shell */
    }
  };
  load();
  const timer = setInterval(load, 120000);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}, [can]);

// Unread messages from trainers (pages/settings/TrainerChats.jsx).
const [trainerChats, setTrainerChats] = useState(0);
useEffect(() => {
  if (!can('superadmin')) return;
  let cancelled = false;
  const load = async () => {
    try {
      const res = await fetch(`${TAX_API.trim()}/telegram/chats/unread`);
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) setTrainerChats(Number(data.unread || 0));
    } catch (_) {
      /* informational only */
    }
  };
  load();
  const timer = setInterval(load, 30000);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}, [can]);

  // Partner accounts keep their own small area; everyone else gets the one
  // menu in access.js, trimmed to the permissions the API returned.
  const partnerMenu = [
    { icon: Home, text: ' الدورات', href: '/CoursesPartner' },
    { icon: Settings, text: 'الإعدادات', subItems: [{ text: 'تسجيل الخروج', action: 'logout' }] },
  ];
  const getMenu = () => (access?.role === 'partner' ? partnerMenu : visibleMenu(access));

  // Toggle dropdown
  const toggleDropdown = (index) => {
    setOpenDropdown(openDropdown === index ? null : index);
  };

  // Toggle user dropdown
  const toggleUserDropdown = () => {
    setUserDropdownOpen(!userDropdownOpen);
  };

  // Handle navigation
  const handleNavigation = (href) => {
    navigate(href);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check if a menu item is active
  const isActive = (href) => location.pathname === href;

  // Toggle sidebar minimize
  const toggleSidebarMinimize = () => {
    setIsSidebarMinimized(!isSidebarMinimized);
  };
  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/notifications/me", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();

        if (!isMounted) return;

        const unread = Array.isArray(data) ? data.filter((n) => !n.IsRead).length : 0;
        setTotalPending(unread);
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    fetchNotifications();
    // Poll frequently so the bell reflects new registrations live.
    const interval = setInterval(fetchNotifications, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleNotificationClick = () => {
    // Notifications are marked read individually on the notifications page.
    navigate("/notifications");
  };

return (
    <div className="flex h-screen bg-gray-100 overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 right-0 transform ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } lg:translate-x-0 transition duration-200 ease-in-out z-[120] ${
          isSidebarMinimized ? 'w-16' : 'w-64'
        } bg-white shadow-lg flex flex-col`}
      >
        {/* Close Button for Mobile */}
        <div className="lg:hidden flex items-center justify-between p-3 border-b">
          <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-md hover:bg-gray-100">
            <X size={24} />
          </button>
        </div>

        {/* Sidebar Header (Desktop) */}
        <div className="hidden lg:flex items-center justify-between h-16 border-b p-3">
          {!isSidebarMinimized && <img src="/acit-logo.png" alt="acit Icon" className="w-10" />}
          <button onClick={toggleSidebarMinimize} className="p-2 rounded-md hover:bg-gray-100">
            {isSidebarMinimized ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
          </button>
        </div>
        {/* Sidebar Menu */}
        <nav className="flex-1 overflow-y-auto">
          {getMenu().map((item, index) => (
            <div key={index}>
              <span
                className={`flex items-center justify-between px-6 py-3 text-gray-700 hover:bg-gray-100 ${
                  isActive(item.href) ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex items-center">
                  <item.icon
                    href={item.href || '#'}
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.href) handleNavigation(item.href);
                    }}
                    className="w-5 h-5 ml-3"
                  />
                  {!isSidebarMinimized && (
                    <a
                      href={item.href || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        if (item.href) handleNavigation(item.href);
                      }}
                    >
                      {item.text}
                    </a>
                  )}
                </div>
                {!isSidebarMinimized && item.subItems && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDropdown(index);
                    }}
                    className="p-2 hover:bg-gray-200 rounded-md"
                  >
                    {openDropdown === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                )}
              </span>

              {/* Dropdown Menu */}
              {!isSidebarMinimized && item.subItems && openDropdown === index && (
                <div className="px-4">
                  {item.subItems.map((subItem, subIndex) => (
                    <a
                      key={subIndex}
                      href={subItem.href || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        if (subItem.href) handleNavigation(subItem.href);
                        if (subItem.action === 'logout') handleLogout();
                      }}
                      className={`flex items-center px-6 py-2 text-gray-600 hover:bg-gray-50 ${
                        isActive(subItem.href) ? 'bg-gray-100' : ''
                      }`}
                    >
                      <Dot size={16} />
                      <span>{subItem.text}</span>
                      {/* Invoices awaiting review — the count is the whole point
                          of the review queue, so it belongs in the nav. */}
                      {subItem.badge === 'pendingInvoices' && pendingInvoices > 0 ? (
                        <span className="mr-auto min-w-[20px] text-center px-1.5 py-0.5 rounded-full bg-primary text-white text-[11px] font-semibold">
                          {pendingInvoices}
                        </span>
                      ) : null}
                      {subItem.badge === 'trainerChats' && trainerChats > 0 ? (
                        <span className="mr-auto min-w-[20px] text-center px-1.5 py-0.5 rounded-full bg-sky-500 text-white text-[11px] font-semibold">
                          {trainerChats}
                        </span>
                      ) : null}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      {/* min-w-0: a flex item defaults to min-width:auto, so without this the
          content column refuses to shrink below its widest child and pushes the
          whole page sideways. */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header for Desktop */}
        <header className="hidden lg:flex items-center justify-between bg-white shadow-md h-16 px-6">
          <div className="flex items-center w-96">
            <Users className="w-5 h-5 text-gray-500" />
            <h2 className="mr-5">مرحبا {user.name} - {user.role}</h2>
          </div>
          <div className="flex items-center space-x-4">
          {user.role !== 'partner' && (
            <button 
              className="p-2 rounded-md hover:bg-gray-100 relative"
              onClick={handleNotificationClick}
            >
              <Bell size={24} />
              {unseenCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unseenCount}
                </span>
              )}
            </button>
          )}
            <div className="relative">
              <button onClick={toggleUserDropdown} className="flex items-center p-2 rounded-md hover:bg-gray-100">
                <User size={24} />
              </button>
              {userDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-90">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleLogout();
                    }}
                    className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut size={16} className="ml-2" />
                    <span>تسجيل الخروج</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden bg-white shadow-md h-16 fixed top-0 right-0 left-0 z-[110]">
          <div className="flex items-center justify-between px-4 h-full">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md hover:bg-gray-100">
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <img src="/acit-logo.png" alt="acit Icon" className="w-10" />
            {user.role !== 'partner' && (
              <button 
                className="p-2 rounded-md hover:bg-gray-100 relative"
                onClick={handleNotificationClick}
              >
                <Bell size={24} />
                {unseenCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unseenCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Main content */}
        {/* overflow-x-clip, not the browser default: `overflow-y:auto` with
            `overflow-x:visible` computes x to `auto` too, so a tooltip or a
            wide table produced a page-level horizontal scrollbar. `clip`
            (rather than `hidden`) is not a scroll container, so `position:
            sticky` inside still works — the bulk-approve bar depends on it.
            Genuinely wide content scrolls in its own overflow-x-auto wrapper. */}
        <main className="flex-1 overflow-y-auto overflow-x-clip min-w-0 p-6 lg:pr-6 pt-20 lg:pt-6">
          {/* Pages load on demand (main.jsx); the menu stays while one loads. */}
          <Suspense fallback={<div className="flex h-64 items-center justify-center text-gray-500">جاري التحميل...</div>}>
            <Outlet />
          </Suspense>
        </main>
        <TrainerSessionAlert />
      </div>
    </div>
  );

};

export default Layout;
