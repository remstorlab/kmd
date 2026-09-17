export type StatusGP = "На складе" | "Резерв" | "В подотчёте";
export type StatusDM = "На складе" | "Резерв" | "В подотчёте";
export type DocStatus = "Оформлено" | "Редактирование";
export type OpType = "Выдача" | "Возврат" | "Выдача-Возврат";
export type OpVid = "Отбор пробы" | "Анализ в ЛКИ" | "Плавка" | "Гальванопокрытие" | "Производство ГП";
export type UserStatus = "Активен" | "Заблокирован";
export type LogType = "Создание" | "Изменение" | "Удаление" | "Закрытие";
export type ShihtaStatus = "Новая" | "Выполнена";

export interface GPItem {
  id: string;
  name: string;
  nomenkl: string;
  qty: number;
  unit: string;
  klass: string;
  code: string;
  location: string;
  status: StatusGP;
}

export type Metal = "Au" | "Ag" | "Pt" | "Pd";

// Извлекает базовый код металла (Au/Ag/Pt/Pd) из значения поля «Металл»,
// которое теперь хранит составную строку из справочника «Коды материалов»
// (Краткое наименование-Код, напр. «Au чистое-1000»).
export function baseMetal(metalValue: string): Metal {
  const prefix = metalValue.slice(0, 2);
  return prefix === "Au" || prefix === "Ag" || prefix === "Pt" || prefix === "Pd" ? prefix : "Au";
}

export interface DMItem {
  id: string;
  name: string;
  nomenkl: string;
  klass: string;
  metal: string;
  qty: number;
  proba: number;
  ligWeight: number;
  netWeight: number;
  location: string;
  status: StatusDM;
  au?: string;
  ag?: string;
  pd?: string;
  rh?: string;
  pt?: string;
}

export interface SkladDoc {
  id: string;
  date: string;
  type: "Приходный ордер" | "Накладная на приём ГП" | "Накладная на приём ДМ" | "Накладная на отгрузку ГП" | "Накладная на отгрузку";
  number: string;
  status: DocStatus;
  sender: string;
  receiver: string;
}

export interface Operation {
  id: string;
  date: string;
  type: OpType;
  vid: OpVid;
  positions: number;
  document: string;
  responsible: string;
  statusVydacha: "Выдано" | "Не выдано";
  statusVozvrat: "Не начат" | "Частично" | "Полностью";
  statusClose: "Не закрыто" | "Закрыто: списано" | "Закрыто";
}

export interface ShihtaMaterial {
  name: string;
  nomenkl: string;
  klass: string;
  proba: number;
  ves: number;
  loc: string;
}

export interface ShihtovayaKarta {
  id: string;
  date: string;
  name: string;
  plavkaNo: string;
  status: ShihtaStatus;
  materials: ShihtaMaterial[];
  createdAt: string;
  createdBy: string;
}

export interface PodotchetPosition {
  name: string;
  nomenkl: string;
  klass: string;
  metal: Metal;
  qty: number;
  proba: number;
  ligWeight: number;
  netWeight: number;
  location: string;
  status: StatusDM;
}

export interface PodotchetProcess {
  id: string;
  name: string;
  vid: OpVid;
  date: string;
  completedDate?: string;
  positions: PodotchetPosition[];
}

export interface Podotchetnik {
  id: string;
  name: string;
  tabelNo: string;
  department: string;
  position: string;
  materials: { name: string; nomenkl: string; weight: number }[];
  currentProcesses: PodotchetProcess[];
  completedProcesses: PodotchetProcess[];
}

export interface AppUser {
  id: string;
  name: string;
  role: string;
  status: UserStatus;
  email: string;
  username: string;
}

export interface RolePermissions {
  base: Record<string, string[]>;
  actions: Record<string, string[]>;
}

export interface SecurityPolicy {
  minLength: number;
  minCharTypes: number;
  expiryDays: number;
  historyDepth: number;
  minDiffPositions: number;
  sessionTimeoutMinutes: number;
}

export const initialSecurityPolicy: SecurityPolicy = {
  minLength: 8,
  minCharTypes: 3,
  expiryDays: 90,
  historyDepth: 3,
  minDiffPositions: 3,
  sessionTimeoutMinutes: 30,
};

export interface Role {
  id: string;
  name: string;
  active: boolean;
  permissions?: RolePermissions;
  createdAt: string;
  createdBy: string;
}

export type LogItemStatus = "Новая" | "Изменена" | "Без изменений" | "Удалена" | "Объединена" | "Преобразована" | "Исчезла";

export interface LogSnapshotItem {
  title: string;
  status: LogItemStatus;
  attrs: { label: string; value: string }[];
}

export interface LogEntry {
  id: string;
  datetime: string;
  user: string;
  section: string;
  type: LogType;
  description: string;
  before?: LogSnapshotItem[];
  after?: LogSnapshotItem[];
}

