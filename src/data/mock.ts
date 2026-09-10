export type StatusGP = "На складе" | "Резерв" | "В обработке";
export type StatusDM = "На складе" | "Зарезервировано" | "В подотчёте";
export type DocStatus = "Выполнено" | "В работе" | "Закрыт";
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

export interface DMItem {
  id: string;
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
}

export interface Podotchetnik {
  id: string;
  name: string;
  tabelNo: string;
  department: string;
  position: string;
  materials: { name: string; nomenkl: string; weight: number }[];
}

export interface AppUser {
  id: string;
  name: string;
  role: string;
  status: UserStatus;
  email: string;
  username: string;
}

export interface Role {
  id: string;
  name: string;
  active: boolean;
}

export interface LogEntry {
  id: string;
  datetime: string;
  user: string;
  section: string;
  type: LogType;
  description: string;
  before?: string;
  after?: string;
}

// --- GP Items (34 total) ---
export const initialGPItems: GPItem[] = [
  { id: "gp1", name: "Кольцо обручальное 585", nomenkl: "GP-KOL-585-01", qty: 24, unit: "шт", klass: "Золото", code: "AU-585", location: "Сейф №1, Полка А", status: "На складе" },
  { id: "gp2", name: "Цепочка золотая Бисмарк", nomenkl: "GP-CEP-750-03", qty: 12, unit: "шт", klass: "Золото", code: "AU-750", location: "Сейф №1, Полка Б", status: "На складе" },
  { id: "gp3", name: "Серьги с бриллиантами 0.5ct", nomenkl: "GP-SER-585-07", qty: 8, unit: "шт", klass: "Золото", code: "AU-585", location: "Сейф №2, Полка А", status: "Резерв" },
  { id: "gp4", name: "Браслет серебряный", nomenkl: "GP-BRA-925-02", qty: 36, unit: "шт", klass: "Серебро", code: "AG-925", location: "Сейф №2, Полка Б", status: "На складе" },
  { id: "gp5", name: "Подвеска платиновая", nomenkl: "GP-POD-950-01", qty: 6, unit: "шт", klass: "Платина", code: "PT-950", location: "Витрина №1", status: "В обработке" },
  { id: "gp6", name: "Запонки золотые", nomenkl: "GP-ZAP-750-04", qty: 18, unit: "шт", klass: "Золото", code: "AU-750", location: "Витрина №2", status: "На складе" },
  { id: "gp7", name: "Колье серебряное ажурное", nomenkl: "GP-KLY-925-05", qty: 14, unit: "шт", klass: "Серебро", code: "AG-925", location: "Сейф №3, Полка А", status: "Резерв" },
  { id: "gp8", name: "Печатка мужская золотая", nomenkl: "GP-PCH-585-09", qty: 10, unit: "шт", klass: "Золото", code: "AU-585", location: "Сейф №3, Полка Б", status: "В обработке" },
  { id: "gp9", name: "Кулон сердце серебро", nomenkl: "GP-KUL-925-11", qty: 22, unit: "шт", klass: "Серебро", code: "AG-925", location: "Сейф №1, Полка А", status: "На складе" },
  { id: "gp10", name: "Браслет золотой плетёный", nomenkl: "GP-BRA-585-06", qty: 9, unit: "шт", klass: "Золото", code: "AU-585", location: "Сейф №1, Полка Б", status: "На складе" },
  { id: "gp11", name: "Серьги серебряные с топазом", nomenkl: "GP-SER-925-13", qty: 16, unit: "шт", klass: "Серебро", code: "AG-925", location: "Сейф №2, Полка А", status: "Резерв" },
  { id: "gp12", name: "Кольцо с изумрудом 750", nomenkl: "GP-KOL-750-14", qty: 4, unit: "шт", klass: "Золото", code: "AU-750", location: "Сейф №2, Полка Б", status: "В обработке" },
  { id: "gp13", name: "Цепочка серебряная якорная", nomenkl: "GP-CEP-925-15", qty: 30, unit: "шт", klass: "Серебро", code: "AG-925", location: "Витрина №1", status: "На складе" },
  { id: "gp14", name: "Перстень золотой с рубином", nomenkl: "GP-PER-585-16", qty: 5, unit: "шт", klass: "Золото", code: "AU-585", location: "Витрина №2", status: "На складе" },
  { id: "gp15", name: "Брошь серебряная", nomenkl: "GP-BRO-925-17", qty: 11, unit: "шт", klass: "Серебро", code: "AG-925", location: "Сейф №3, Полка А", status: "На складе" },
  { id: "gp16", name: "Медальон золотой 585", nomenkl: "GP-MED-585-18", qty: 7, unit: "шт", klass: "Золото", code: "AU-585", location: "Сейф №3, Полка Б", status: "Резерв" },
  { id: "gp17", name: "Кольцо обручальное 750", nomenkl: "GP-KOL-750-19", qty: 20, unit: "шт", klass: "Золото", code: "AU-750", location: "Сейф №1, Полка А", status: "На складе" },
  { id: "gp18", name: "Подвеска серебряная луна", nomenkl: "GP-POD-925-20", qty: 19, unit: "шт", klass: "Серебро", code: "AG-925", location: "Сейф №1, Полка Б", status: "На складе" },
  { id: "gp19", name: "Серьги золотые пуссеты", nomenkl: "GP-SER-585-21", qty: 28, unit: "шт", klass: "Золото", code: "AU-585", location: "Сейф №2, Полка А", status: "На складе" },
  { id: "gp20", name: "Браслет платиновый тонкий", nomenkl: "GP-BRA-950-22", qty: 3, unit: "шт", klass: "Платина", code: "PT-950", location: "Сейф №2, Полка Б", status: "В обработке" },
  { id: "gp21", name: "Колье золотое с жемчугом", nomenkl: "GP-KLY-585-23", qty: 6, unit: "шт", klass: "Золото", code: "AU-585", location: "Витрина №1", status: "Резерв" },
  { id: "gp22", name: "Кулон серебряный якорь", nomenkl: "GP-KUL-925-24", qty: 15, unit: "шт", klass: "Серебро", code: "AG-925", location: "Витрина №2", status: "На складе" },
  { id: "gp23", name: "Часы золотые Au-750", nomenkl: "GP-CHA-750-25", qty: 2, unit: "шт", klass: "Золото", code: "AU-750", location: "Сейф №3, Полка А", status: "В обработке" },
  { id: "gp24", name: "Кольцо серебряное с ониксом", nomenkl: "GP-KOL-925-26", qty: 13, unit: "шт", klass: "Серебро", code: "AG-925", location: "Сейф №3, Полка Б", status: "На складе" },
  { id: "gp25", name: "Брошь золотая бабочка", nomenkl: "GP-BRO-585-27", qty: 8, unit: "шт", klass: "Золото", code: "AU-585", location: "Сейф №1, Полка А", status: "На складе" },
  { id: "gp26", name: "Цепочка золотая гурмет", nomenkl: "GP-CEP-750-28", qty: 11, unit: "шт", klass: "Золото", code: "AU-750", location: "Сейф №1, Полка Б", status: "Резерв" },
  { id: "gp27", name: "Серьги серебряные геометрия", nomenkl: "GP-SER-925-29", qty: 25, unit: "шт", klass: "Серебро", code: "AG-925", location: "Сейф №2, Полка А", status: "На складе" },
  { id: "gp28", name: "Перстень золотой классика", nomenkl: "GP-PER-750-30", qty: 9, unit: "шт", klass: "Золото", code: "AU-750", location: "Сейф №2, Полка Б", status: "На складе" },
  { id: "gp29", name: "Ожерелье серебряное rose", nomenkl: "GP-OZH-925-31", qty: 7, unit: "шт", klass: "Серебро", code: "AG-925", location: "Витрина №1", status: "В обработке" },
  { id: "gp30", name: "Кольцо платиновое обручальное", nomenkl: "GP-KOL-950-32", qty: 17, unit: "шт", klass: "Платина", code: "PT-950", location: "Витрина №2", status: "На складе" },
  { id: "gp31", name: "Браслет серебряный шармы", nomenkl: "GP-BRA-925-33", qty: 21, unit: "шт", klass: "Серебро", code: "AG-925", location: "Сейф №3, Полка А", status: "На складе" },
  { id: "gp32", name: "Серьги золотые капли", nomenkl: "GP-SER-585-34", qty: 14, unit: "шт", klass: "Золото", code: "AU-585", location: "Сейф №3, Полка Б", status: "Резерв" },
  { id: "gp33", name: "Колье платиновое с бриллиантом", nomenkl: "GP-KLY-950-35", qty: 1, unit: "шт", klass: "Платина", code: "PT-950", location: "Сейф №1, Полка А", status: "В обработке" },
  { id: "gp34", name: "Кулон золотой infinity", nomenkl: "GP-KUL-585-36", qty: 16, unit: "шт", klass: "Золото", code: "AU-585", location: "Сейф №1, Полка Б", status: "На складе" },
];

