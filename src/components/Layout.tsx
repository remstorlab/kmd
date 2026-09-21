import React, { useState, useRef, useEffect } from "react";
import { useApp, Page, Lang, daysSince, evaluatePasswordRules } from "../store/AppContext";
import { Modal, Btn, Field, Input } from "./ui";
import { Warehouse, ArrowLeftRight, Repeat, ClipboardList, Users, FileBarChart2, BookOpen, List, Settings, Moon, Sun, ChevronDown, Languages, LogOut, KeyRound, ShieldAlert } from "lucide-react";
import { KmdLogo } from "./KmdLogo";

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
  if (menuPage === "admin-users" && (currentPage === "admin-roles" || currentPage === "admin-settings")) return true;
  if (menuPage === "podotchetniki" && currentPage === "podotchetnik-card") return true;
  if (menuPage === "spravochniki" && currentPage === "spravochnik-detail") return true;
  return false;
}

// ── Смена пароля ─────────────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { changePassword, securityPolicy } = useApp();
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError] = useState<string | null>(null);

  const liveErrors = newPwd ? evaluatePasswordRules(newPwd, securityPolicy) : [];

  const submit = () => {
    setError(null);
    if (!oldPwd || !newPwd || !confirmPwd) { setError("Заполните все поля"); return; }
    if (newPwd !== confirmPwd) { setError("Новый пароль и подтверждение не совпадают"); return; }
    const result = changePassword(oldPwd, newPwd);
    if (result) { setError(result); return; }
    onClose();
  };

  return (
    <Modal
      title="Смена пароля"
      onClose={onClose}
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={submit} disabled={!oldPwd || !newPwd || !confirmPwd || liveErrors.length > 0}>Сохранить</Btn>
      </>}
    >
      <div className="space-y-4">
        <Field label="Текущий пароль"><Input value={oldPwd} onChange={setOldPwd} placeholder="••••••••" /></Field>
        <Field label="Новый пароль"><Input value={newPwd} onChange={setNewPwd} placeholder="••••••••" /></Field>
        <Field label="Подтверждение нового пароля"><Input value={confirmPwd} onChange={setConfirmPwd} placeholder="••••••••" /></Field>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500 space-y-1">
          <div>Требования к паролю:</div>
          <ul className="list-disc list-inside space-y-0.5">
            <li>не менее {securityPolicy.minLength} символов;</li>
            <li>не менее {securityPolicy.minCharTypes} из 4 типов символов (заглавные, строчные буквы, цифры, спецсимволы);</li>
            <li>должен отличаться от последних {securityPolicy.historyDepth} паролей не менее чем в {securityPolicy.minDiffPositions} позициях.</li>
          </ul>
        </div>

        {liveErrors.length > 0 && (
          <div className="text-xs text-amber-600 space-y-0.5">
            {liveErrors.map(e => <div key={e}>• {e}</div>)}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── User dropdown ─────────────────────────────────────────────────────────────

function UserDropdown({ onChangePassword }: { onChangePassword: () => void }) {
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

          {/* Смена пароля */}
          <button
            onClick={() => { setOpen(false); onChangePassword(); }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/40 transition-colors border-b border-slate-700"
          >
            <KeyRound className="w-4 h-4 text-slate-400" />
            Сменить пароль
          </button>

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

// ── Сессия: автозавершение по неактивности ────────────────────────────────────

function useSessionTimeout(timeoutMinutes: number, onTimeout: () => void) {
  useEffect(() => {
    if (!timeoutMinutes || timeoutMinutes <= 0) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(onTimeout, timeoutMinutes * 60 * 1000);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [timeoutMinutes, onTimeout]);
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function Layout({ children }: { children: React.ReactNode }) {
  const { page, navigate, tr, theme, toggleTheme, currentUser, logout, securityPolicy } = useApp();
  const [showChangePassword, setShowChangePassword] = useState(false);

  useSessionTimeout(securityPolicy.sessionTimeoutMinutes, () => {
    logout("Сессия завершена по истечении периода неактивности. Войдите снова.");
  });

  const passwordExpired = currentUser ? daysSince(currentUser.passwordChangedAt) >= securityPolicy.expiryDays : false;

  return (
    <div className="flex h-full" style={{ backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc" }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-slate-900 flex flex-col h-full overflow-hidden">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-slate-700/60">
          <button
            onClick={() => navigate("dashboard")}
            className="flex items-center gap-2.5 w-full text-left rounded-lg -m-1 p-1 hover:bg-slate-800 transition-colors"
            title="Перейти на главную"
          >
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md shadow-blue-900/50 shrink-0 p-1 ring-1 ring-black/5">
              <KmdLogo className="w-full h-full" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm leading-tight tracking-tight">СДМ</div>
              <div className="text-slate-500 text-[10px] leading-tight mt-0.5">Монетный Двор</div>
            </div>
          </button>
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
          <button
            onClick={() => navigate("dashboard")}
            className="flex items-center gap-2 hover:text-white transition-colors"
            title="Перейти на главную"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-slate-400 text-sm">
              {tr("login.sub").split(" ").slice(0, 3).join(" ")}
            </span>
          </button>

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
            <UserDropdown onChangePassword={() => setShowChangePassword(true)} />
          </div>
        </header>

        {/* Password expiry banner */}
        {passwordExpired && (
          <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              Истёк срок действия пароля (обязательная смена не реже 1 раза в {Math.round(securityPolicy.expiryDays / 30)} мес.). Пожалуйста, смените пароль.
            </div>
            <Btn size="sm" onClick={() => setShowChangePassword(true)}>Сменить пароль</Btn>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc" }}>
          {children}
        </main>
      </div>

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
}