// --- GP Items (34 total) ---
export const initialGPItems: GPItem[] = [
  { id: "gp1", name: "Кольцо обручальное 585", nomenkl: "GP-KOL-585-01", qty: 24, unit: "шт", klass: "Золото", code: "ЗлМ 585-0100", location: "Сейф №1, Полка 1", status: "На складе" },
  { id: "gp2", name: "Цепочка золотая Бисмарк", nomenkl: "GP-CEP-750-03", qty: 12, unit: "шт", klass: "Золото", code: "ЗлСрМ 750-150-0300", location: "Сейф №1, Полка 2", status: "На складе" },
  { id: "gp3", name: "Серьги с бриллиантами 0.5ct", nomenkl: "GP-SER-585-07", qty: 8, unit: "шт", klass: "Золото", code: "ЗлМ 585-0100", location: "Сейф №2, Полка 1", status: "Резерв" },
  { id: "gp4", name: "Браслет серебряный", nomenkl: "GP-BRA-925-02", qty: 36, unit: "шт", klass: "Серебро", code: "Ag чистое-2000", location: "Сейф №2, Полка 2", status: "На складе" },
  { id: "gp5", name: "Подвеска платиновая", nomenkl: "GP-POD-950-01", qty: 6, unit: "шт", klass: "Платина", code: "Pt чистое-4000", location: "Витрина №1", status: "В подотчёте" },
  { id: "gp6", name: "Запонки золотые", nomenkl: "GP-ZAP-750-04", qty: 18, unit: "шт", klass: "Золото", code: "ЗлСрМ 750-150-0300", location: "Витрина №2", status: "На складе" },
  { id: "gp7", name: "Колье серебряное ажурное", nomenkl: "GP-KLY-925-05", qty: 14, unit: "шт", klass: "Серебро", code: "Ag чистое-2000", location: "Сейф №3, Полка 1", status: "Резерв" },
  { id: "gp8", name: "Печатка мужская золотая", nomenkl: "GP-PCH-585-09", qty: 10, unit: "шт", klass: "Золото", code: "ЗлМ 585-0100", location: "Сейф №3, Полка 2", status: "В подотчёте" },
  { id: "gp9", name: "Кулон сердце серебро", nomenkl: "GP-KUL-925-11", qty: 22, unit: "шт", klass: "Серебро", code: "Ag чистое-2000", location: "Сейф №1, Полка 1", status: "На складе" },
  { id: "gp10", name: "Браслет золотой плетёный", nomenkl: "GP-BRA-585-06", qty: 9, unit: "шт", klass: "Золото", code: "ЗлМ 585-0100", location: "Сейф №1, Полка 2", status: "На складе" },
  { id: "gp11", name: "Серьги серебряные с топазом", nomenkl: "GP-SER-925-13", qty: 16, unit: "шт", klass: "Серебро", code: "Ag чистое-2000", location: "Сейф №2, Полка 1", status: "Резерв" },
  { id: "gp12", name: "Кольцо с изумрудом 750", nomenkl: "GP-KOL-750-14", qty: 4, unit: "шт", klass: "Золото", code: "ЗлСрМ 750-150-0300", location: "Сейф №2, Полка 2", status: "В подотчёте" },
  { id: "gp13", name: "Цепочка серебряная якорная", nomenkl: "GP-CEP-925-15", qty: 30, unit: "шт", klass: "Серебро", code: "Ag чистое-2000", location: "Витрина №1", status: "На складе" },
  { id: "gp14", name: "Перстень золотой с рубином", nomenkl: "GP-PER-585-16", qty: 5, unit: "шт", klass: "Золото", code: "ЗлМ 585-0100", location: "Витрина №2", status: "На складе" },
  { id: "gp15", name: "Брошь серебряная", nomenkl: "GP-BRO-925-17", qty: 11, unit: "шт", klass: "Серебро", code: "Ag чистое-2000", location: "Сейф №3, Полка 1", status: "На складе" },
  { id: "gp16", name: "Медальон золотой 585", nomenkl: "GP-MED-585-18", qty: 7, unit: "шт", klass: "Золото", code: "ЗлМ 585-0100", location: "Сейф №3, Полка 2", status: "Резерв" },
  { id: "gp17", name: "Кольцо обручальное 750", nomenkl: "GP-KOL-750-19", qty: 20, unit: "шт", klass: "Золото", code: "ЗлСрМ 750-150-0300", location: "Сейф №1, Полка 1", status: "На складе" },
  { id: "gp18", name: "Подвеска серебряная луна", nomenkl: "GP-POD-925-20", qty: 19, unit: "шт", klass: "Серебро", code: "Ag чистое-2000", location: "Сейф №1, Полка 2", status: "На складе" },
  { id: "gp19", name: "Серьги золотые пуссеты", nomenkl: "GP-SER-585-21", qty: 28, unit: "шт", klass: "Золото", code: "ЗлМ 585-0100", location: "Сейф №2, Полка 1", status: "На складе" },
  { id: "gp20", name: "Браслет платиновый тонкий", nomenkl: "GP-BRA-950-22", qty: 3, unit: "шт", klass: "Платина", code: "Pt чистое-4000", location: "Сейф №2, Полка 2", status: "В подотчёте" },
  { id: "gp21", name: "Колье золотое с жемчугом", nomenkl: "GP-KLY-585-23", qty: 6, unit: "шт", klass: "Золото", code: "ЗлМ 585-0100", location: "Витрина №1", status: "Резерв" },
  { id: "gp22", name: "Кулон серебряный якорь", nomenkl: "GP-KUL-925-24", qty: 15, unit: "шт", klass: "Серебро", code: "Ag чистое-2000", location: "Витрина №2", status: "На складе" },
  { id: "gp23", name: "Часы золотые Au-750", nomenkl: "GP-CHA-750-25", qty: 2, unit: "шт", klass: "Золото", code: "ЗлСрМ 750-150-0300", location: "Сейф №3, Полка 1", status: "В подотчёте" },
  { id: "gp24", name: "Кольцо серебряное с ониксом", nomenkl: "GP-KOL-925-26", qty: 13, unit: "шт", klass: "Серебро", code: "Ag чистое-2000", location: "Сейф №3, Полка 2", status: "На складе" },
  { id: "gp25", name: "Брошь золотая бабочка", nomenkl: "GP-BRO-585-27", qty: 8, unit: "шт", klass: "Золото", code: "ЗлМ 585-0100", location: "Сейф №1, Полка 1", status: "На складе" },
  { id: "gp26", name: "Цепочка золотая гурмет", nomenkl: "GP-CEP-750-28", qty: 11, unit: "шт", klass: "Золото", code: "ЗлСрМ 750-150-0300", location: "Сейф №1, Полка 2", status: "Резерв" },
  { id: "gp27", name: "Серьги серебряные геометрия", nomenkl: "GP-SER-925-29", qty: 25, unit: "шт", klass: "Серебро", code: "Ag чистое-2000", location: "Сейф №2, Полка 1", status: "На складе" },
  { id: "gp28", name: "Перстень золотой классика", nomenkl: "GP-PER-750-30", qty: 9, unit: "шт", klass: "Золото", code: "ЗлСрМ 750-150-0300", location: "Сейф №2, Полка 2", status: "На складе" },
  { id: "gp29", name: "Ожерелье серебряное rose", nomenkl: "GP-OZH-925-31", qty: 7, unit: "шт", klass: "Серебро", code: "Ag чистое-2000", location: "Витрина №1", status: "В подотчёте" },
  { id: "gp30", name: "Кольцо платиновое обручальное", nomenkl: "GP-KOL-950-32", qty: 17, unit: "шт", klass: "Платина", code: "Pt чистое-4000", location: "Витрина №2", status: "На складе" },
  { id: "gp31", name: "Браслет серебряный шармы", nomenkl: "GP-BRA-925-33", qty: 21, unit: "шт", klass: "Серебро", code: "Ag чистое-2000", location: "Сейф №3, Полка 1", status: "На складе" },
  { id: "gp32", name: "Серьги золотые капли", nomenkl: "GP-SER-585-34", qty: 14, unit: "шт", klass: "Золото", code: "ЗлМ 585-0100", location: "Сейф №3, Полка 2", status: "Резерв" },
  { id: "gp33", name: "Колье платиновое с бриллиантом", nomenkl: "GP-KLY-950-35", qty: 1, unit: "шт", klass: "Платина", code: "Pt чистое-4000", location: "Сейф №1, Полка 1", status: "В подотчёте" },
  { id: "gp34", name: "Кулон золотой infinity", nomenkl: "GP-KUL-585-36", qty: 16, unit: "шт", klass: "Золото", code: "ЗлМ 585-0100", location: "Сейф №1, Полка 2", status: "На складе" },
];

