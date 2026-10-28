import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './AuthContext';

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('يرجى ملء جميع الحقول.', {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
      Username: username.trim(),
      Password: password,
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow"
    };

    try {
      const response = await fetch(" http://localhost:3000/api/auth/login", requestOptions);
      const text = await response.text();
      let result;
      try {
        result = text ? JSON.parse(text) : {};
        console.log("API Response:", result); // Added for debugging
      } catch {
        result = { message: text || "خطأ في الخادم" };
        console.log("API Error Response:", result); // Added for debugging
      }
      if (response.ok) {
        login(result.token, result.role, result.user_id, result.name, result.companyName);
        window.localStorage.setItem("companyName", result.companyName)
        toast.success('تم تسجيل الدخول بنجاح!', {
          position: 'top-left',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        // "/" sends each account to the first page its permissions open.
        navigate('/');
      } else {
        const message =
          result.message ||
          result.error ||
          result.error_description ||
          (response.status === 401
            ? 'اسم المستخدم أو كلمة المرور غير صحيحة.'
            : response.status >= 500
              ? 'خطأ في الخادم. يرجى المحاولة لاحقاً.'
              : 'فشل تسجيل الدخول. يرجى التحقق من البيانات المدخلة.');
        toast.error(message, {
          position: 'top-left',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.', {
        position: 'top-left',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center pt-24 bg-white lg:bg-gray-100" dir="rtl">
      {/* Toast Container */}
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={true} // Enable RTL for Arabic
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <div className="mt-0 mb-6">
        <img src="/acit-logo.png" alt="acit Icon" className="" />
      </div>
      <div className="bg-white lg:shadow-lg lg:rounded-lg p-8 w-full h-full lg:h-auto lg:max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-primary font-ibm-plex-sans-arabic">
          تسجيل الدخول
        </h2>
        {error && (
          <p className="text-red-500 text-sm mb-4 text-center font-ibm-plex-sans-arabic">
            {error}
          </p>
        )}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-primary font-ibm-plex-sans-arabic">
              اسم المستخدم أو البريد الإلكتروني
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="أدخل اسم المستخدم أو البريد الإلكتروني"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-primary font-ibm-plex-sans-arabic">
              كلمة المرور
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="أدخل كلمة المرور"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-secondary text-white py-2 px-4 rounded-md hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary font-ibm-plex-sans-arabic"
          >
            تسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
