import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  GPItem, DMItem, SkladDoc, Operation, ShihtovayaKarta,
  Podotchetnik, AppUser, Role, LogEntry,
  initialGPItems, initialDMItems, initialSkladDocs, initialVydachaDocs,
  initialOperations, initialShihtovyeKarty, initialPodotchetniki,
  initialUsers, initialRoles, initialLogs,
} from "../data/mock";

export type Page =
  | "sklady-hub" | "ostatok-gp" | "ostatok-dm"
  | "sklad-oper-hub" | "prihod-list" | "vydacha-list"
  | "dvizhenie-mat"
  | "shihtovye-karty"
  | "podotchetniki" | "podotchetnik-card"
  | "otchetnost"
  | "spravochniki" | "spravochnik-detail"
  | "logirovanie"
  | "admin-users" | "admin-roles";

interface AppCtx {
  page: Page;
  pageParams: Record<string, string>;
  navigate: (p: Page, params?: Record<string, string>) => void;

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

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>("ostatok-gp");
  const [pageParams, setPageParams] = useState<Record<string, string>>({});

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