// --- DM Items ---
export const initialDMItems: DMItem[] = [
  { id: "dm1", name: "Слиток золота ЗлА-1", nomenkl: "DM-001", klass: "Слиток", metal: "Au", qty: 1, proba: 999, ligWeight: 500.25, netWeight: 498.12, location: "Сейф №1, Полка А", status: "На складе" },
  { id: "dm2", name: "Слиток серебра СрА-2", nomenkl: "DM-002", klass: "Слиток", metal: "Ag", qty: 1, proba: 999, ligWeight: 1000.50, netWeight: 998.30, location: "Сейф №1, Полка Б", status: "На складе" },
  { id: "dm3", name: "Стружка золотая", nomenkl: "DM-003", klass: "Стружка", metal: "Au", qty: 1, proba: 585, ligWeight: 45.80, netWeight: 26.79, location: "Сейф №2, Полка А", status: "На складе" },
  { id: "dm4", name: "Проба золота Au-750", nomenkl: "DM-004", klass: "Проба", metal: "Au", qty: 1, proba: 750, ligWeight: 12.30, netWeight: 9.22, location: "Сейф №2, Полка В", status: "Зарезервировано" },
  { id: "dm5", name: "Раствор серебра AgNO3", nomenkl: "DM-005", klass: "Раствор", metal: "Ag", qty: 1, proba: 999, ligWeight: 250.00, netWeight: 249.10, location: "Сейф №3, Полка А", status: "В подотчёте" },
  { id: "dm6", name: "Слиток платины ПлА-1", nomenkl: "DM-006", klass: "Слиток", metal: "Pt", qty: 1, proba: 999, ligWeight: 300.00, netWeight: 299.50, location: "Сейф №1, Полка В", status: "На складе" },
  { id: "dm7", name: "Лом золота 585", nomenkl: "DM-007", klass: "Лом", metal: "Au", qty: 1, proba: 585, ligWeight: 88.40, netWeight: 51.71, location: "Сейф №2, Полка Б", status: "На складе" },
  { id: "dm8", name: "Золотой порошок Au", nomenkl: "DM-008", klass: "Порошок", metal: "Au", qty: 1, proba: 999, ligWeight: 25.00, netWeight: 24.95, location: "Сейф №3, Полка В", status: "Зарезервировано" },
];