// --- DM Items ---
export const initialDMItems: DMItem[] = [
  { id: "dm1", name: "Слиток золота ЗлА-1", nomenkl: "DM-001", klass: "Слиток", metal: "Au чистое-1000", qty: 1, proba: 999, ligWeight: 500.25, netWeight: 498.12, location: "Сейф №1, Полка 1", status: "На складе", au: "498.12", ag: "-", pd: "-", rh: "-", pt: "-" },
  { id: "dm2", name: "Слиток серебра СрА-2", nomenkl: "DM-002", klass: "Слиток", metal: "Ag чистое-2000", qty: 1, proba: 999, ligWeight: 1000.50, netWeight: 998.30, location: "Сейф №1, Полка 2", status: "На складе", au: "-", ag: "998.30", pd: "-", rh: "-", pt: "-" },
  { id: "dm3", name: "Стружка золотая", nomenkl: "DM-003", klass: "Стружка", metal: "Au чистое-1000", qty: 1, proba: 585, ligWeight: 45.80, netWeight: 26.79, location: "Сейф №2, Полка 1", status: "На складе", au: "26.79", ag: "-", pd: "-", rh: "-", pt: "-" },
  { id: "dm4", name: "Проба золота Au-750", nomenkl: "DM-004", klass: "Проба", metal: "Au чистое-1000", qty: 1, proba: 750, ligWeight: 12.30, netWeight: 9.22, location: "Сейф №2, Полка 3", status: "Резерв", au: "9.22", ag: "-", pd: "-", rh: "-", pt: "-" },
  { id: "dm5", name: "Раствор серебра AgNO3", nomenkl: "DM-005", klass: "Раствор", metal: "Ag чистое-2000", qty: 1, proba: 999, ligWeight: 250.00, netWeight: 249.10, location: "Сейф №3, Полка 1", status: "В подотчёте", au: "-", ag: "249.10", pd: "-", rh: "-", pt: "-" },
  { id: "dm6", name: "Слиток платины ПлА-1", nomenkl: "DM-006", klass: "Слиток", metal: "Pt чистое-4000", qty: 1, proba: 999, ligWeight: 300.00, netWeight: 299.50, location: "Сейф №1, Полка 3", status: "На складе", au: "-", ag: "-", pd: "-", rh: "-", pt: "299.50" },
  { id: "dm7", name: "Лом золота 585", nomenkl: "DM-007", klass: "Лом", metal: "Au чистое-1000", qty: 1, proba: 585, ligWeight: 88.40, netWeight: 51.71, location: "Сейф №2, Полка 2", status: "На складе", au: "51.71", ag: "-", pd: "-", rh: "-", pt: "-" },
  { id: "dm8", name: "Золотой порошок Au", nomenkl: "DM-008", klass: "Порошок", metal: "Au чистое-1000", qty: 1, proba: 999, ligWeight: 25.00, netWeight: 24.95, location: "Сейф №3, Полка 3", status: "Резерв", au: "24.95", ag: "-", pd: "-", rh: "-", pt: "-" },
];

// --- Складские документы ---
export const initialSkladDocs: SkladDoc[] = [
  { id: "sd1", date: "19.08.2026", type: "Приходный ордер", number: "ПО-0342", status: "Редактирование", sender: "ОО «АурумПоставка»", receiver: "Склад ДМ №1" },
  { id: "sd2", date: "18.08.2026", type: "Накладная на приём ГП", number: "НП-0118", status: "Редактирование", sender: "Производственный цех", receiver: "Склад ГП" },
  { id: "sd3", date: "17.08.2026", type: "Приходный ордер", number: "ПО-0341", status: "Оформлено", sender: "АО «Металл Инвест»", receiver: "Склад ДМ №2" },
  { id: "sd4", date: "16.08.2026", type: "Накладная на приём ГП", number: "НП-0117", status: "Оформлено", sender: "Ювелирный цех", receiver: "Склад ГП" },
  { id: "sd5", date: "15.08.2026", type: "Приходный ордер", number: "ПО-0340", status: "Оформлено", sender: "ОО «СереброТрейд»", receiver: "Склад ДМ №1" },
  { id: "sd6", date: "14.08.2026", type: "Накладная на приём ГП", number: "НП-0116", status: "Оформлено", sender: "Производственный цех", receiver: "Склад ГП" },
];

export const initialVydachaDocs: SkladDoc[] = [
  { id: "vd1", date: "19.08.2026", type: "Накладная на отгрузку ГП", number: "НО-0205", status: "Редактирование", sender: "Склад ДМ №2", receiver: "ОАО КАЗЦИНК" },
  { id: "vd2", date: "17.08.2026", type: "Накладная на отгрузку ГП", number: "НО-0204", status: "Оформлено", sender: "Склад ДМ №2", receiver: "НБРК" },
  { id: "vd3", date: "15.08.2026", type: "Накладная на отгрузку", number: "НО-0203", status: "Оформлено", sender: "Склад ДМ №2", receiver: "Отдел продаж" },
];

