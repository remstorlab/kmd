import React, { useState, useRef, useEffect } from "react";
import { useApp, Page, Lang } from "../store/AppContext";

const menuItems: { key: string; page: Page; icon: React.ReactNode }[] = [
  {
    key: "nav.sklady",
    page: "sklady-hub",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
  {
    key: "nav.skladOper",
    page: "sklad-oper-hub",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
  },
  {
    key: "nav.dvizhenie",
    page: "dvizhenie-mat",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    key: "nav.shihtovye",
    page: "shihtovye-karty",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  },
  {
    key: "nav.podotchet",
    page: "podotchetniki",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  },
  {
    key: "nav.otchet",
    page: "otchetnost",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
  {
    key: "nav.sprav",
    page: "spravochniki",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  },
  {
    key: "nav.log",
    page: "logirovanie",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
  },
  {
    key: "nav.admin",
    page: "admin-users",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
];

function isActive(menuPage: Page, currentPage: Page): boolean {
  if (menuPage === currentPage) return true;
  if (menuPage === "sklady-hub" && ["ostatok-gp", "ostatok-dm"].includes(currentPage)) return true;
  if (menuPage === "sklad-oper-hub" && ["prihod-list", "vydacha-list"].includes(currentPage)) return true;
  if (menuPage === "admin-users" && currentPage === "admin-roles") return true;
  if (menuPage === "podotchetniki" && currentPage === "podotchetnik-card") return true;
  if (menuPage === "spravochniki" && currentPage === "spravochnik-detail") return true;
  return false;
}

// ── User dropdown ─────────────────────────────────────────────────────────────

function UserDropdown() {
  const { currentUser, logout, theme, toggleTheme, lang, setLang, tr } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 hover:bg-slate-800 rounded-lg px-2 py-1.5 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {currentUser?.initials ?? "?"}
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-white text-sm font-medium leading-tight">{currentUser?.name}</div>
          <div className="text-slate-400 text-xs leading-tight truncate max-w-36">{currentUser?.email}</div>
        </div>
        <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          {/* User info */}
          <div className="px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {currentUser?.initials}
              </div>
              <div>
                <div className="text-white text-sm font-medium">{currentUser?.name}</div>
                <div className="text-slate-400 text-xs">{currentUser?.email}</div>
              </div>
            </div>
          </div>

          {/* Theme toggle */}
          <div className="px-4 py-2 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                {theme === "dark" ? (
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
                {tr(theme === "dark" ? "header.theme.dark" : "header.theme.light")}
              </div>
              {/* Toggle switch */}
              <button
                onClick={toggleTheme}
                className={`relative w-10 h-5 rounded-full transition-colors ${theme === "dark" ? "bg-blue-600" : "bg-slate-600"}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${theme === "dark" ? "translate-x-5" : ""}`} />
              </button>
            </div>
          </div>

          {/* Language toggle */}
          <div className="px-4 py-2 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
                {lang === "ru" ? "Русский" : "Қазақша"}
              </div>
              <div className="flex items-center gap-1 bg-slate-700/60 rounded-lg p-0.5">
                {(["ru", "kz"] as Lang[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      lang === l ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {tr("header.logout")}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function Layout({ children }: { children: React.ReactNode }) {
  const { page, navigate, tr, theme, toggleTheme } = useApp();

  return (
    <div className="flex h-full" style={{ backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc" }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-slate-900 flex flex-col h-full overflow-hidden">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-900/50">
              <span className="text-white font-bold text-sm">Au</span>
            </div>
            <div>
              <div className="text-white font-semibold text-sm leading-tight tracking-tight">ДМ-УПРАВЛЕНИЕ</div>
              <div className="text-slate-500 text-[10px] leading-tight mt-0.5">АО «МонетаДМ»</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {menuItems.map(item => {
            const active = isActive(item.page, page);
            return (
              <button
                key={item.page}
                onClick={() => navigate(item.page)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className={`shrink-0 ${active ? "text-white" : "text-slate-500"}`}>
                  {item.icon}
                </span>
                <span className="truncate text-sm">{tr(item.key)}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer version */}
        <div className="px-4 py-3 border-t border-slate-700/60">
          <div className="text-slate-600 text-xs">v2.4.1 · 2026</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-slate-900 border-b border-slate-700/40 flex items-center justify-between px-5 shrink-0">
          {/* Left: breadcrumb hint */}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-slate-400 text-sm">
              {tr("login.sub").split(" ").slice(0, 3).join(" ")}
            </span>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            {/* Quick theme toggle pill in header */}
            <button
              onClick={toggleTheme}
              title={tr(theme === "dark" ? "header.theme.light" : "header.theme.dark")}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              {theme === "dark" ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* User dropdown */}
            <UserDropdown />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
