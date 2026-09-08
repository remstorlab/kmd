import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  GPItem, DMItem, SkladDoc, Operation, ShihtovayaKarta,
  Podotchetnik, AppUser, Role, LogEntry,
  initialGPItems, initialDMItems, initialSkladDocs, initialVydachaDocs,
  initialOperations, initialShihtovyeKarty, initialPodotchetniki,
  initialUsers, initialRoles, initialLogs,
} from "../data/mock";

export type Page =
  | "dashboard"
  | "sklady-hub" | "ostatok-gp" | "ostatok-dm"
  | "sklad-oper-hub" | "prihod-list" | "vydacha-list"
  | "dvizhenie-mat"
  | "shihtovye-karty"
  | "podotchetniki" | "podotchetnik-card"
  | "otchetnost"
  | "spravochniki" | "spravochnik-detail"
  | "logirovanie"
  | "admin-users" | "admin-roles";

export type Theme = "light" | "dark";
export type Lang = "ru" | "kz";

// ── Translations ──────────────────────────────────────────────────────────────

export const t: Record<Lang, Record<string, string>> = {
  ru: {
    // Nav
    "nav.dashboard": "Главная",
    "nav.sklady": "Склады",
    "nav.skladOper": "Складские операции",
    "nav.dvizhenie": "Движение материала",
    "nav.shihtovye": "Шихтовые карты",
    "nav.podotchet": "Подотчётники",
    "nav.otchet": "Отчётность",
    "nav.sprav": "Справочники",
    "nav.log": "Логирование",
    "nav.admin": "Панель администрирования",
    // Login
    "login.title": "СДМ",
    "login.sub": "Система учёта ДМ",
    "login.username": "Имя пользователя",
    "login.password": "Пароль",
    "login.remember": "Запомнить меня",
    "login.btn": "Войти в систему",
    "login.error": "Неверный логин или пароль",
    "login.hint": "Введите admin / admin для входа",
    // Header
    "header.logout": "Выйти",
    "header.theme.dark": "Тёмная тема",
    "header.theme.light": "Светлая тема",
    // Common
    "btn.save": "Сохранить",
    "btn.cancel": "Отмена",
    "btn.add": "Добавить",
    "btn.delete": "Удалить",
    "btn.export": "Экспорт в Excel",
    "btn.accept": "Принять на склад",
    "btn.release": "Выдать со склада",
    "filter.reset": "Сбросить фильтры",
    "filter.allStatus": "Все статусы",
    "filter.allWarehouses": "Все склады",
  },
  kz: {
    // Nav
    "nav.dashboard": "Басты бет",
    "nav.sklady": "Қоймалар",
    "nav.skladOper": "Қойма операциялары",
    "nav.dvizhenie": "Материал қозғалысы",
    "nav.shihtovye": "Шихта карталары",
    "nav.podotchet": "Есепшілер",
    "nav.otchet": "Есептілік",
    "nav.sprav": "Анықтамалықтар",
    "nav.log": "Тіркеу журналы",
    "nav.admin": "Басқару панелі",
    // Login
    "login.title": "СДМ",
    "login.sub": "Бағалы материалдарды есепке алу жүйесі",
    "login.username": "Пайдаланушы аты",
    "login.password": "Құпия сөз",
    "login.remember": "Мені есте сақтау",
    "login.btn": "Жүйеге кіру",
    "login.error": "Қате логин немесе құпия сөз",
    "login.hint": "Кіру үшін admin / admin енгізіңіз",
    // Header
    "header.logout": "Шығу",
    "header.theme.dark": "Күңгірт тақырып",
    "header.theme.light": "Жарық тақырып",
    // Common
    "btn.save": "Сақтау",
    "btn.cancel": "Болдырмау",
    "btn.add": "Қосу",
    "btn.delete": "Жою",
    "btn.export": "Excel-ге экспорт",
    "btn.accept": "Қоймаға қабылдау",
    "btn.release": "Қоймадан беру",
    "filter.reset": "Сүзгілерді тазалау",
    "filter.allStatus": "Барлық мәртебелер",
    "filter.allWarehouses": "Барлық қоймалар",
  },
};