// --- Операции движения ---
export const initialOperations: Operation[] = [
  { id: "op1", date: "19.08.2026", type: "Выдача", vid: "Плавка", positions: 3, document: "ДВ-001234", responsible: "Нурланов А.Б.", statusVydacha: "Выдано", statusVozvrat: "Не начат", statusClose: "Не закрыто" },
  { id: "op2", date: "18.08.2026", type: "Выдача-Возврат", vid: "Производство ГП", positions: 5, document: "ДВ-001233", responsible: "Петров С.В.", statusVydacha: "Выдано", statusVozvrat: "Частично", statusClose: "Не закрыто" },
  { id: "op3", date: "17.08.2026", type: "Выдача-Возврат", vid: "Отбор пробы", positions: 2, document: "ДВ-001232", responsible: "Смирнов К.Д.", statusVydacha: "Выдано", statusVozvrat: "Полностью", statusClose: "Закрыто" },
  { id: "op4", date: "16.08.2026", type: "Возврат", vid: "Анализ в ЛКИ", positions: 4, document: "ДВ-001231", responsible: "Нурланов А.Б.", statusVydacha: "Выдано", statusVozvrat: "Полностью", statusClose: "Закрыто: списано" },
  { id: "op5", date: "15.08.2026", type: "Выдача", vid: "Гальванопокрытие", positions: 6, document: "ДВ-001230", responsible: "Иванова М.С.", statusVydacha: "Выдано", statusVozvrat: "Не начат", statusClose: "Не закрыто" },
];

// --- Шихтовые карты ---
export const initialShihtovyeKarty: ShihtovayaKarta[] = [
  {
    id: "sk1", date: "19.08.2026", name: "Шихта для плавки Au-585 (партия А)", plavkaNo: "П-2026-0089", status: "Новая",
    materials: [
      { name: "Слиток золота ЗлА-1", nomenkl: "DM-001", klass: "Слиток", proba: 999, ves: 500.25, loc: "Сейф №1, Полка А" },
      { name: "Стружка золотая", nomenkl: "DM-003", klass: "Стружка", proba: 585, ves: 45.80, loc: "Сейф №2, Полка А" },
    ],
    createdAt: "2026-08-19T09:12:00", createdBy: "Ковалева Елена",
  },
  {
    id: "sk2", date: "15.08.2026", name: "Шихта золото 750 пробы", plavkaNo: "П-2026-0088", status: "Новая",
    materials: [
      { name: "Слиток золота 750", nomenkl: "DM-010", klass: "Слиток", proba: 750, ves: 320.00, loc: "Сейф №1, Полка Б" },
    ],
    createdAt: "2026-08-15T14:45:00", createdBy: "Нурланов Асхат Бекович",
  },
  {
    id: "sk3", date: "10.08.2026", name: "Шихта серебро 925 (кольца)", plavkaNo: "П-2026-0087", status: "Выполнена",
    materials: [
      { name: "Слиток серебра СрА-2", nomenkl: "DM-002", klass: "Слиток", proba: 925, ves: 1000.50, loc: "Сейф №1, Полка Б" },
    ],
    createdAt: "2026-08-10T08:30:00", createdBy: "Петров Сергей Владимирович",
  },
  {
    id: "sk4", date: "05.08.2026", name: "Шихта Au-999 слитки партия Б", plavkaNo: "П-2026-0086", status: "Выполнена",
    materials: [
      { name: "Слиток золота стандартный", nomenkl: "НН-72101", klass: "Слиток", proba: 999, ves: 1000.00, loc: "Сейф 1/Полка 1" },
    ],
    createdAt: "2026-08-05T11:00:00", createdBy: "Ковалева Елена",
  },
];

