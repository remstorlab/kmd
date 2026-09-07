import React, { useState } from "react";
import { useApp, Lang } from "../store/AppContext";
import { Moon, Sun, User, Lock, Eye, EyeOff, CircleAlert, Loader2 } from "lucide-react";

export default function Login() {
  const { login, lang, setLang, tr, theme, toggleTheme } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const ok = login(username, password);
    setLoading(false);
    if (!ok) setError(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        {/* Lang switch */}
        <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700/50">
          {(["ru", "kz"] as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                lang === l
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={tr(theme === "dark" ? "header.theme.light" : "header.theme.dark")}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-all"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl grid grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/40">

          {/* Left panel — decorative */}
          <div className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-10 flex flex-col justify-between overflow-hidden">
            {/* Background grid pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "linear-gradient(rgba(96,165,250,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.3) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            {/* Glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              {/* Logo */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
                  <span className="text-white font-bold text-lg tracking-tight">Au</span>
                </div>
                <div>
                  <div className="text-white font-bold text-lg leading-tight">{tr("login.title")}</div>
                  <div className="text-blue-400 text-xs mt-0.5">Монетный двор</div>
                </div>
              </div>


              <p className="text-slate-400 text-sm leading-relaxed">
                {tr("login.sub")}
              </p>
            </div>

            {/* Bottom stats */}
    
          </div>

          {/* Right panel — form */}
          <div className="bg-slate-900 p-10 flex flex-col justify-center">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-1">
                {lang === "ru" ? "Вход в систему" : "Жүйеге кіру"}
              </h2>
              <p className="text-slate-500 text-sm">{tr("login.sub")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {tr("login.username")}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(false); }}
                    placeholder="admin"
                    autoComplete="username"
                    className={`w-full bg-slate-800 border ${error ? "border-red-500" : "border-slate-700"} text-white placeholder-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {tr("login.password")}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(false); }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`w-full bg-slate-800 border ${error ? "border-red-500" : "border-slate-700"} text-white placeholder-slate-600 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-sm">
                  <CircleAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-red-300">{tr("login.error")}</span>
                </div>
              )}

              {/* Remember + hint */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800"
                  />
                  <span className="text-xs text-slate-400">{tr("login.remember")}</span>
                </label>
                <span className="text-xs text-slate-600">{tr("login.hint")}</span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {lang === "ru" ? "Проверка..." : "Тексеру..."}
                  </>
                ) : tr("login.btn")}
              </button>
            </form>

            {/* Footer */}
            <p className="text-slate-700 text-xs text-center mt-8">
              © 2026 Монетный двор · {lang === "ru" ? "Все права защищены" : "Барлық құқықтар қорғалған"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