// --- Складские документы ---
export const initialSkladDocs: SkladDoc[] = [
  { id: "sd1", date: "19.08.2026", type: "Приходный ордер", number: "ПО-0342", status: "Выполнено", sender: "ОО «АурумПоставка»", receiver: "Склад ДМ №1" },
  { id: "sd2", date: "18.08.2026", type: "Накладная на приём ГП", number: "НП-0118", status: "Выполнено", sender: "Производственный цех", receiver: "Склад ГП" },
  { id: "sd3", date: "17.08.2026", type: "Приходный ордер", number: "ПО-0341", status: "В работе", sender: "АО «Металл Инвест»", receiver: "Склад ДМ №2" },
  { id: "sd4", date: "16.08.2026", type: "Накладная на приём ГП", number: "НП-0117", status: "Закрыт", sender: "Ювелирный цех", receiver: "Склад ГП" },
  { id: "sd5", date: "15.08.2026", type: "Приходный ордер", number: "ПО-0340", status: "Выполнено", sender: "ОО «СереброТрейд»", receiver: "Склад ДМ №1" },
  { id: "sd6", date: "14.08.2026", type: "Накладная на приём ГП", number: "НП-0116", status: "В работе", sender: "Производственный цех", receiver: "Склад ГП" },
];

export const initialVydachaDocs: SkladDoc[] = [
  { id: "vd1", date: "19.08.2026", type: "Накладная на отгрузку ГП", number: "НО-0205", status: "В работе", sender: "Склад ГП", receiver: "ТД «Золото Казахстана»" },
  { id: "vd2", date: "17.08.2026", type: "Накладная на отгрузку ГП", number: "НО-0204", status: "Закрыт", sender: "Склад ГП", receiver: "ИП Сейткали А.М." },
  { id: "vd3", date: "15.08.2026", type: "Накладная на отгрузку", number: "НО-0203", status: "Закрыт", sender: "Склад ДМ №1", receiver: "Производство" },
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
  },
  {
    id: "sk2", date: "15.08.2026", name: "Шихта золото 750 пробы", plavkaNo: "П-2026-0088", status: "Новая",
    materials: [
      { name: "Слиток золота 750", nomenkl: "DM-010", klass: "Слиток", proba: 750, ves: 320.00, loc: "Сейф №1, Полка Б" },
    ],
  },
  {
    id: "sk3", date: "10.08.2026", name: "Шихта серебро 925 (кольца)", plavkaNo: "П-2026-0087", status: "Выполнена",
    materials: [
      { name: "Слиток серебра СрА-2", nomenkl: "DM-002", klass: "Слиток", proba: 925, ves: 1000.50, loc: "Сейф №1, Полка Б" },
    ],
  },
  {
    id: "sk4", date: "05.08.2026", name: "Шихта Au-999 слитки партия Б", plavkaNo: "П-2026-0086", status: "Выполнена",
    materials: [
      { name: "Слиток золота стандартный", nomenkl: "НН-72101", klass: "Слиток", proba: 999, ves: 1000.00, loc: "Сейф 1/Полка 1" },
    ],
  },
];