// --- Подотчётники ---
export const initialPodotchetniki: Podotchetnik[] = [
  {
    id: "p1", name: "Нурланов Асхат Бекович", tabelNo: "ТН-001", department: "Плавильный цех", position: "Плавильщик",
    materials: [
      { name: "Слиток золота ЗлА-1", nomenkl: "DM-001", weight: 500.25 },
      { name: "Стружка золотая", nomenkl: "DM-003", weight: 45.80 },
    ],
    currentProcesses: [
      {
        id: "pr-p1-1", name: "Плавка золотых слитков", vid: "Плавка", date: "19.08.2026, 09:00",
        positions: [
          { name: "Слиток золота ЗлА-1", nomenkl: "DM-001", klass: "Слиток", metal: "Au", qty: 1, proba: 999, ligWeight: 500.25, netWeight: 499.75, location: "Сейф №1, Полка А", status: "В подотчёте" },
          { name: "Стружка золотая", nomenkl: "DM-003", klass: "Стружка", metal: "Au", qty: 1, proba: 750, ligWeight: 45.80, netWeight: 34.35, location: "Сейф №2, Полка А", status: "В подотчёте" },
        ],
      },
    ],
    completedProcesses: [
      {
        id: "pr-p1-c1", name: "Плавка серебряного лома", vid: "Плавка", date: "10.08.2026, 08:30", completedDate: "12.08.2026, 17:15",
        positions: [
          { name: "Слиток серебра СрА-2", nomenkl: "DM-002", klass: "Слиток", metal: "Ag", qty: 1, proba: 925, ligWeight: 300.00, netWeight: 277.50, location: "Сейф №1, Полка Б", status: "На складе" },
        ],
      },
    ],
  },
  {
    id: "p2", name: "Петров Сергей Владимирович", tabelNo: "ТН-002", department: "Производственный цех", position: "Ювелир",
    materials: [
      { name: "Проба золота Au-750", nomenkl: "DM-004", weight: 12.30 },
    ],
    currentProcesses: [
      {
        id: "pr-p2-1", name: "Отбор пробы Au-750", vid: "Отбор пробы", date: "18.08.2026, 14:30",
        positions: [
          { name: "Проба золота Au-750", nomenkl: "DM-004", klass: "Проба", metal: "Au", qty: 1, proba: 750, ligWeight: 12.30, netWeight: 9.23, location: "Лаборатория", status: "В подотчёте" },
        ],
      },
    ],
    completedProcesses: [
      {
        id: "pr-p2-c1", name: "Производство кольца Au-585", vid: "Производство ГП", date: "05.08.2026, 10:00", completedDate: "07.08.2026, 16:00",
        positions: [
          { name: "Слиток золота ЗлБ-1", nomenkl: "DM-006", klass: "Слиток", metal: "Au", qty: 1, proba: 585, ligWeight: 20.00, netWeight: 11.70, location: "Сейф №2, Полка А", status: "На складе" },
        ],
      },
    ],
  },
  {
    id: "p3", name: "Смирнов Константин Дмитриевич", tabelNo: "ТН-003", department: "Лаборатория", position: "Лаборант",
    materials: [],
    currentProcesses: [],
    completedProcesses: [
      {
        id: "pr-p3-c1", name: "Анализ пробы Ag-925", vid: "Анализ в ЛКИ", date: "14.08.2026, 09:15", completedDate: "15.08.2026, 11:00",
        positions: [
          { name: "Проба серебра Ag-925", nomenkl: "DM-007", klass: "Проба", metal: "Ag", qty: 1, proba: 925, ligWeight: 8.50, netWeight: 7.86, location: "Лаборатория", status: "На складе" },
        ],
      },
    ],
  },
  {
    id: "p4", name: "Иванова Мария Сергеевна", tabelNo: "ТН-004", department: "Гальванический цех", position: "Гальваник",
    materials: [
      { name: "Раствор серебра AgNO3", nomenkl: "DM-005", weight: 250.00 },
    ],
    currentProcesses: [
      {
        id: "pr-p4-1", name: "Гальванопокрытие изделий", vid: "Гальванопокрытие", date: "17.08.2026, 13:00",
        positions: [
          { name: "Раствор серебра AgNO3", nomenkl: "DM-005", klass: "Раствор", metal: "Ag", qty: 1, proba: 0, ligWeight: 250.00, netWeight: 250.00, location: "Гальванический цех", status: "В подотчёте" },
        ],
      },
    ],
    completedProcesses: [],
  },
  {
    id: "p5", name: "Ким Александр Юрьевич", tabelNo: "ТН-005", department: "Склад ДМ", position: "Кладовщик",
    materials: [],
    currentProcesses: [],
    completedProcesses: [
      {
        id: "pr-p5-c1", name: "Инвентаризация склада ДМ №1", vid: "Отбор пробы", date: "08.08.2026, 08:00", completedDate: "08.08.2026, 18:00",
        positions: [
          { name: "Слиток золота ЗлА-3", nomenkl: "DM-008", klass: "Слиток", metal: "Au", qty: 1, proba: 999, ligWeight: 150.00, netWeight: 149.85, location: "Сейф №3, Полка А", status: "На складе" },
        ],
      },
    ],
  },
  {
    id: "p6", name: "Бекова Айгуль Маратовна", tabelNo: "ТН-006", department: "ПТО", position: "Технолог",
    materials: [], currentProcesses: [], completedProcesses: [],
  },
  {
    id: "p7", name: "Жумабаев Даурен Серикович", tabelNo: "ТН-007", department: "Ювелирный цех", position: "Мастер-ювелир",
    materials: [], currentProcesses: [], completedProcesses: [],
  },
  {
    id: "p8", name: "Орынбекова Динара Кайратовна", tabelNo: "ТН-008", department: "ОТК", position: "Контролёр ОТК",
    materials: [], currentProcesses: [], completedProcesses: [],
  },
];

// --- Пользователи ---
export const initialUsers: AppUser[] = [
  { id: "u1", name: "Ковалева Елена", role: "Администратор", status: "Активен", email: "e.kovaleva@monetka-dm.ru", username: "e.kovaleva" },
  { id: "u2", name: "Нурланов Асхат Бекович", role: "Сотрудник склада ДМ", status: "Активен", email: "a.nurlanov@monetka-dm.ru", username: "a.nurlanov" },
  { id: "u3", name: "Петров Сергей Владимирович", role: "Сотрудник ПТО", status: "Активен", email: "s.petrov@monetka-dm.ru", username: "s.petrov" },
  { id: "u4", name: "Ким Александр Юрьевич", role: "Сотрудник склада ДМ", status: "Заблокирован", email: "a.kim@monetka-dm.ru", username: "a.kim" },
  { id: "u5", name: "Иванова Мария Сергеевна", role: "Технолог", status: "Активен", email: "m.ivanova@monetka-dm.ru", username: "m.ivanova" },
];

// --- Роли ---
export const initialRoles: Role[] = [
  { id: "r1", name: "Администратор", active: true, createdAt: "2026-01-12T09:15:00", createdBy: "Ковалева Елена" },
  { id: "r2", name: "Сотрудник склада ДМ", active: true, createdAt: "2026-01-12T09:20:00", createdBy: "Ковалева Елена" },
  { id: "r3", name: "Сотрудник ПТО", active: true, createdAt: "2026-02-03T11:40:00", createdBy: "Ковалева Елена" },
  { id: "r4", name: "Технолог", active: false, createdAt: "2026-03-18T16:05:00", createdBy: "Нурланов Асхат Бекович" },
];

