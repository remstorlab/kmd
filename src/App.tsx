import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { AppProvider, useApp } from "./store/AppContext";
import { LOGIN_PATH, PAGE_PATHS, SCREENS_PATH } from "./router";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { SkladyHub, OstatokGP, OstatokDM } from "./pages/Sklady";
import { SkladskieOperHub, PrihodList, VydachaList } from "./pages/SkladskieOper";
import { DvizhenieMateriаla } from "./pages/DvizhenieMateriаla";
import { ShihtovyeKarty } from "./pages/ShihtovyeKarty";
import { Podotchetniki } from "./pages/Podotchetniki";
import { Otchetnost } from "./pages/Otchetnost";
import { Spravochniki } from "./pages/Spravochniki";
import { Logirovanie } from "./pages/Logirovanie";
import { PanelAdmin } from "./pages/Admin";
import { Ekrany } from "./pages/Ekrany";

// Приложение может быть развёрнуто не в корне домена — basename берём из base Vite.
const basename = new URL(import.meta.env.BASE_URL, window.location.origin).pathname.replace(/\/$/, "") || undefined;

// «/*» — внутри раздела модалки и вложенные экраны тоже адресуются путём (см. src/router.tsx).
const P = PAGE_PATHS;

function AppShell() {
  const { isLoggedIn } = useApp();
  const { pathname } = useLocation();
  if (!isLoggedIn) return <Login />;
  if (pathname === LOGIN_PATH) return <Navigate to="/" replace />;
  return (
    <Layout>
      <Routes>
        <Route path={P["dashboard"]} element={<Dashboard />} />
        <Route path={P["sklady-hub"]} element={<SkladyHub />} />
        <Route path={`${P["ostatok-gp"]}/*`} element={<OstatokGP />} />
        <Route path={`${P["ostatok-dm"]}/*`} element={<OstatokDM />} />
        <Route path={P["sklad-oper-hub"]} element={<SkladskieOperHub />} />
        <Route path={`${P["prihod-list"]}/*`} element={<PrihodList />} />
        <Route path={`${P["vydacha-list"]}/*`} element={<VydachaList />} />
        <Route path={`${P["dvizhenie-mat"]}/*`} element={<DvizhenieMateriаla />} />
        <Route path={`${P["shihtovye-karty"]}/*`} element={<ShihtovyeKarty />} />
        <Route path={`${P["podotchetniki"]}/*`} element={<Podotchetniki />} />
        <Route path={P["otchetnost"] + "/*"} element={<Otchetnost />} />
        <Route path={`${P["spravochniki"]}/*`} element={<Spravochniki />} />
        <Route path={`${P["logirovanie"]}/*`} element={<Logirovanie />} />
        <Route path={`${P["admin-users"]}/*`} element={<PanelAdmin />} />
        <Route path={`${P["admin-roles"]}/*`} element={<PanelAdmin />} />
        <Route path={P["admin-settings"]} element={<PanelAdmin />} />
        <Route path={SCREENS_PATH} element={<Ekrany />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </BrowserRouter>
  );
}