interface AppCtx {
  // Auth
  isLoggedIn: boolean;
  currentUser: { name: string; email: string; initials: string } | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;

  // Theme
  theme: Theme;
  toggleTheme: () => void;

  // Language
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: (key: string) => string;

  // Navigation
  page: Page;
  pageParams: Record<string, string>;
  navigate: (p: Page, params?: Record<string, string>) => void;

  // Data
  gpItems: GPItem[];
  setGpItems: React.Dispatch<React.SetStateAction<GPItem[]>>;
  dmItems: DMItem[];
  setDmItems: React.Dispatch<React.SetStateAction<DMItem[]>>;
  skladDocs: SkladDoc[];
  setSkladDocs: React.Dispatch<React.SetStateAction<SkladDoc[]>>;
  vydachaDocs: SkladDoc[];
  setVydachaDocs: React.Dispatch<React.SetStateAction<SkladDoc[]>>;
  operations: Operation[];
  setOperations: React.Dispatch<React.SetStateAction<Operation[]>>;
  shihtovyeKarty: ShihtovayaKarta[];
  setShihtovyeKarty: React.Dispatch<React.SetStateAction<ShihtovayaKarta[]>>;
  podotchetniki: Podotchetnik[];
  setPodotchetniki: React.Dispatch<React.SetStateAction<Podotchetnik[]>>;
  users: AppUser[];
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
  roles: Role[];
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  logs: LogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
}

const Ctx = createContext<AppCtx>(null!);

const MOCK_USERS = [
  { username: "admin", password: "admin", name: "Е. Ковалева", email: "e.kovaleva@monetka-dm.ru", initials: "ЕК" },
  { username: "nurlanov", password: "1234", name: "А.Б. Нурланов", email: "a.nurlanov@monetka-dm.ru", initials: "АН" },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppCtx["currentUser"]>(null);

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("dm-theme") as Theme) || "light";
  });
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("dm-lang") as Lang) || "ru";
  });

  const [page, setPage] = useState<Page>("dashboard");
  const [pageParams, setPageParams] = useState<Record<string, string>>({});

  // Apply dark class to <html>
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dm-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light");

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("dm-lang", l);
  };

  const tr = (key: string) => t[lang][key] ?? t["ru"][key] ?? key;

  const login = (username: string, password: string): boolean => {
    const user = MOCK_USERS.find(u => u.username === username && u.password === password);
    if (user) {
      setIsLoggedIn(true);
      setCurrentUser({ name: user.name, email: user.email, initials: user.initials });
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setPage("dashboard");
  };

  const navigate = (p: Page, params: Record<string, string> = {}) => {
    setPage(p);
    setPageParams(params);
  };

  const [gpItems, setGpItems] = useState(initialGPItems);
  const [dmItems, setDmItems] = useState(initialDMItems);
  const [skladDocs, setSkladDocs] = useState(initialSkladDocs);
  const [vydachaDocs, setVydachaDocs] = useState(initialVydachaDocs);
  const [operations, setOperations] = useState(initialOperations);
  const [shihtovyeKarty, setShihtovyeKarty] = useState(initialShihtovyeKarty);
  const [podotchetniki, setPodotchetniki] = useState(initialPodotchetniki);
  const [users, setUsers] = useState(initialUsers);
  const [roles, setRoles] = useState(initialRoles);
  const [logs, setLogs] = useState(initialLogs);

  return (
    <Ctx.Provider value={{
      isLoggedIn, currentUser, login, logout,
      theme, toggleTheme,
      lang, setLang, tr,
      page, pageParams, navigate,
      gpItems, setGpItems,
      dmItems, setDmItems,
      skladDocs, setSkladDocs,
      vydachaDocs, setVydachaDocs,
      operations, setOperations,
      shihtovyeKarty, setShihtovyeKarty,
      podotchetniki, setPodotchetniki,
      users, setUsers,
      roles, setRoles,
      logs, setLogs,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  return useContext(Ctx);
}