// --- Логи ---
export const initialLogs: LogEntry[] = [
  {
    id: "l1", datetime: "19.08.2026, 09:42", user: "Ковалева Е.", section: "Склады", type: "Создание",
    description: "Принят приходный ордер ПО-0342 на 3 позиции ДМ",
    before: [],
    after: [
      { title: "DM-101 · Слиток золота ЗлА-5", status: "Новая", attrs: [
        { label: "Наименование", value: "Слиток золота ЗлА-5" }, { label: "Номенкл. №", value: "DM-101" }, { label: "Класс", value: "Слиток" }, { label: "Металл", value: "Au" },
        { label: "Кол-во", value: "1" }, { label: "Проба", value: "999" }, { label: "Лигатурный вес", value: "1000.00 г" }, { label: "Чистый вес", value: "999.00 г" },
        { label: "Место хранения", value: "Сейф №1, Полка А" }, { label: "Статус", value: "На складе" },
      ] },
      { title: "DM-102 · Слиток серебра СрА-3", status: "Новая", attrs: [
        { label: "Наименование", value: "Слиток серебра СрА-3" }, { label: "Номенкл. №", value: "DM-102" }, { label: "Класс", value: "Слиток" }, { label: "Металл", value: "Ag" },
        { label: "Кол-во", value: "1" }, { label: "Проба", value: "925" }, { label: "Лигатурный вес", value: "500.00 г" }, { label: "Чистый вес", value: "462.50 г" },
        { label: "Место хранения", value: "Сейф №1, Полка Б" }, { label: "Статус", value: "На складе" },
      ] },
      { title: "DM-103 · Стружка золотая", status: "Новая", attrs: [
        { label: "Наименование", value: "Стружка золотая" }, { label: "Номенкл. №", value: "DM-103" }, { label: "Класс", value: "Стружка" }, { label: "Металл", value: "Au" },
        { label: "Кол-во", value: "1" }, { label: "Проба", value: "750" }, { label: "Лигатурный вес", value: "120.00 г" }, { label: "Чистый вес", value: "90.00 г" },
        { label: "Место хранения", value: "Сейф №2, Полка А" }, { label: "Статус", value: "На складе" },
      ] },
    ],
  },
  {
    id: "l2", datetime: "19.08.2026, 09:15", user: "Нурланов А.Б.", section: "Движение материала", type: "Изменение",
    description: "Изменено место хранения позиции DM-001",
    before: [{ title: "DM-001 · Слиток золота ЗлА-1", status: "Изменена", attrs: [
      { label: "Наименование", value: "Слиток золота ЗлА-1" }, { label: "Номенкл. №", value: "DM-001" }, { label: "Класс", value: "Слиток" }, { label: "Металл", value: "Au" },
      { label: "Кол-во", value: "1" }, { label: "Проба", value: "999" }, { label: "Лигатурный вес", value: "850.00 г" }, { label: "Чистый вес", value: "849.15 г" },
      { label: "Место хранения", value: "Сейф №2, Полка А" }, { label: "Статус", value: "На складе" },
    ] }],
    after: [{ title: "DM-001 · Слиток золота ЗлА-1", status: "Изменена", attrs: [
      { label: "Наименование", value: "Слиток золота ЗлА-1" }, { label: "Номенкл. №", value: "DM-001" }, { label: "Класс", value: "Слиток" }, { label: "Металл", value: "Au" },
      { label: "Кол-во", value: "1" }, { label: "Проба", value: "999" }, { label: "Лигатурный вес", value: "850.00 г" }, { label: "Чистый вес", value: "849.15 г" },
      { label: "Место хранения", value: "Сейф №1, Полка А" }, { label: "Статус", value: "На складе" },
    ] }],
  },
  {
    id: "l3", datetime: "18.08.2026, 16:30", user: "Петров С.В.", section: "Складские операции", type: "Создание",
    description: "Создана накладная на приём ГП НП-0118",
    before: [],
    after: [{ title: "GP-KOL-585-22 · Кольцо обручальное 585", status: "Новая", attrs: [
      { label: "Наименование", value: "Кольцо обручальное 585" }, { label: "Номенкл. №", value: "GP-KOL-585-22" }, { label: "Класс", value: "Золото" }, { label: "Код", value: "AU-585" },
      { label: "Кол-во", value: "6 шт" }, { label: "Место хранения", value: "Сейф №1, Полка А" }, { label: "Статус", value: "На складе" },
    ] }],
  },
  {
    id: "l4", datetime: "18.08.2026, 14:10", user: "Ковалева Е.", section: "Шихтовые карты", type: "Изменение",
    description: "Обновлена шихтовая карта П-2026-0089",
    before: [{ title: "П-2026-0089 · Шихтовая карта", status: "Изменена", attrs: [
      { label: "Наименование", value: "Шихта на переплавку" }, { label: "Номер плавки", value: "П-2026-0089" }, { label: "Статус", value: "Подготовлена к плавке" },
    ] }],
    after: [{ title: "П-2026-0089 · Шихтовая карта", status: "Изменена", attrs: [
      { label: "Наименование", value: "Шихта на переплавку" }, { label: "Номер плавки", value: "П-2026-0089" }, { label: "Статус", value: "В работе" },
    ] }],
  },
  {
    id: "l5", datetime: "17.08.2026, 11:20", user: "Иванова М.С.", section: "Движение материала", type: "Создание",
    description: "Открыта операция выдачи ДВ-001234 (Гальванопокрытие)",
    before: [],
    after: [{ title: "ДВ-001234 · Операция выдачи", status: "Новая", attrs: [
      { label: "Тип", value: "Выдача" }, { label: "Вид операции", value: "Гальванопокрытие" }, { label: "Статус выдачи", value: "Не выдано" }, { label: "Статус возврата", value: "Не начат" },
    ] }],
  },
  {
    id: "l6", datetime: "16.08.2026, 15:45", user: "Ким А.Ю.", section: "Склады", type: "Удаление",
    description: "Удалена позиция GP-BRA-925-02 из списка (ошибочный ввод)",
    before: [{ title: "GP-BRA-925-02 · Браслет серебряный", status: "Удалена", attrs: [
      { label: "Наименование", value: "Браслет серебряный" }, { label: "Номенкл. №", value: "GP-BRA-925-02" }, { label: "Класс", value: "Серебро" }, { label: "Код", value: "AG-925" },
      { label: "Кол-во", value: "36 шт" }, { label: "Место хранения", value: "Сейф №2, Полка Б" }, { label: "Статус", value: "На складе" },
    ] }],
    after: [],
  },
  {
    id: "l7", datetime: "15.08.2026, 09:00", user: "Нурланов А.Б.", section: "Движение материала", type: "Закрытие",
    description: "Закрыта операция ДВ-001231 (Анализ в ЛКИ) со списанием",
    before: [{ title: "DM-090 · Проба на анализ", status: "Исчезла", attrs: [
      { label: "Наименование", value: "Проба на анализ" }, { label: "Номенкл. №", value: "DM-090" }, { label: "Класс", value: "Проба" }, { label: "Металл", value: "Au" },
      { label: "Кол-во", value: "1" }, { label: "Проба", value: "585" }, { label: "Лигатурный вес", value: "12.40 г" }, { label: "Чистый вес", value: "7.25 г" },
      { label: "Место хранения", value: "Лаборатория" }, { label: "Статус", value: "В подотчёте" },
    ] }],
    after: [],
  },
  {
    id: "l8", datetime: "14.08.2026, 13:25", user: "Ковалева Е.", section: "Администрирование", type: "Создание",
    description: "Добавлен новый пользователь m.ivanova",
    before: [],
    after: [{ title: "m.ivanova · Иванова М.С.", status: "Новая", attrs: [
      { label: "ФИО", value: "Иванова М.С." }, { label: "Логин", value: "m.ivanova" }, { label: "Роль", value: "Оператор склада" }, { label: "Email", value: "m.ivanova@kmd.kz" }, { label: "Статус", value: "Активен" },
    ] }],
  },
  {
    id: "l9", datetime: "20.08.2026, 10:05", user: "Петров С.В.", section: "Склады", type: "Изменение",
    description: "Объединены позиции DM-005 и DM-006 в новую позицию DM-M9931",
    before: [
      { title: "DM-005 · Слиток золота ЗлБ-2", status: "Объединена", attrs: [
        { label: "Наименование", value: "Слиток золота ЗлБ-2" }, { label: "Номенкл. №", value: "DM-005" }, { label: "Класс", value: "Слиток" }, { label: "Металл", value: "Au" },
        { label: "Кол-во", value: "1" }, { label: "Проба", value: "958" }, { label: "Лигатурный вес", value: "300.00 г" }, { label: "Чистый вес", value: "287.40 г" },
        { label: "Место хранения", value: "Сейф №3, Полка А" }, { label: "Статус", value: "На складе" },
      ] },
      { title: "DM-006 · Слиток золота ЗлБ-3", status: "Объединена", attrs: [
        { label: "Наименование", value: "Слиток золота ЗлБ-3" }, { label: "Номенкл. №", value: "DM-006" }, { label: "Класс", value: "Слиток" }, { label: "Металл", value: "Au" },
        { label: "Кол-во", value: "1" }, { label: "Проба", value: "999" }, { label: "Лигатурный вес", value: "200.00 г" }, { label: "Чистый вес", value: "199.80 г" },
        { label: "Место хранения", value: "Сейф №3, Полка А" }, { label: "Статус", value: "На складе" },
      ] },
    ],
    after: [{ title: "DM-M9931 · Объединённая позиция (2 ед.)", status: "Новая", attrs: [
      { label: "Наименование", value: "Объединённая позиция (2 ед.)" }, { label: "Номенкл. №", value: "DM-M9931" }, { label: "Класс", value: "Слиток" }, { label: "Металл", value: "Au" },
      { label: "Кол-во", value: "2" }, { label: "Проба", value: "974" }, { label: "Лигатурный вес", value: "500.00 г" }, { label: "Чистый вес", value: "487.20 г" },
      { label: "Место хранения", value: "Сейф №3, Полка А" }, { label: "Статус", value: "На складе" },
    ] }],
  },
  {
    id: "l10", datetime: "20.08.2026, 08:30", user: "Ким А.Ю.", section: "Шихтовые карты", type: "Изменение",
    description: "Слиток DM-014 переплавлен в стружку DM-014-С по шихтовой карте П-2026-0091",
    before: [{ title: "DM-014 · Слиток золота ЗлВ-1", status: "Преобразована", attrs: [
      { label: "Наименование", value: "Слиток золота ЗлВ-1" }, { label: "Номенкл. №", value: "DM-014" }, { label: "Класс", value: "Слиток" }, { label: "Металл", value: "Au" },
      { label: "Кол-во", value: "1" }, { label: "Проба", value: "916" }, { label: "Лигатурный вес", value: "410.00 г" }, { label: "Чистый вес", value: "375.60 г" },
      { label: "Место хранения", value: "Сейф №2, Полка Б" }, { label: "Статус", value: "На складе" },
    ] }],
    after: [{ title: "DM-014-С · Стружка золотая ЗлВ-1", status: "Преобразована", attrs: [
      { label: "Наименование", value: "Стружка золотая ЗлВ-1" }, { label: "Номенкл. №", value: "DM-014-С" }, { label: "Класс", value: "Стружка" }, { label: "Металл", value: "Au" },
      { label: "Кол-во", value: "1" }, { label: "Проба", value: "916" }, { label: "Лигатурный вес", value: "405.00 г" }, { label: "Чистый вес", value: "371.00 г" },
      { label: "Место хранения", value: "Сейф №2, Полка Б" }, { label: "Статус", value: "На складе" },
    ] }],
  },
];

