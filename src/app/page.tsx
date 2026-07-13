"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GraduationCap, Lock, User, CheckCircle, AlertCircle, Loader2, BookOpen, Users, ChevronDown, Calendar } from "lucide-react";
import CalendarModal from "../components/CalendarModal";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"student" | "admin" | "register">("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [registerNo, setRegisterNo] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [batch, setBatch] = useState("2024-2028");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Custom Calendar Modal toggle states
  const [showLoginCalendar, setShowLoginCalendar] = useState(false);
  const [showRegCalendar, setShowRegCalendar] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = (session.user as any).role;
      if (role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    }
  }, [status, session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!username || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const res = await signIn("credentials", {
        redirect: false,
        username: username.toUpperCase(),
        password,
      });

      if (res?.error) {
        setError(res.error || "Invalid username or password.");
      } else {
        setSuccess("Login successful! Redirecting...");
        // Redirect logic handled by useEffect, but let's trigger it immediately
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!name || !registerNo || !regPassword || !batch) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.toUpperCase(),
          registerNo: registerNo.toUpperCase(),
          password: regPassword,
          batch,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to register.");
      } else {
        setSuccess(data.message || "Registration successful! You can now log in.");
        setName("");
        setRegisterNo("");
        setRegPassword("");
        setBatch("2024-2028");
        setTimeout(() => {
          setActiveTab("student");
          setUsername(registerNo.toUpperCase());
          setError("");
          setSuccess("");
        }, 1500);
      }
    } catch (err) {
      setError("Could not connect to registration server.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="mt-4 text-slate-400 font-medium">Checking credentials...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
      <div className="w-full max-w-md glass-panel auth-card rounded-2xl p-6 sm:p-8 relative">
        
        {/* Logo and title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mb-3">
            <GraduationCap className="w-9 h-9 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight text-center">Academic Report Portal</h1>
          <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
            Safi Institute of Advanced Study
          </p>
        </div>

        {/* Tab triggers */}
        <div className="flex border-b border-slate-700/50 mb-6">
          <button
            onClick={() => { setActiveTab("student"); setError(""); setSuccess(""); }}
            className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-all ${
              activeTab === "student"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Student
          </button>
          <button
            onClick={() => { setActiveTab("admin"); setError(""); setSuccess(""); }}
            className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-all ${
              activeTab === "admin"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Faculty
          </button>
          <button
            onClick={() => { setActiveTab("register"); setError(""); setSuccess(""); }}
            className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-all ${
              activeTab === "register"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Register
          </button>
        </div>

        {/* Info alerts */}
        {error && (
          <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm mb-5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm mb-5">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab Forms */}
        {activeTab !== "register" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                {activeTab === "student" ? "Register No" : "Admin Username"}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUsername(val.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                  }}
                  placeholder={activeTab === "student" ? "SIAYBCM001" : "admin"}
                  className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-semibold"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                {activeTab === "student" ? "Date of Birth" : "Password"}
              </label>
              <div className="relative">
                {activeTab === "student" ? (
                  <>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                      <input
                        type="text"
                        readOnly
                        value={password}
                        onClick={() => setShowLoginCalendar(true)}
                        placeholder="Select Date of Birth"
                        className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-semibold cursor-pointer"
                      />
                    </div>

                    <CalendarModal
                      isOpen={showLoginCalendar}
                      onClose={() => setShowLoginCalendar(false)}
                      selectedDate={password}
                      onSelectDate={setPassword}
                      themeColor="indigo"
                    />
                  </>
                ) : (
                  <>
                    <Lock className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-semibold"
                    />
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === "admin"
                  ? "bg-rose-600 hover:bg-rose-500 text-white disabled:bg-slate-800 disabled:text-slate-400"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-800 disabled:text-slate-400"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="NAME"
                  className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Register Number
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={registerNo}
                  onChange={(e) => setRegisterNo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="SIAYBCM001"
                  className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                FYUGP Batch
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2 pl-10 pr-10 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors appearance-none cursor-pointer text-sm font-semibold"
                >
                  <option value="2024-2028" className="bg-slate-950 text-slate-100">2024-2028 (FYUGP)</option>
                  <option value="2025-2029" className="bg-slate-950 text-slate-100">2025-2029 (FYUGP)</option>
                  <option value="2026-2030" className="bg-slate-950 text-slate-100">2026-2030 (FYUGP)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  readOnly
                  value={regPassword}
                  onClick={() => setShowRegCalendar(true)}
                  placeholder="Select Date of Birth"
                  className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-semibold cursor-pointer"
                />
              </div>

              <CalendarModal
                isOpen={showRegCalendar}
                onClose={() => setShowRegCalendar(false)}
                selectedDate={regPassword}
                onSelectDate={setRegPassword}
                themeColor="emerald"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-semibold transition-all disabled:bg-slate-800 disabled:text-slate-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <span>Register Account</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