// --- Подотчётники ---
export const initialPodotchetniki: Podotchetnik[] = [
  {
    id: "p1", name: "Нурланов Асхат Бекович", tabelNo: "ТН-001", department: "Плавильный цех", position: "Плавильщик",
    materials: [
      { name: "Слиток золота ЗлА-1", nomenkl: "DM-001", weight: 500.25 },
      { name: "Стружка золотая", nomenkl: "DM-003", weight: 45.80 },
    ]
  },
  {
    id: "p2", name: "Петров Сергей Владимирович", tabelNo: "ТН-002", department: "Производственный цех", position: "Ювелир",
    materials: [
      { name: "Проба золота Au-750", nomenkl: "DM-004", weight: 12.30 },
    ]
  },
  {
    id: "p3", name: "Смирнов Константин Дмитриевич", tabelNo: "ТН-003", department: "Лаборатория", position: "Лаборант",
    materials: []
  },
  {
    id: "p4", name: "Иванова Мария Сергеевна", tabelNo: "ТН-004", department: "Гальванический цех", position: "Гальваник",
    materials: [
      { name: "Раствор серебра AgNO3", nomenkl: "DM-005", weight: 250.00 },
    ]
  },
  {
    id: "p5", name: "Ким Александр Юрьевич", tabelNo: "ТН-005", department: "Склад ДМ", position: "Кладовщик",
    materials: []
  },
  {
    id: "p6", name: "Бекова Айгуль Маратовна", tabelNo: "ТН-006", department: "ПТО", position: "Технолог",
    materials: []
  },
  {
    id: "p7", name: "Жумабаев Даурен Серикович", tabelNo: "ТН-007", department: "Ювелирный цех", position: "Мастер-ювелир",
    materials: []
  },
  {
    id: "p8", name: "Орынбекова Динара Кайратовна", tabelNo: "ТН-008", department: "ОТК", position: "Контролёр ОТК",
    materials: []
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
  { id: "r1", name: "Администратор", active: true },
  { id: "r2", name: "Сотрудник склада ДМ", active: true },
  { id: "r3", name: "Сотрудник ПТО", active: true },
  { id: "r4", name: "Технолог", active: false },
];

// --- Логи ---
export const initialLogs: LogEntry[] = [
  { id: "l1", datetime: "19.08.2026, 09:42", user: "Ковалева Е.", section: "Склады", type: "Создание", description: "Принят приходный ордер ПО-0342 на 3 позиции ДМ" },
  { id: "l2", datetime: "19.08.2026, 09:15", user: "Нурланов А.Б.", section: "Движение материала", type: "Изменение", description: "Изменено место хранения позиции DM-001", before: 'место_хранения: "Сейф №2, Полка А"', after: 'место_хранения: "Сейф №1, Полка А"' },
  { id: "l3", datetime: "18.08.2026, 16:30", user: "Петров С.В.", section: "Складские операции", type: "Создание", description: "Создана накладная на приём ГП НП-0118" },
  { id: "l4", datetime: "18.08.2026, 14:10", user: "Ковалева Е.", section: "Шихтовые карты", type: "Изменение", description: "Обновлена шихтовая карта П-2026-0089", before: 'статус: "Подготовлена к плавке"', after: 'статус: "В работе"' },
  { id: "l5", datetime: "17.08.2026, 11:20", user: "Иванова М.С.", section: "Движение материала", type: "Создание", description: "Открыта операция выдачи ДВ-001234 (Гальванопокрытие)" },
  { id: "l6", datetime: "16.08.2026, 15:45", user: "Ким А.Ю.", section: "Склады", type: "Удаление", description: "Удалена позиция GP-BRA-925-02 из списка (ошибочный ввод)" },
  { id: "l7", datetime: "15.08.2026, 09:00", user: "Нурланов А.Б.", section: "Движение материала", type: "Закрытие", description: "Закрыта операция ДВ-001231 (Анализ в ЛКИ) со списанием" },
  { id: "l8", datetime: "14.08.2026, 13:25", user: "Ковалева Е.", section: "Администрирование", type: "Создание", description: "Добавлен новый пользователь m.ivanova" },
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
  "Классы материалов": {
    count: 4,
    items: [
      { code: "СЛ", value: "Слиток", status: "Активно" },
      { code: "СТ", value: "Стружка", status: "Активно" },
      { code: "ПР", value: "Проба", status: "Активно" },
      { code: "РА", value: "Раствор", status: "Активно" },
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
  "Коды материалов": {
    count: 5,
    items: [
      { code: "AU", value: "Золото", status: "Активно" },
      { code: "AG", value: "Серебро", status: "Активно" },
      { code: "PT", value: "Платина", status: "Активно" },
      { code: "PD", value: "Палладий", status: "Активно" },
      { code: "PR", value: "Прочие", status: "Активно" },
    ]
  },
};