// --- Справочники ---
export const spravochniki = {
  "Номенклатуры": {
    count: 214,
    items: [
      { code: "GP-KOL-585-01", value: "Кольцо обручальное 585", status: "Активно" },
      { code: "GP-CEP-750-03", value: "Цепочка золотая Бисмарк", status: "Активно" },
      { code: "GP-SER-585-07", value: "Серьги с бриллиантами 0.5ct", status: "Активно" },
      { code: "DM-001", value: "Слиток золота ЗлА-1", status: "Активно" },
      { code: "DM-002", value: "Слиток серебра СрА-2", status: "Активно" },
    ]
  },
  "Единицы измерения": {
    count: 6,
    items: [
      { code: "г", value: "Грамм", status: "Активно" },
      { code: "кг", value: "Килограмм", status: "Активно" },
      { code: "шт", value: "Штука", status: "Активно" },
      { code: "тр.оз.", value: "Тройская унция", status: "Активно" },
      { code: "л", value: "Литр", status: "Активно" },
      { code: "мл", value: "Миллилитр", status: "Активно" },
    ]
  },
  "Типы документов": {
    count: 9,
    items: [
      { code: "ПО", value: "Приходный ордер", status: "Активно" },
      { code: "НП", value: "Накладная на приём", status: "Активно" },
      { code: "НО", value: "Накладная на отгрузку", status: "Активно" },
      { code: "ДВ", value: "Движение материала", status: "Активно" },
      { code: "ЗН", value: "Заказ-наряд", status: "Активно" },
      { code: "АС", value: "Акт списания", status: "Активно" },
      { code: "МСЛ", value: "Маршрутный лист", status: "Активно" },
      { code: "ИНВ", value: "Инвентаризационная опись", status: "Активно" },
      { code: "ШК", value: "Шихтовая карта", status: "Активно" },
    ]
  },
  "Организации": {
    count: 18,
    items: [
      { code: "ОРГ-001", value: "АО «МонетаДМ»", status: "Активно" },
      { code: "ОРГ-002", value: "ОО «АурумПоставка»", status: "Активно" },
      { code: "ОРГ-003", value: "АО «Металл Инвест»", status: "Активно" },
      { code: "ОРГ-004", value: "ТД «Золото Казахстана»", status: "Активно" },
      { code: "ОРГ-005", value: "ОО «СереброТрейд»", status: "Активно" },
    ]
  },
  "Подотчётные сотрудники": {
    count: 8,
    items: [
      { code: "ТН-001", value: "Нурланов Асхат Бекович", status: "Активно" },
      { code: "ТН-002", value: "Петров Сергей Владимирович", status: "Активно" },
      { code: "ТН-003", value: "Смирнов Константин Дмитриевич", status: "Активно" },
      { code: "ТН-004", value: "Иванова Мария Сергеевна", status: "Активно" },
      { code: "ТН-005", value: "Ким Александр Юрьевич", status: "Активно" },
    ]
  },
  "Типы операций": {
    count: 7,
    items: [
      { code: "ОП-01", value: "Выдача", status: "Активно" },
      { code: "ОП-02", value: "Возврат", status: "Активно" },
      { code: "ОП-03", value: "Выдача-Возврат", status: "Активно" },
      { code: "ОП-04", value: "Отбор пробы", status: "Активно" },
      { code: "ОП-05", value: "Анализ в ЛКИ", status: "Активно" },
      { code: "ОП-06", value: "Плавка", status: "Активно" },
      { code: "ОП-07", value: "Гальванопокрытие", status: "Активно" },
    ]
  },
  "Склады": {
    count: 2,
    items: [
      { code: "СДМ1", value: "Склад ДМ №1", status: "Активно" },
      { code: "СДМ2", value: "Склад ДМ №2", status: "Активно" },
    ]
  },
};

