import React, { useState, useRef, useEffect } from "react";
import { useApp, Page, Lang } from "../store/AppContext";
import { Warehouse, ArrowLeftRight, Repeat, ClipboardList, Users, FileBarChart2, BookOpen, List, Settings, Moon, Sun, ChevronDown, Languages, LogOut } from "lucide-react";

const menuItems: { key: string; page: Page; icon: React.ReactNode }[] = [
  { key: "nav.sklady", page: "sklady-hub", icon: <Warehouse className="w-5 h-5" /> },
  { key: "nav.skladOper", page: "sklad-oper-hub", icon: <ArrowLeftRight className="w-5 h-5" /> },
  { key: "nav.dvizhenie", page: "dvizhenie-mat", icon: <Repeat className="w-5 h-5" /> },
  { key: "nav.shihtovye", page: "shihtovye-karty", icon: <ClipboardList className="w-5 h-5" /> },
  { key: "nav.podotchet", page: "podotchetniki", icon: <Users className="w-5 h-5" /> },
  { key: "nav.otchet", page: "otchetnost", icon: <FileBarChart2 className="w-5 h-5" /> },
  { key: "nav.sprav", page: "spravochniki", icon: <BookOpen className="w-5 h-5" /> },
  { key: "nav.log", page: "logirovanie", icon: <List className="w-5 h-5" /> },
  { key: "nav.admin", page: "admin-users", icon: <Settings className="w-5 h-5" /> },
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
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
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
                  <Moon className="w-4 h-4 text-blue-400" />
                ) : (
                  <Sun className="w-4 h-4 text-yellow-400" />
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
                <Languages className="w-4 h-4 text-slate-400" />
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
            <LogOut className="w-4 h-4" />
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
              <div className="text-white font-semibold text-sm leading-tight tracking-tight">СДМ</div>
              <div className="text-slate-500 text-[10px] leading-tight mt-0.5">Монетный Двор</div>
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
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
