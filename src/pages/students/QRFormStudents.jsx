import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function QRFormStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(" https://back.acit-net.com/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `Failed to load students (${response.status})`);
        }
        const qrStudents = Array.isArray(data)
          ? data.filter(
              (user) =>
                String(user.Role || "").toLowerCase() === "student" &&
                String(user.Source || "").trim().toUpperCase() === "QR FORM"
            )
          : [];
        setStudents(qrStudents);
      } catch (error) {
        console.error("Error fetching QR FORM students:", error);
        setError(error.message || "Failed to load QR FORM students.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    return (
      String(student.UserID || "").includes(query) ||
      String(student.FullName || "").toLowerCase().includes(query) ||
      String(student.Email || "").toLowerCase().includes(query) ||
      String(student.PhoneNumber || "").includes(query) ||
      String(student.NationalId || "").includes(query) ||
      String(student.InterestedCourse || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-6 text-2xl font-bold text-primary">QR FORM</h2>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
        <span className="rounded bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
          Count: {filteredStudents.length}
        </span>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : error ? (
        <p className="rounded-md bg-red-50 p-4 text-center text-red-700">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">ID</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">Name</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">Email</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">Phone</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">National ID</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">Course</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-primary">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr
                  key={student.UserID}
                  onClick={() => navigate(`/students/${student.UserID}/details`)}
                  className="cursor-pointer border-b transition-colors hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-right text-sm text-gray-700">{student.UserID}</td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700">{student.FullName}</td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700">{student.Email}</td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700">{student.PhoneNumber}</td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700">{student.NationalId}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-acit-gold">
                    {student.InterestedCourse || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700">
                    {student.CreatedAt ? new Date(student.CreatedAt).toLocaleDateString() : "N/A"}
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No QR FORM students yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