// --- Коды материалов ---
export interface MaterialCode {
  code: string;
  name: string;
  shortName: string;
}

export const initialMaterialCodes: MaterialCode[] = [
  { code: "2000", name: "Серебро чистое", shortName: "Ag чистое" },
  { code: "3000", name: "Палладий чистый", shortName: "Pd чистый" },
  { code: "1000", name: "Золото чистое", shortName: "Au чистое" },
  { code: "0200", name: "Сплав ЗлСрПд 585-250-165", shortName: "ЗлСрПд 585-250-165" },
  { code: "0300", name: "Сплав ЗлСрМ 750-150", shortName: "ЗлСрМ 750-150" },
  { code: "0400", name: "Сплав ЗлСрМ 750-125", shortName: "ЗлСрМ 750-125" },
  { code: "0500", name: "Сплав ЗлСрМ 585-80", shortName: "ЗлСрМ 585-80" },
  { code: "0100", name: "Сплав ЗлМ 585", shortName: "ЗлМ 585" },
  { code: "0600", name: "Сплав AuAg", shortName: "AuAg" },
  { code: "4000", name: "Платина чистое", shortName: "Pt чистое" },
  { code: "0700", name: "Сплав ЗлСрПдМ 375-100-38", shortName: "ЗлСрПдМ 375-100-38" },
  { code: "0800", name: "Сплав ЗлСрМ 950", shortName: "ЗлСрМ 950" },
  { code: "0120", name: "Сигнальные образцы", shortName: "Сигн. образцы" },
  { code: "8000", name: "Сплав ЗлСрМ 375-20", shortName: "ЗлСрМ 375-20" },
  { code: "7000", name: "Сплав ЗлСрМ 375-100", shortName: "ЗлСрМ 375-100" },
  { code: "0050", name: "Бриллиантовые вставки", shortName: "Брилл. вставки" },
];

// --- Классы материалов ---
export interface MaterialClass {
  code: string;
  name: string;
}

export const initialMaterialClasses: MaterialClass[] = [
  { code: "СЛ", name: "Слиток" },
  { code: "СТ", name: "Стружка" },
  { code: "ОП", name: "Основная проба" },
  { code: "КП", name: "Контрольная проба" },
  { code: "ПД", name: "Подкат" },
  { code: "ПФ", name: "Полуфабрикат (ПФ)" },
  { code: "МН", name: "Монета" },
  { code: "ПРФ", name: "Перфолента" },
  { code: "НПЗ", name: "НП заготовки" },
  { code: "НПЧ", name: "НП чеканки" },
  { code: "ПЛС", name: "Пластина" },
  { code: "КОЗ", name: "Козел (хвост-козел)" },
  { code: "ПФЗ", name: "Полуфабрикат заготовки" },
];

// --- Места хранения (Сейф / Полка, принадлежат складу из справочника «Склады») ---
export interface StorageLocation {
  id: string;
  sklad: string;
  seyfNum: string;
  polkaNum: string;
  code: string;
  available: boolean;
}

export const initialStorageLocations: StorageLocation[] = [
  { id: "sl-1", sklad: "Склад ДМ №1", seyfNum: "1", polkaNum: "1", code: "СДМ1-С1-П1", available: true },
  { id: "sl-2", sklad: "Склад ДМ №1", seyfNum: "1", polkaNum: "2", code: "СДМ1-С1-П2", available: true },
  { id: "sl-3", sklad: "Склад ДМ №1", seyfNum: "2", polkaNum: "1", code: "СДМ1-С2-П1", available: true },
  { id: "sl-4", sklad: "Склад ДМ №1", seyfNum: "2", polkaNum: "2", code: "СДМ1-С2-П2", available: false },
  { id: "sl-5", sklad: "Склад ДМ №1", seyfNum: "3", polkaNum: "1", code: "СДМ1-С3-П1", available: true },
  { id: "sl-6", sklad: "Склад ДМ №2", seyfNum: "1", polkaNum: "1", code: "СДМ2-С1-П1", available: true },
  { id: "sl-7", sklad: "Склад ДМ №2", seyfNum: "1", polkaNum: "2", code: "СДМ2-С1-П2", available: true },
  { id: "sl-8", sklad: "Склад ДМ №2", seyfNum: "2", polkaNum: "1", code: "СДМ2-С2-П1", available: true },
];
