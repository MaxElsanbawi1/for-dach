import React, { useState } from "react";
import { Database, Download } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API = "http://localhost:3000/api";

export default function DatabaseBackup() {
  const [loading, setLoading] = useState(false);

  const downloadBackup = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/database/backup`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to download database backup");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `database-backup-${Date.now()}.sql`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Database backup downloaded successfully");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <ToastContainer />
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-md bg-blue-50 p-3 text-primary">
            <Database size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Database Backup</h1>
            <p className="text-sm text-gray-500">Download a SQL backup of the current database.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={downloadBackup}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          <Download size={18} />
          {loading ? "Preparing backup..." : "Download Database Backup"}
        </button>
      </div>
    </div>
  );
}
