import React from "react";
import { AppProvider, useApp } from "./store/AppContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import { SkladyHub, OstatokGP, OstatokDM } from "./pages/Sklady";
import { SkladskieOperHub, PrihodList, VydachaList } from "./pages/SkladskieOper";
import { DvizhenieMateriаla } from "./pages/DvizhenieMateriаla";
import { ShihtovyeKarty } from "./pages/ShihtovyeKarty";
import { Podotchetniki } from "./pages/Podotchetniki";
import { Otchetnost } from "./pages/Otchetnost";
import { Spravochniki } from "./pages/Spravochniki";
import { Logirovanie } from "./pages/Logirovanie";
import { PanelAdmin } from "./pages/Admin";

function PageRouter() {
  const { page } = useApp();
  switch (page) {
    case "sklady-hub":        return <SkladyHub />;
    case "ostatok-gp":        return <OstatokGP />;
    case "ostatok-dm":        return <OstatokDM />;
    case "sklad-oper-hub":    return <SkladskieOperHub />;
    case "prihod-list":       return <PrihodList />;
    case "vydacha-list":      return <VydachaList />;
    case "dvizhenie-mat":     return <DvizhenieMateriаla />;
    case "shihtovye-karty":   return <ShihtovyeKarty />;
    case "podotchetniki":     return <Podotchetniki />;
    case "podotchetnik-card": return <Podotchetniki />;
    case "otchetnost":        return <Otchetnost />;
    case "spravochniki":      return <Spravochniki />;
    case "spravochnik-detail":return <Spravochniki />;
    case "logirovanie":       return <Logirovanie />;
    case "admin-users":       return <PanelAdmin />;
    case "admin-roles":       return <PanelAdmin />;
    default:                  return <OstatokGP />;
  }
}

function AppShell() {
  const { isLoggedIn } = useApp();
  if (!isLoggedIn) return <Login />;
  return (
    <Layout>
      <PageRouter />
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
