import React, { useState, useEffect, useCallback } from 'react';

const API = " https://back.acit-net.com/api";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [respondingId, setRespondingId] = useState(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API}/notifications/me`, {
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll frequently so new registrations show up "live" without a manual refresh.
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const respond = async (notification, status) => {
    setRespondingId(notification.NotificationID);
    try {
      const response = await fetch(`${API}/notifications/${notification.NotificationID}/respond`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "تعذر تنفيذ العملية");

      setNotifications((prev) =>
        prev.map((n) =>
          n.NotificationID === notification.NotificationID
            ? { ...n, IsRead: 1, RegistrationStatus: status }
            : n
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setRespondingId(null);
    }
  };

  const markRead = async (notification) => {
    if (notification.IsRead) return;
    try {
      await fetch(`${API}/notifications/${notification.NotificationID}/read`, {
        method: "PUT",
        headers: authHeaders(),
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.NotificationID === notification.NotificationID ? { ...n, IsRead: 1 } : n
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const formatDateTime = (isoString) =>
    new Date(isoString).toLocaleString("ar-EG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const unreadCount = notifications.filter((n) => !n.IsRead).length;

  if (loading && notifications.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="container mx-auto max-w-4xl px-2 py-4 sm:px-4 sm:py-8">
      <div className="mb-4 flex items-center justify-between sm:mb-8">
        <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">الإشعارات</h1>
        {unreadCount > 0 && (
          <span className="rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white">
            {unreadCount} جديد
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-red-700">
          {error}
          <button
            onClick={fetchData}
            className="mr-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {notifications.length === 0 && !error ? (
        <p className="text-center text-gray-500">لا توجد إشعارات</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isRegistration = n.Type === "registration" && n.RegistrationID;
            const status = (n.RegistrationStatus || "").toLowerCase();
            return (
              <div
                key={n.NotificationID}
                onClick={() => markRead(n)}
                className={`cursor-pointer rounded-lg border p-4 shadow-sm transition ${
                  n.IsRead ? "bg-white" : "border-primary bg-blue-50"
                }`}
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-medium text-gray-800">{n.Message}</p>
                    {isRegistration && (
                      <p className="mt-1 text-sm text-gray-500">
                        {n.FullName && <>الاسم: {n.FullName} - </>}
                        {n.Email && <>{n.Email} - </>}
                        {n.CourseName && <>الدورة: {n.CourseName}</>}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">{formatDateTime(n.CreatedAt)}</p>
                  </div>

                  {isRegistration && (
                    <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {status === "approved" ? (
                        <span className="rounded bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
                          معتمد
                        </span>
                      ) : status === "rejected" ? (
                        <span className="rounded bg-red-100 px-3 py-1 text-sm font-bold text-red-800">
                          مرفوض
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={respondingId === n.NotificationID}
                            onClick={() => respond(n, "approved")}
                            className="rounded bg-green-500 px-3 py-1 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-60"
                          >
                            قبول
                          </button>
                          <button
                            type="button"
                            disabled={respondingId === n.NotificationID}
                            onClick={() => respond(n, "rejected")}
                            className="rounded bg-red-500 px-3 py-1 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60"
                          >
                            رفض
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
