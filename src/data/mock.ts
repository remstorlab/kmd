import type { PrihodPosition } from "../components/DMPositionFormModal";
// «Закрыта» — позиция выдана со склада наружу по оформленной накладной на отгрузку.
export type StatusGP = "На складе" | "Резерв" | "В подотчёте" | "Закрыта";
export type StatusDM = "На складе" | "Резерв" | "В подотчёте" | "Закрыта";
export type DocStatus = "Оформлено" | "В работе";
export type OpType = "Выдача" | "Возврат" | "Выдача-Возврат";
export type OpVid = "Отбор пробы" | "Анализ в ЛКИ" | "Плавка" | "Гальванопокрытие" | "Производство ГП" | "НИОКР";
export type UserStatus = "Активен" | "Заблокирован";
export type LogType = "Создание" | "Изменение" | "Удаление";
// Жизненный цикл шихтовой карты: «Редактирование» (черновик, Сохранить) → (Оформить) «Новая» → «Выполнена».
// Карта «Новая» доступна для выдачи на плавку и не редактируется; если её зарезервированную позицию выдадут
// в другой операции, карта возвращается в «Редактирование».
export type ShihtaStatus = "Редактирование" | "Новая" | "Выполнена";

export interface GPItem {
  id: string;
  name: string;
  nomenkl: string;
  qty: number;
  unit: string;
  klass: string;
  code: string;
  location: string;
  // Склад — значение справочника «Склады»
  sklad: string;
  status: StatusGP;
  // Проба, веса и химический состав изделий
  proba?: number;
  ligWeight?: number;
  netWeight?: number;
  chem?: ChemComposition;
  // Исходная запись, из которой выделена эта часть при частичной выдаче / резерве (см. data/stock.ts)
  parentId?: string;
}

export type Metal = "Au" | "Ag" | "Pt" | "Pd";

// Извлекает базовый металл (Au/Ag/Pt/Pd) по значению поля «Код материала»:
// поле хранит код из справочника «Коды материалов», металл — префикс его краткого наименования.
export function baseMetal(code: string, codes: MaterialCode[] = initialMaterialCodes): Metal {
  const prefix = (codes.find(c => c.code === code)?.shortName ?? code).slice(0, 2);
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
  // Склад — значение справочника «Склады»
  sklad: string;
  status: StatusDM;
  chem?: ChemComposition;
  // Исходная запись, из которой выделена эта часть при частичной выдаче / резерве (см. data/stock.ts)
  parentId?: string;
}

export interface SkladDoc {
  id: string;
  date: string;
  // Значение справочника «Типы документов приёмки» / «Типы документов отгрузки»
  type: string;
  number: string;
  status: DocStatus;
  sender: string;
  receiver: string;
  // Позиции накладной на отгрузку (выдача со склада) / требования (перемещение со склада на склад)
  positions?: VydachaDocPosition[];
  // Требование: шихтовая карта, под которую перемещаются позиции
  shihtaId?: string;
  // Позиции приходного ордера / накладной (приём на склад)
  prihodPositions?: PrihodPosition[];
  // Хим. состав на партию: задан на уровне документа и подставляется в новые позиции
  partyChem?: ChemComposition;
}

// Позиция выдачи: ссылка на позицию склада (id + учёт ГП/ДМ) и количество к выдаче.
export interface VydachaDocPosition {
  id: string;
  src: "gp" | "dm";
  nomenkl: string;
  name: string;
  klass: string;
  code: string;
  qty: number;
  unit: string;
  proba: number | null;
  lig: number | null;
  net: number | null;
  location: string;
  // Склад позиции (справочник «Склады»)
  sklad?: string;
  // Химический состав (для подсказки у пробы)
  chem?: ChemComposition;
  issue: number;
}

// Статус операции движения материала: (Сохранить) «В работе» → (Оформить) «Завершено».
// В работе все вкладки операции редактируются; завершённая операция — только для просмотра.
export type OperStage = "В работе" | "Завершено";

// Строка вкладки «Списание»: date — ISO (yyyy-mm-dd), name — технологическая операция, ves — вес, г,
// type — значение справочника «Тип списания», metal — код материала из позиций вкладки «Выдача»
export type OperLoss = { id: string; date: string; name: string; ves: string; type?: string; metal?: string };

// Тип списания: потеря увеличивает списанный вес, прирост — уменьшает
export const SPISANIE_POTERYA = "Потеря";
export const SPISANIE_PRIROST = "Прирост";
export const lossWeight = (l: OperLoss) =>
  (l.type === SPISANIE_PRIROST ? -1 : 1) * (parseFloat(String(l.ves).replace(",", ".")) || 0);

// ves — вес позиции для расчётов операции; metal (код материала), lig / net (лигатурный / чистый вес, г) — для отображения как на складе ДМ
export type OperPosition = { n: number; name: string; nomenkl: string; klass: string; proba: number; qty?: number; ves: number; ag: string; cu: string; chem?: ChemComposition; loc: string; metal?: string; lig?: number; net?: number;
  // id записи склада ДМ, из которой выдана позиция (при частичной выдаче — выделенная часть)
  srcId?: string };

export interface Operation {
  id: string;
  date: string;
  type: OpType;
  vid: OpVid;
  positions: number;
  document: string;
  responsible: string;
  stage: OperStage;
  // Описание операции (вводится при создании)
  description?: string;
  statusVydacha: "Выдано" | "Не выдано";
  statusVozvrat: "Не начат" | "Частично" | "Полностью";
  statusClose: "Не закрыто" | "Закрыто: списано" | "Закрыто";
  // Позиции вкладок «Выдача» / «Возврат» (сохраняются с операцией)
  vydachaPos?: OperPosition[];
  vozvratPos?: OperPosition[];
  // Документы, прикреплённые во вкладках «Выдача» / «Возврат»
  vydachaFiles?: File[];
  vozvratFiles?: File[];
  // Вкладка «Списание»: потери и документы списания
  losses?: OperLoss[];
  spisanieFiles?: File[];
  // Реквизиты шапки (для печатной формы)
  docType?: string;
  zakazchik?: string;
  plavkaNo?: string;
  vydal?: string;
  poluchil?: string;
}

export interface ShihtaMaterial {
  name: string;
  nomenkl: string;
  klass: string;
  proba: number;
  ves: number;
  loc: string;
  // Количество, шт (для позиций, зарезервированных со склада ДМ)
  qty?: number;
  // Содержание в чистоте, г (для доп. материалов — вводится вручную)
  chem?: ChemComposition;
}

export interface ShihtovayaKarta {
  id: string;
  date: string;
  name: string;
  plavkaNo: string;
  status: ShihtaStatus;
  // Позиции ДМ из резерва карты, выданные в другой операции (причина возврата карты в «Редактирование»).
  vydannyePozicii?: string[];
  materials: ShihtaMaterial[];
  // Прикреплённые документы (несколько файлов)
  files?: File[];
  createdAt: string;
  createdBy: string;
}

export interface PodotchetPosition {
  name: string;
  nomenkl: string;
  klass: string;
  metal: string; // краткое наименование из справочника «Коды материалов»
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

// --- Демо-данные ---
// Все значения атрибутов — из справочников: «Классы материалов», «Коды материалов», «Пробы», «Места хранения»
// (Склад ДМ №2), «Организации», «Подотчётные сотрудники», «Типы операций», «Виды операций», типы документов,
// «Технологические операции», «Тип списания», статусы. Данные согласованы между разделами: позиции в подотчёте
// выданы в операциях движения, резерв — в шихтовых картах, закрытые — по оформленным накладным.

const r2 = (v: number) => Math.round(v * 100) / 100;
const fx = (v: number) => r2(v).toFixed(2);
// Химический состав по коду материала: основной металл = чистый вес, для сплавов — лигатурные компоненты
function chemOf(code: string, lig: number, net: number): ChemComposition {
  switch (code) {
    case "1000": return { au: fx(net) };
    case "2000": return { ag: fx(net) };
    case "4000": return { pt: fx(net) };
    case "3000": return { pd: fx(net) };
    case "0100": return { au: fx(net), cu: fx(lig - net) };                        // ЗлМ 585
    case "0300": return { au: fx(net), ag: fx(lig * 0.15), cu: fx(lig * 0.10) };    // ЗлСрМ 750-150
    case "0500": return { au: fx(net), ag: fx(lig * 0.08), cu: fx(lig - net - lig * 0.08) }; // ЗлСрМ 585-80
    default: return {};
  }
}

// --- Склады (справочник «Склады») ---
// Склад ДМ №1 (СДМ1) — склад приёмки: на него принимаются позиции по приходному ордеру и накладной, с него
// позиции резервируются под шихтовые карты. По «Требованию» позиции перемещаются со СДМ1 на СДМ2 (место хранения,
// статус и остальные атрибуты сохраняются). Склад ДМ №2 (СДМ2) — склад выдачи: накладные на отгрузку / передачу
// и операции движения материала (в т. ч. плавка по шихтовой карте) формируются только с него.
export const SDM1 = "Склад ДМ №1";
export const SDM2 = "Склад ДМ №2";

// --- GP Items ---
// qty — количество изделий, unitG — лигатурная масса одного изделия, г
const gp = (id: string, name: string, nomenkl: string, qty: number, code: string, proba: number, unitG: number, location: string, status: StatusGP = "На складе", sklad = SDM2): GPItem => {
  const ligWeight = r2(qty * unitG);
  const netWeight = r2(ligWeight * proba / 1000);
  return { id, name, nomenkl, qty, unit: "шт", klass: "Готовая продукция", code, location, sklad, status, proba, ligWeight, netWeight, chem: chemOf(code, ligWeight, netWeight) };
};
const L = (s: number, p: number) => `Сейф №${s}, Полка ${p}`;

export const initialGPItems: GPItem[] = [
  gp("gp1", "Кольцо обручальное 585", "5015311", 24, "0100", 585, 3.80, L(1, 1)),
  gp("gp2", "Цепочка золотая Бисмарк", "5015313", 12, "0300", 750, 8.50, L(1, 2)),
  gp("gp3", "Серьги с бриллиантами 0.5ct", "5015314", 8, "0100", 585, 4.20, L(2, 1)),
  gp("gp4", "Браслет серебряный", "5015315", 36, "2000", 925, 12.00, L(3, 1)),
  gp("gp5", "Подвеска платиновая", "5015316", 6, "4000", 900, 5.40, L(4, 1)),
  gp("gp6", "Запонки золотые", "5015317", 18, "0300", 750, 6.30, L(4, 2)),
  gp("gp7", "Колье серебряное ажурное", "5015318", 14, "2000", 925, 18.50, L(3, 1)),
  gp("gp8", "Печатка мужская золотая", "5015319", 10, "0100", 585, 9.80, L(1, 1)),
  gp("gp9", "Кулон сердце серебро", "5015321", 22, "2000", 925, 3.10, L(1, 1)),
  gp("gp10", "Браслет золотой плетёный", "5015322", 9, "0100", 585, 11.40, L(1, 2)),
  gp("gp11", "Серьги серебряные с топазом", "5015323", 16, "2000", 925, 5.60, L(2, 1)),
  gp("gp12", "Кольцо с изумрудом 750", "5015324", 4, "0300", 750, 4.90, L(3, 2)),
  gp("gp13", "Цепочка серебряная якорная", "5015325", 30, "2000", 925, 7.20, L(4, 1)),
  gp("gp14", "Перстень золотой с рубином", "5015326", 5, "0100", 585, 7.70, L(4, 2)),
  gp("gp15", "Брошь серебряная", "5015327", 11, "2000", 925, 9.30, L(3, 1)),
  gp("gp16", "Медальон золотой 585", "5015328", 7, "0100", 585, 6.10, L(3, 2)),
  gp("gp17", "Кольцо обручальное 750", "5015329", 20, "0300", 750, 4.10, L(1, 1)),
  gp("gp18", "Подвеска серебряная луна", "5015330", 19, "2000", 925, 2.80, L(1, 2)),
  gp("gp19", "Серьги золотые пуссеты", "5015331", 28, "0100", 585, 1.60, L(2, 1)),
  gp("gp20", "Браслет платиновый тонкий", "5015332", 3, "4000", 900, 10.20, L(4, 1)),
  gp("gp21", "Колье золотое с жемчугом", "5015333", 6, "0100", 585, 14.80, L(4, 1)),
  gp("gp22", "Кулон серебряный якорь", "5015334", 15, "2000", 925, 4.40, L(4, 2)),
  gp("gp23", "Часы золотые Au-750", "5015335", 2, "0300", 750, 42.00, L(3, 2)),
  gp("gp24", "Кольцо серебряное с ониксом", "5015336", 13, "2000", 925, 6.70, L(3, 2)),
  gp("gp25", "Брошь золотая бабочка", "5015337", 8, "0100", 585, 5.20, L(1, 1)),
  gp("gp26", "Цепочка золотая гурмет", "5015338", 11, "0300", 750, 10.60, L(1, 2)),
  gp("gp27", "Серьги серебряные геометрия", "5015339", 25, "2000", 925, 3.90, L(2, 1)),
  gp("gp28", "Перстень золотой классика", "5015340", 9, "0300", 750, 8.80, L(3, 1)),
  gp("gp29", "Ожерелье серебряное rose", "5015341", 7, "2000", 925, 24.50, L(4, 1)),
  gp("gp30", "Кольцо платиновое обручальное", "5015342", 17, "4000", 900, 6.90, L(4, 2)),
  gp("gp31", "Браслет серебряный шармы", "5015343", 21, "2000", 925, 15.80, L(3, 1)),
  gp("gp32", "Серьги золотые капли", "5015344", 14, "0100", 585, 2.90, L(3, 2)),
  // Приняты на склад приёмки СДМ1, ещё не перемещены на СДМ2
  gp("gp33", "Колье платиновое с бриллиантом", "5015345", 1, "4000", 900, 21.30, L(3, 1), "На складе", SDM1),
  gp("gp34", "Кулон золотой infinity", "5015346", 16, "0100", 585, 2.40, L(1, 2), "На складе", SDM1),
  // Выданы по оформленной накладной НО-0204 — закрыты, без места хранения
  gp("gp35", "Монета «Атамекен» Ag 925", "5015347", 50, "2000", 925, 31.10, "-", "Закрыта"),
  gp("gp36", "Орден «Алтын алка»", "5015348", 10, "0300", 750, 22.40, "-", "Закрыта"),
];

// --- DM Items ---
const dm = (id: string, name: string, nomenkl: string, klass: string, metal: string, proba: number, ligWeight: number, location: string, status: StatusDM = "На складе", qty = 1, net?: number, sklad = SDM2): DMItem => {
  const netWeight = net ?? r2(ligWeight * proba / 1000);
  return { id, name, nomenkl, klass, metal, qty, proba, ligWeight, netWeight, location, sklad, status, chem: chemOf(metal, ligWeight, netWeight) };
};
// Позиция на складе приёмки СДМ1
const dm1 = (id: string, name: string, nomenkl: string, klass: string, metal: string, proba: number, ligWeight: number, location: string, status: StatusDM = "На складе") =>
  dm(id, name, nomenkl, klass, metal, proba, ligWeight, location, status, 1, undefined, SDM1);

export const initialDMItems: DMItem[] = [
  // Резерв шихтовой карты П-2026-0089: перемещены требованием ТР-0012 со СДМ1 на СДМ2 — резерв сохранён
  dm("dm1", "Слиток золота ЗлА-1", "5015371", "Слиток", "1000", 999, 500.25, L(1, 1), "Резерв"),
  dm("dm3", "Стружка золотая 585", "5015373", "Стружка", "0100", 585, 45.80, L(2, 1), "Резерв"),
  // Резерв шихтовой карты П-2026-0088: ещё на СДМ1 (требование ТР-0013 в работе)
  dm1("dm4", "Проба золота Au-750", "5015374", "Основная проба", "0300", 750, 12.30, L(2, 1), "Резерв"),
  dm1("dm8", "Золотой порошок Au", "5015378", "Гранулы", "1000", 999.9, 25.00, L(3, 1), "Резерв"),
  // На складе приёмки СДМ1
  dm1("dm2", "Слиток серебра СрА-2", "5015372", "Слиток", "2000", 999, 1000.50, L(1, 2)),
  dm1("dm6", "Слиток платины ПлА-1", "5015376", "Слиток", "4000", 999, 300.00, L(1, 1)),
  dm1("dm7", "Лом золота 585", "5015377", "Скрап", "0100", 585, 88.40, L(3, 2)),
  dm1("dm20", "Проволока золотая 585", "5015390", "Проволока", "0100", 585, 35.00, L(2, 1)),
  // На складе выдачи СДМ2
  dm("dm14", "Слиток серебра СрА-4", "5015384", "Слиток", "2000", 999, 791.40, L(1, 2)),
  dm("dm15", "Проба серебра Ag-999", "5015385", "Основная проба", "2000", 999, 8.50, L(3, 1)),
  dm("dm17", "Отходы после анализа Au-585", "5015387", "Отходы", "0100", 585, 5.90, L(4, 2)),
  dm("dm21", "Припой серебряный ПСр-72", "5015391", "Припой", "2000", 750, 18.00, L(3, 2)),
  dm("dm22", "Хлорид серебра", "5015392", "Хлорид серебра", "2000", 750, 40.00, L(4, 2)),
  // Драгоценные камни: qty — штук, ligWeight — масса камней, г (1 кар = 0,2 г), металлов в чистоте нет
  { id: "dm9", name: "Бриллиант Кр57 0,05 кар", nomenkl: "5015379", klass: "Драгоценные камни", metal: "0050", qty: 120, proba: 0, ligWeight: 1.20, netWeight: 0, location: L(1, 1), sklad: SDM1, status: "На складе" },
  { id: "dm10", name: "Изумруд огранённый 1 кар", nomenkl: "5015380", klass: "Драгоценные камни", metal: "0050", qty: 3, proba: 0, ligWeight: 0.60, netWeight: 0, location: L(4, 1), sklad: SDM2, status: "На складе" },
  // В подотчёте — выданы в операциях «В работе» (место хранения снято)
  dm("dm11", "Слиток золота ЗлА-2", "5015381", "Слиток", "1000", 999, 300.00, "-", "В подотчёте"),
  dm("dm12", "Стружка золотая 750", "5015382", "Стружка", "0300", 750, 62.40, "-", "В подотчёте"),
  dm("dm13", "Подкат золотой 999", "5015383", "Подкат", "1000", 999, 520.00, "-", "В подотчёте"),
  dm("dm5", "Раствор серебра AgNO3", "5015375", "Электролит", "2000", 999, 250.00, "-", "В подотчёте", 1, 158.75),
  dm("dm18", "Пластина серебряная", "5015388", "Пластина", "2000", 999, 120.00, "-", "В подотчёте"),
  // Закрыты: израсходована на анализ в ЛКИ / выдана по оформленной накладной НО-0203
  dm("dm16", "Контрольная проба Au-585", "5015386", "Контрольная проба", "0100", 585, 6.20, "-", "Закрыта"),
  dm("dm19", "Слиток золота ЗлБ-1", "5015389", "Слиток", "1000", 999, 200.00, "-", "Закрыта"),
];

// Класс драгоценных камней (в описях масса показывается в каратах)
export const STONE_KLASS = "Драгоценные камни";
export const isStoneKlass = (klass: string) => klass === STONE_KLASS;

// --- Складские документы ---
// Склад выдачи: отправитель накладных на отгрузку / передачу и склад операций движения материала.
export const MAIN_SKLAD = SDM2;
// Склад приёмки: получатель по умолчанию в приходном ордере и накладной, отправитель по умолчанию в требовании.
export const PRIHOD_SKLAD = SDM1;

// Типы документов приёмки / отгрузки — значения справочников
export const DOC_PRIHOD_ORDER = "Приходный ордер";
export const DOC_PRIHOD_NAKLAD = "Накладная";
// Требование — перемещение позиций со склада на склад (СДМ1 → СДМ2) без смены места хранения и статуса
export const DOC_TREBOVANIE = "Требование";

// Склады документа (отправитель и/или получатель — значения справочника «Склады»)
export const docSklady = (d: { sender: string; receiver: string }) =>
  [d.sender, d.receiver].filter((v, i, a) => spravValues("Склады").includes(v) && a.indexOf(v) === i);
export const DOC_OTGRUZKA_DM = "Накладная на отгрузку ДМ";
export const DOC_PEREDACHA_GP = "Накладная на передачу ГП";

export const initialSkladDocs: SkladDoc[] = [
  { id: "sd1", date: "19.08.2026", type: DOC_PRIHOD_ORDER, number: "ПО-0342", status: "В работе", sender: "ОО «АурумПоставка»", receiver: PRIHOD_SKLAD },
  { id: "sd2", date: "18.08.2026", type: DOC_PRIHOD_NAKLAD, number: "НП-0118", status: "В работе", sender: "Производственный цех", receiver: PRIHOD_SKLAD },
  { id: "sd3", date: "17.08.2026", type: DOC_PRIHOD_ORDER, number: "ПО-0341", status: "Оформлено", sender: "АО «Металл Инвест»", receiver: PRIHOD_SKLAD },
  { id: "sd4", date: "16.08.2026", type: DOC_PRIHOD_NAKLAD, number: "НП-0117", status: "Оформлено", sender: "СДМ", receiver: PRIHOD_SKLAD },
  { id: "sd5", date: "15.08.2026", type: DOC_PRIHOD_ORDER, number: "ПО-0340", status: "Оформлено", sender: "ОО «СереброТрейд»", receiver: PRIHOD_SKLAD },
  { id: "sd6", date: "14.08.2026", type: DOC_PRIHOD_NAKLAD, number: "НП-0116", status: "Оформлено", sender: "Производственный цех", receiver: PRIHOD_SKLAD },
];

// Позиция накладной на выдачу из позиции склада (выдаётся целиком)
const vpos = (src: "gp" | "dm", id: string): VydachaDocPosition => {
  if (src === "gp") {
    const i = initialGPItems.find(x => x.id === id)!;
    return { id, src, nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.code, qty: i.qty, unit: i.unit, proba: i.proba ?? null, lig: i.ligWeight ?? null, net: i.netWeight ?? null, location: i.location, sklad: i.sklad, chem: i.chem, issue: i.qty };
  }
  const i = initialDMItems.find(x => x.id === id)!;
  return { id, src, nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.metal, qty: i.qty, unit: "шт", proba: i.proba, lig: i.ligWeight, net: i.netWeight, location: i.location, sklad: i.sklad, chem: i.chem, issue: i.qty };
};

// Требования: ТР-0012 (оформлено) переместило резерв карты П-2026-0089 со СДМ1 на СДМ2,
// ТР-0013 (в работе) — резерв карты П-2026-0088, позиции ещё на СДМ1
const trebPos = (id: string) => ({ ...vpos("dm", id), sklad: SDM1 });
initialSkladDocs.unshift(
  { id: "sd7", date: "20.08.2026", type: DOC_TREBOVANIE, number: "ТР-0013", status: "В работе", sender: SDM1, receiver: SDM2, shihtaId: "sk2", positions: [vpos("dm", "dm4"), vpos("dm", "dm8")] },
  { id: "sd8", date: "19.08.2026", type: DOC_TREBOVANIE, number: "ТР-0012", status: "Оформлено", sender: SDM1, receiver: SDM2, shihtaId: "sk1", positions: [trebPos("dm1"), trebPos("dm3")] },
);

export const initialVydachaDocs: SkladDoc[] = [
  { id: "vd1", date: "19.08.2026", type: DOC_PEREDACHA_GP, number: "НО-0205", status: "В работе", sender: MAIN_SKLAD, receiver: "АО «МонетаДМ»", positions: [vpos("gp", "gp2"), vpos("gp", "gp9")] },
  { id: "vd2", date: "17.08.2026", type: DOC_PEREDACHA_GP, number: "НО-0204", status: "Оформлено", sender: MAIN_SKLAD, receiver: "ТД «Золото Казахстана»", positions: [vpos("gp", "gp35"), vpos("gp", "gp36")] },
  { id: "vd3", date: "15.08.2026", type: DOC_OTGRUZKA_DM, number: "НО-0203", status: "Оформлено", sender: MAIN_SKLAD, receiver: "АО «Металл Инвест»", positions: [vpos("dm", "dm19")] },
];

// --- Операции движения ---
// Позиция операции из позиции склада ДМ; ves — лигатурный вес (основа расчётов операции)
const opPos = (n: number, id: string, loc: string, over: Partial<OperPosition> = {}): OperPosition => {
  const i = initialDMItems.find(x => x.id === id)!;
  const lig = over.lig ?? i.ligWeight;
  const net = over.net ?? i.netWeight;
  const chem = chemOf(i.metal, lig, net);
  return { n, name: i.name, nomenkl: i.nomenkl, klass: i.klass, proba: i.proba, qty: i.qty, ves: lig, ag: chem.ag ?? "-", cu: chem.cu ?? "-", chem, loc, metal: i.metal, lig, net, ...over };
};
// Новая позиция возврата (создана при возврате, на склад ещё не поставлена)
const newPos = (n: number, name: string, nomenkl: string, klass: string, metal: string, proba: number, lig: number, loc: string, qty?: number): OperPosition => {
  const net = r2(lig * proba / 1000);
  const chem = chemOf(metal, lig, net);
  return { n, name, nomenkl, klass, proba, qty, ves: lig, ag: chem.ag ?? "-", cu: chem.cu ?? "-", chem, loc, metal, lig, net };
};
const VYDAL = "Ким Александр Юрьевич";

// Потери операции «Производство ГП» (вкладка «Списание»)
const demoGpLosses: OperLoss[] = [
  { id: "l1", date: "2026-08-18", name: "Прокат, отжиг, травление", ves: "0.35", type: "Потеря", metal: "1000" },
  { id: "l2", date: "2026-08-18", name: "Вырубка и обрубка", ves: "0.80", type: "Потеря", metal: "1000" },
  { id: "l3", date: "2026-08-18", name: "Чеканка", ves: "0.60", type: "Потеря", metal: "1000" },
  { id: "l4", date: "2026-08-18", name: "Полирование", ves: "0.15", type: "Потеря", metal: "1000" },
];

export const initialOperations: Operation[] = [
  {
    id: "op1", date: "19.08.2026", type: "Выдача", vid: "Плавка", positions: 2, document: "1234", responsible: "Нурланов Асхат Бекович",
    stage: "В работе", description: "Слитки Au 999 для монетной заготовки", statusVydacha: "Выдано", statusVozvrat: "Не начат", statusClose: "Не закрыто",
    docType: "Приказ", zakazchik: "Монетный двор", plavkaNo: "П-2026-0091", vydal: VYDAL, poluchil: "Нурланов Асхат Бекович",
    vydachaPos: [opPos(1, "dm11", L(1, 1)), opPos(2, "dm12", L(2, 1))], vozvratPos: [], losses: [],
  },
  {
    id: "op2", date: "18.08.2026", type: "Выдача-Возврат", vid: "Производство ГП", positions: 1, document: "1233", responsible: "Петров Сергей Владимирович",
    stage: "В работе", description: "Памятная монета «Сакральная география» Au 999", statusVydacha: "Выдано", statusVozvrat: "Частично", statusClose: "Не закрыто",
    docType: "Заказ-наряд", zakazchik: "Монетный двор", vydal: VYDAL, poluchil: "Петров Сергей Владимирович",
    vydachaPos: [opPos(1, "dm13", L(2, 1))],
    vozvratPos: [
      newPos(1, "Заготовка монеты Ø38,6 мм", "5015393", "Полуфабрикат заготовки", "1000", 999, 372.00, L(1, 2), 12),
      newPos(2, "Отходы вырубки Au 999", "5015394", "Отходы", "1000", 999, 143.00, L(3, 2)),
    ],
    losses: demoGpLosses,
  },
  {
    id: "op3", date: "17.08.2026", type: "Выдача-Возврат", vid: "Отбор пробы", positions: 1, document: "1232", responsible: "Смирнов Константин Дмитриевич",
    stage: "Завершено", description: "Отбор пробы от слитка серебра СрА-4", statusVydacha: "Выдано", statusVozvrat: "Полностью", statusClose: "Закрыто",
    docType: "Приказ", zakazchik: "Монетный двор", vydal: VYDAL, poluchil: "Смирнов Константин Дмитриевич",
    vydachaPos: [opPos(1, "dm14", L(1, 2), { lig: 800.00, net: 799.20, ves: 800.00 })],
    vozvratPos: [opPos(1, "dm14", L(1, 2)), opPos(2, "dm15", L(3, 1))],
    losses: [{ id: "l1", date: "2026-08-17", name: "Проведение входного контроля стандартных слитков", ves: "0.08", type: "Потеря", metal: "2000" }],
  },
  {
    id: "op4", date: "16.08.2026", type: "Выдача-Возврат", vid: "Анализ в ЛКИ", positions: 1, document: "1231", responsible: "Нурланов Асхат Бекович",
    stage: "Завершено", description: "Химический анализ контрольной пробы Au-585", statusVydacha: "Выдано", statusVozvrat: "Полностью", statusClose: "Закрыто",
    docType: "Накладная в ЛКИ", zakazchik: "Монетный двор", vydal: VYDAL, poluchil: "Нурланов Асхат Бекович",
    vydachaPos: [opPos(1, "dm16", L(2, 1))],
    vozvratPos: [opPos(1, "dm17", L(4, 2))],
    losses: [{ id: "l1", date: "2026-08-16", name: "Слесарная (опиловка, снятие заусенцев, стружки, проточка)", ves: "0.30", type: "Потеря", metal: "0100" }],
  },
  {
    id: "op5", date: "15.08.2026", type: "Выдача", vid: "Гальванопокрытие", positions: 2, document: "1230", responsible: "Иванова Мария Сергеевна",
    stage: "В работе", description: "Серебрение заготовок медалей", statusVydacha: "Выдано", statusVozvrat: "Не начат", statusClose: "Не закрыто",
    docType: "Маршрутный лист", zakazchik: "Монетный двор", vydal: VYDAL, poluchil: "Иванова Мария Сергеевна",
    vydachaPos: [opPos(1, "dm5", L(3, 1)), opPos(2, "dm18", L(1, 2))], vozvratPos: [], losses: [],
  },
];

// --- Шихтовые карты ---
const shMat = (id: string): ShihtaMaterial => {
  const i = initialDMItems.find(x => x.id === id)!;
  return { name: i.name, nomenkl: i.nomenkl, klass: i.klass, proba: i.proba, ves: i.ligWeight, loc: i.location, qty: i.qty, chem: i.chem };
};
export const initialShihtovyeKarty: ShihtovayaKarta[] = [
  {
    id: "sk5", date: "20.08.2026", name: "Шихта Au-585 партия В (черновик)", plavkaNo: "П-2026-0090", status: "Редактирование",
    materials: [],
    createdAt: "2026-08-20T10:05:00", createdBy: "Ковалева Елена",
  },
  {
    id: "sk1", date: "19.08.2026", name: "Шихта для плавки Au-585 (партия А)", plavkaNo: "П-2026-0089", status: "Новая",
    materials: [shMat("dm1"), shMat("dm3")],
    createdAt: "2026-08-19T09:12:00", createdBy: "Ковалева Елена",
  },
  {
    id: "sk2", date: "15.08.2026", name: "Шихта золото 750 пробы", plavkaNo: "П-2026-0088", status: "Новая",
    materials: [shMat("dm4"), shMat("dm8")],
    createdAt: "2026-08-15T14:45:00", createdBy: "Нурланов Асхат Бекович",
  },
  {
    id: "sk3", date: "10.08.2026", name: "Шихта серебро 925 (кольца)", plavkaNo: "П-2026-0087", status: "Выполнена",
    materials: [{ name: "Слиток серебра СрА-1", nomenkl: "5015360", klass: "Слиток", proba: 999, ves: 1000.50, loc: "-", qty: 1, chem: { ag: "999.50" } }],
    createdAt: "2026-08-10T08:30:00", createdBy: "Петров Сергей Владимирович",
  },
  {
    id: "sk4", date: "05.08.2026", name: "Шихта Au-999 слитки партия Б", plavkaNo: "П-2026-0086", status: "Выполнена",
    materials: [{ name: "Слиток золота стандартный", nomenkl: "5015361", klass: "Слиток", proba: 999.9, ves: 1000.00, loc: "-", qty: 1, chem: { au: "999.90" } }],
    createdAt: "2026-08-05T11:00:00", createdBy: "Ковалева Елена",
  },
];

// --- Подотчётники ---
// Позиции процессов — позиции операций движения материала соответствующего подотчётного лица
const pPos = (id: string, status: StatusDM): PodotchetPosition => {
  const i = initialDMItems.find(x => x.id === id)!;
  return { name: i.name, nomenkl: i.nomenkl, klass: i.klass, metal: i.metal, qty: i.qty, proba: i.proba, ligWeight: i.ligWeight, netWeight: i.netWeight, location: i.location, status };
};
const pMat = (id: string) => {
  const i = initialDMItems.find(x => x.id === id)!;
  return { name: i.name, nomenkl: i.nomenkl, weight: i.ligWeight };
};
export const initialPodotchetniki: Podotchetnik[] = [
  {
    id: "p1", name: "Нурланов Асхат Бекович", tabelNo: "ТН-001", department: "Плавильный цех", position: "Плавильщик",
    materials: [pMat("dm11"), pMat("dm12")],
    currentProcesses: [
      { id: "pr-p1-1", name: "Слитки Au 999 для монетной заготовки", vid: "Плавка", date: "19.08.2026, 09:00", positions: [pPos("dm11", "В подотчёте"), pPos("dm12", "В подотчёте")] },
    ],
    completedProcesses: [
      { id: "pr-p1-c1", name: "Химический анализ контрольной пробы Au-585", vid: "Анализ в ЛКИ", date: "16.08.2026, 10:00", completedDate: "16.08.2026, 16:30", positions: [pPos("dm16", "Закрыта")] },
    ],
  },
  {
    id: "p2", name: "Петров Сергей Владимирович", tabelNo: "ТН-002", department: "Производственный цех", position: "Ювелир",
    materials: [pMat("dm13")],
    currentProcesses: [
      { id: "pr-p2-1", name: "Памятная монета «Сакральная география» Au 999", vid: "Производство ГП", date: "18.08.2026, 14:30", positions: [pPos("dm13", "В подотчёте")] },
    ],
    completedProcesses: [],
  },
  {
    id: "p3", name: "Смирнов Константин Дмитриевич", tabelNo: "ТН-003", department: "Лаборатория", position: "Лаборант",
    materials: [],
    currentProcesses: [],
    completedProcesses: [
      { id: "pr-p3-c1", name: "Отбор пробы от слитка серебра СрА-4", vid: "Отбор пробы", date: "17.08.2026, 09:15", completedDate: "17.08.2026, 15:00", positions: [pPos("dm14", "На складе")] },
    ],
  },
  {
    id: "p4", name: "Иванова Мария Сергеевна", tabelNo: "ТН-004", department: "Гальванический цех", position: "Гальваник",
    materials: [pMat("dm5"), pMat("dm18")],
    currentProcesses: [
      { id: "pr-p4-1", name: "Серебрение заготовок медалей", vid: "Гальванопокрытие", date: "15.08.2026, 13:00", positions: [pPos("dm5", "В подотчёте"), pPos("dm18", "В подотчёте")] },
    ],
    completedProcesses: [],
  },
  {
    id: "p5", name: "Ким Александр Юрьевич", tabelNo: "ТН-005", department: "Склад ДМ", position: "Кладовщик",
    materials: [], currentProcesses: [], completedProcesses: [],
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
  { id: "u1", name: "Ковалева Елена", role: "Администратор", status: "Активен", email: "e.kovaleva@kmd.kz", username: "e.kovaleva" },
  { id: "u2", name: "Нурланов Асхат Бекович", role: "Сотрудник склада ДМ", status: "Активен", email: "a.nurlanov@kmd.kz", username: "a.nurlanov" },
  { id: "u3", name: "Петров Сергей Владимирович", role: "Сотрудник ПТО", status: "Активен", email: "s.petrov@kmd.kz", username: "s.petrov" },
  { id: "u4", name: "Ким Александр Юрьевич", role: "Сотрудник склада ДМ", status: "Заблокирован", email: "a.kim@kmd.kz", username: "a.kim" },
  { id: "u5", name: "Иванова Мария Сергеевна", role: "Технолог", status: "Активен", email: "m.ivanova@kmd.kz", username: "m.ivanova" },
];

// --- Роли ---
export const initialRoles: Role[] = [
  { id: "r1", name: "Администратор", active: true, createdAt: "2026-01-12T09:15:00", createdBy: "Ковалева Елена" },
  { id: "r2", name: "Сотрудник склада ДМ", active: true, createdAt: "2026-01-12T09:20:00", createdBy: "Ковалева Елена" },
  { id: "r3", name: "Сотрудник ПТО", active: true, createdAt: "2026-02-03T11:40:00", createdBy: "Ковалева Елена" },
  { id: "r4", name: "Технолог", active: false, createdAt: "2026-03-18T16:05:00", createdBy: "Нурланов Асхат Бекович" },
];

// --- Логи ---
// Атрибуты позиции в журнале — как в карточке позиции склада
const logAttrs = (name: string, nomenkl: string, klass: string, code: string, qty: string, proba: string, lig: string, net: string, loc: string, status: string) => [
  { label: "Наименование", value: name }, { label: "Номенкл. №", value: nomenkl }, { label: "Класс", value: klass }, { label: "Код материала", value: code },
  { label: "Количество изделий", value: qty }, { label: "Проба", value: proba }, { label: "Вес лигат.", value: lig }, { label: "Вес чист.", value: net },
  { label: "Место хранения", value: loc }, { label: "Статус", value: status },
];
const logItem = (i: DMItem | GPItem, status: LogItemStatus, loc = i.location, st: string = i.status): LogSnapshotItem => {
  const code = "metal" in i ? i.metal : i.code;
  const short: Record<string, string> = { "1000": "Au чистое", "2000": "Ag чистое", "4000": "Pt чистое", "0100": "ЗлМ 585", "0300": "ЗлСрМ 750-150" };
  const label = short[code] ? { code, shortName: short[code] } : undefined;
  return {
    title: `${i.nomenkl} · ${i.name}`, status,
    attrs: logAttrs(i.name, i.nomenkl, i.klass, label ? `${label.code}-${label.shortName}` : code, String(i.qty || "—"), String(i.proba || "—"),
      `${fx(i.ligWeight ?? 0)} г`, `${fx(i.netWeight ?? 0)} г`, loc, st),
  };
};
const itemById = (id: string) => (initialDMItems.find(x => x.id === id) ?? initialGPItems.find(x => x.id === id))!;

export const initialLogs: LogEntry[] = [
  {
    id: "l1", datetime: "17.08.2026, 09:42", user: "Ковалева Е.", section: "Склады", type: "Создание",
    description: "Оформлен приходный ордер ПО-0341 на 3 позиции ДМ",
    before: [],
    after: [logItem(itemById("dm2"), "Новая"), logItem(itemById("dm6"), "Новая"), logItem(itemById("dm14"), "Новая", L(1, 2), "На складе")],
  },
  {
    id: "l2", datetime: "19.08.2026, 09:15", user: "Нурланов А.Б.", section: "Склады", type: "Изменение",
    description: "Изменено место хранения позиции 5015371",
    before: [logItem(itemById("dm1"), "Изменена", L(2, 1), "На складе")],
    after: [logItem(itemById("dm1"), "Изменена", L(1, 1), "На складе")],
  },
  {
    id: "l3", datetime: "18.08.2026, 16:30", user: "Петров С.В.", section: "Складские операции", type: "Создание",
    description: "Создана накладная НП-0118 на приём готовой продукции",
    before: [],
    after: [logItem(itemById("gp1"), "Новая")],
  },
  {
    id: "l4", datetime: "19.08.2026, 14:10", user: "Ковалева Е.", section: "Шихтовые карты", type: "Изменение",
    description: "Оформлена шихтовая карта П-2026-0089",
    before: [{ title: "П-2026-0089 · Шихтовая карта", status: "Изменена", attrs: [
      { label: "Наименование", value: "Шихта для плавки Au-585 (партия А)" }, { label: "Номер плавки", value: "П-2026-0089" }, { label: "Статус", value: "Редактирование" },
    ] }],
    after: [{ title: "П-2026-0089 · Шихтовая карта", status: "Изменена", attrs: [
      { label: "Наименование", value: "Шихта для плавки Au-585 (партия А)" }, { label: "Номер плавки", value: "П-2026-0089" }, { label: "Статус", value: "Новая" },
    ] }],
  },
  {
    id: "l5", datetime: "15.08.2026, 11:20", user: "Иванова М.С.", section: "Движение материала", type: "Создание",
    description: "Создана операция 1230 (Гальванопокрытие)",
    before: [],
    after: [{ title: "1230 · Операция движения материала", status: "Новая", attrs: [
      { label: "Тип операции", value: "Выдача" }, { label: "Вид операции", value: "Гальванопокрытие" }, { label: "Тип документа", value: "Маршрутный лист" },
      { label: "Подотчётное лицо", value: "Иванова Мария Сергеевна" }, { label: "Статус", value: "В работе" },
    ] }],
  },
  {
    id: "l6", datetime: "16.08.2026, 15:45", user: "Ким А.Ю.", section: "Склады", type: "Удаление",
    description: "Удалена позиция 5015320 (ошибочный ввод)",
    before: [{ title: "5015320 · Браслет серебряный", status: "Удалена", attrs: logAttrs("Браслет серебряный", "5015320", "Готовая продукция", "2000-Ag чистое", "36", "925", "432.00 г", "399.60 г", L(3, 1), "На складе") }],
    after: [],
  },
  {
    id: "l7", datetime: "16.08.2026, 16:30", user: "Нурланов А.Б.", section: "Движение материала", type: "Изменение",
    description: "Завершена операция 1231 (Анализ в ЛКИ)",
    before: [logItem(itemById("dm16"), "Исчезла", "-", "В подотчёте")],
    after: [logItem(itemById("dm17"), "Новая")],
  },
  {
    id: "l8", datetime: "14.08.2026, 13:25", user: "Ковалева Е.", section: "Администрирование", type: "Создание",
    description: "Добавлен новый пользователь m.ivanova",
    before: [],
    after: [{ title: "m.ivanova · Иванова Мария Сергеевна", status: "Новая", attrs: [
      { label: "ФИО", value: "Иванова Мария Сергеевна" }, { label: "Логин", value: "m.ivanova" }, { label: "Роль", value: "Технолог" }, { label: "Email", value: "m.ivanova@kmd.kz" }, { label: "Статус", value: "Активен" },
    ] }],
  },
  {
    id: "l9", datetime: "12.08.2026, 10:05", user: "Петров С.В.", section: "Склады", type: "Изменение",
    description: "Объединены позиции 5015350 и 5015351 в новую позицию 5015352",
    before: [
      { title: "5015350 · Слиток золота ЗлБ-2", status: "Объединена", attrs: logAttrs("Слиток золота ЗлБ-2", "5015350", "Слиток", "1000-Au чистое", "1", "999", "300.00 г", "299.70 г", L(3, 1), "На складе") },
      { title: "5015351 · Слиток золота ЗлБ-3", status: "Объединена", attrs: logAttrs("Слиток золота ЗлБ-3", "5015351", "Слиток", "1000-Au чистое", "1", "999", "200.00 г", "199.80 г", L(3, 1), "На складе") },
    ],
    after: [{ title: "5015352 · Слиток золота ЗлБ-2/3", status: "Новая", attrs: logAttrs("Слиток золота ЗлБ-2/3", "5015352", "Слиток", "1000-Au чистое", "2", "999", "500.00 г", "499.50 г", L(3, 1), "На складе") }],
  },
  {
    id: "l10", datetime: "10.08.2026, 08:30", user: "Ким А.Ю.", section: "Шихтовые карты", type: "Изменение",
    description: "Слиток 5015355 переплавлен в стружку 5015356 по шихтовой карте П-2026-0087",
    before: [{ title: "5015355 · Слиток золота ЗлВ-1", status: "Преобразована", attrs: logAttrs("Слиток золота ЗлВ-1", "5015355", "Слиток", "0100-ЗлМ 585", "1", "585", "410.00 г", "239.85 г", L(2, 1), "На складе") }],
    after: [{ title: "5015356 · Стружка золотая ЗлВ-1", status: "Преобразована", attrs: logAttrs("Стружка золотая ЗлВ-1", "5015356", "Стружка", "0100-ЗлМ 585", "1", "585", "405.00 г", "236.93 г", L(2, 1), "На складе") }],
  },
];

// --- Позиции операций движения материала ---
// Позиции операции (сохраняются с операцией)
export const opVydacha = (o: Operation) => o.vydachaPos ?? [];
export const opVozvrat = (o: Operation) => o.vozvratPos ?? [];
export const opLosses = (o: Operation) => o.losses ?? [];

// Суммарные веса операции, г: выдано / возвращено / списано
export function opWeights(o: Operation) {
  const sum = (xs: number[]) => xs.reduce((a, v) => a + v, 0);
  return {
    vydacha: sum(opVydacha(o).map(p => p.ves)),
    vozvrat: sum(opVozvrat(o).map(p => p.ves)),
    spisanie: sum(opLosses(o).map(lossWeight)),
  };
}

// --- Справочники ---
export const spravochniki = {
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
  "Типы документов приёмки": {
    count: 3,
    items: [
      { code: "ПО", value: "Приходный ордер", status: "Активно" },
      { code: "НП", value: "Накладная", status: "Активно" },
      { code: "ТР", value: "Требование", status: "Активно" },
    ]
  },
  "Типы документов отгрузки": {
    count: 2,
    items: [
      { code: "НО-ДМ", value: "Накладная на отгрузку ДМ", status: "Активно" },
      { code: "НП-ГП", value: "Накладная на передачу ГП", status: "Активно" },
    ]
  },
  "Типы документов движения материала": {
    count: 9,
    items: [
      { code: "ДВ", value: "Движение материала", status: "Активно" },
      { code: "ЗН", value: "Заказ-наряд", status: "Активно" },
      { code: "АС", value: "Акт списания", status: "Активно" },
      { code: "МСЛ", value: "Маршрутный лист", status: "Активно" },
      { code: "ИНВ", value: "Инвентаризационная опись", status: "Активно" },
      { code: "ШК", value: "Шихтовая карта", status: "Активно" },
      { code: "ПР", value: "Приказ", status: "Активно" },
      { code: "НЛКИ", value: "Накладная в ЛКИ", status: "Активно" },
      { code: "НВ-ДМ", value: "Накладная на выдачу ДМ", status: "Активно" },
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
    count: 3,
    items: [
      { code: "ТО-01", value: "Выдача", status: "Активно" },
      { code: "ТО-02", value: "Возврат", status: "Активно" },
      { code: "ТО-03", value: "Выдача-Возврат", status: "Активно" },
    ]
  },
  "Виды операций": {
    count: 6,
    items: [
      { code: "ВО-01", value: "Отбор пробы", status: "Активно" },
      { code: "ВО-02", value: "Анализ в ЛКИ", status: "Активно" },
      { code: "ВО-03", value: "Плавка", status: "Активно" },
      { code: "ВО-04", value: "Гальванопокрытие", status: "Активно" },
      { code: "ВО-05", value: "Производство ГП", status: "Активно" },
      { code: "ВО-06", value: "НИОКР", status: "Активно" },
    ]
  },
  "Склады": {
    count: 2,
    items: [
      { code: "СДМ1", value: "Склад ДМ №1", status: "Активно" },
      { code: "СДМ2", value: "Склад ДМ №2", status: "Активно" },
    ]
  },
  "Технологические операции": {
    count: 19,
    items: [
      { code: "ТХ-01", value: "Плавка драгоценных металлов", status: "Активно" },
      { code: "ТХ-02", value: "Плавка сплавов драгоценных металлов", status: "Активно" },
      { code: "ТХ-03", value: "Фрезерование", status: "Активно" },
      { code: "ТХ-04", value: "Прокат, отжиг, травление", status: "Активно" },
      { code: "ТХ-05", value: "Вырубка и обрубка", status: "Активно" },
      { code: "ТХ-06", value: "Чеканка", status: "Активно" },
      { code: "ТХ-07", value: "Слесарная (опиловка, снятие заусенцев, стружки, проточка)", status: "Активно" },
      { code: "ТХ-08", value: "Полирование", status: "Активно" },
      { code: "ТХ-09", value: "Галтовка", status: "Активно" },
      { code: "ТХ-10", value: "Приготовление электролита золочения", status: "Активно" },
      { code: "ТХ-11", value: "Золочение", status: "Активно" },
      { code: "ТХ-12", value: "Удаление золотого покрытия", status: "Активно" },
      { code: "ТХ-13", value: "Оксидирование", status: "Активно" },
      { code: "ТХ-14", value: "Плавка отходов драгоценных металлов и сплавов", status: "Активно" },
      { code: "ТХ-15", value: "Литье по выплавляемым моделям", status: "Активно" },
      { code: "ТХ-16", value: "Вакуумное ионно-плазменное напыление", status: "Активно" },
      { code: "ТХ-17", value: "Определение хлористого серебра и извлечение его из отходов", status: "Активно" },
      { code: "ТХ-18", value: "Извлечение драгоценных металлов из отходов (растворов, порошков, шлифов, шламов)", status: "Активно" },
      { code: "ТХ-19", value: "Проведение входного контроля стандартных слитков", status: "Активно" },
    ]
  },
  // Код — номер строки справочника
  "Пробы": {
    count: 15,
    items: ["999.9", "999", "995", "958", "925", "916", "900", "875", "850", "800", "750", "585", "583", "500", "375"]
      .map((value, i) => ({ code: String(i + 1), value, status: "Активно" })),
  },
  // Код — номер строки справочника
  "Тип списания": {
    count: 2,
    items: [
      { code: "1", value: "Потеря", status: "Активно" },
      { code: "2", value: "Прирост", status: "Активно" },
    ]
  },
};

// Активные значения справочника — источник вариантов для полей выбора на формах.
export function spravValues(name: keyof typeof spravochniki): string[] {
  return spravochniki[name].items.filter(i => i.status === "Активно").map(i => i.value);
}

// --- Нормативы потерь драгоценных металлов по технологическим операциям ---
// Ключ — код записи справочника «Технологические операции». unit — база расчёта норматива,
// au / ag — допустимые потери, % (пусто — для металла норматив не установлен).
// Значение может быть составным (полирование серебра: «30,00/3,00» — к массе съёма / к массе заготовки).
export interface TechOpLossNorm { unit: string; au: string; ag: string }

export const techOpLossNorms: Record<string, TechOpLossNorm> = {
  "ТХ-01": { unit: "% к массе навески", au: "0,054", ag: "0,054" },
  "ТХ-02": { unit: "% к массе навески", au: "0,060", ag: "0,080" },
  "ТХ-03": { unit: "% от массы стружки", au: "0,072", ag: "0,080" },
  "ТХ-04": { unit: "% от массы слитка", au: "0,048", ag: "0,048" },
  "ТХ-05": { unit: "% от массы заготовки", au: "0,009", ag: "0,008" },
  "ТХ-06": { unit: "% от массы заготовки", au: "0,0005", ag: "0,0020" },
  "ТХ-07": { unit: "% от массы стружки", au: "6,500", ag: "7,500" },
  "ТХ-08": { unit: "% к массе съёма / к массе заготовки", au: "", ag: "30,00/3,00" },
  "ТХ-09": { unit: "% к массе заготовки после операции", au: "0,020", ag: "0,020" },
  "ТХ-10": { unit: "% к массе навески", au: "1,000", ag: "" },
  "ТХ-11": { unit: "% к массе осаждённого металла", au: "4,400", ag: "" },
  "ТХ-12": { unit: "% к массе покрытия", au: "4,000", ag: "" },
  "ТХ-13": { unit: "% к массе после операции", au: "", ag: "0,120" },
  "ТХ-14": { unit: "% к массе до операции", au: "0,600", ag: "0,900" },
  "ТХ-15": { unit: "% к массе до операции", au: "0,350", ag: "0,400" },
  "ТХ-16": { unit: "% к массе напылённого металла на изделие", au: "13,00", ag: "18,00" },
  "ТХ-17": { unit: "% к массе навески", au: "", ag: "8,00" },
  "ТХ-18": { unit: "% к массе навески", au: "4,000", ag: "4,00" },
  "ТХ-19": { unit: "% от (съёма металла) массы стружки", au: "1,051", ag: "1,2" },
};

// Норматив потерь операции (по наименованию из справочника) для металла: Au — золото, Ag — серебро.
// undefined — операция не найдена или норматив для металла не установлен.
export function techOpLossNorm(opName: string, metal: Metal): { unit: string; value: string } | undefined {
  const code = spravochniki["Технологические операции"].items.find(i => i.value === opName)?.code;
  const norm = code ? techOpLossNorms[code] : undefined;
  const value = metal === "Au" ? norm?.au : metal === "Ag" ? norm?.ag : undefined;
  return norm && value ? { unit: norm.unit, value } : undefined;
}

// --- Справочники статусов ---
// Каждый статус: наименование и цвет. Цвет определяет вид бейджа статуса во всех разделах.
export type StatusColor = "green" | "blue" | "yellow" | "orange" | "red" | "purple" | "gray";
export const STATUS_COLORS: { value: StatusColor; label: string }[] = [
  { value: "green", label: "Зелёный" },
  { value: "blue", label: "Синий" },
  { value: "yellow", label: "Жёлтый" },
  { value: "orange", label: "Оранжевый" },
  { value: "red", label: "Красный" },
  { value: "purple", label: "Фиолетовый" },
  { value: "gray", label: "Серый" },
];

export interface StatusItem { id: string; name: string; color: StatusColor }
// group — ключ справочника, по которому бейдж ищет цвет статуса
export type StatusGroup =
  | "pozicii" | "dokumenty" | "operacii" | "shihta"
  | "gost" | "podotchet" | "polzovateli" | "zhurnal" | "mesta-hraneniya" | "zapisi-spravochnikov";
export interface StatusDict {
  group: StatusGroup;
  name: string;
  // Разделы, где используются статусы справочника
  sections: string;
  items: StatusItem[];
}

const st = (group: string, list: [string, StatusColor][]): StatusItem[] =>
  list.map(([name, color], i) => ({ id: `${group}-${i + 1}`, name, color }));

export const initialStatusDicts: StatusDict[] = [
  { group: "pozicii", name: "Статусы позиций", sections: "Склады ДМ и ГП, Движение материала, Подотчётники, Шихтовые карты",
    items: st("pozicii", [["На складе", "green"], ["Резерв", "yellow"], ["В подотчёте", "blue"], ["Закрыта", "gray"]]) },
  { group: "dokumenty", name: "Статусы складских документов", sections: "Складские операции (приход, выдача)",
    items: st("dokumenty", [["В работе", "yellow"], ["Оформлено", "green"]]) },
  { group: "operacii", name: "Статусы операций движения материала", sections: "Движение материала",
    items: st("operacii", [["В работе", "blue"], ["Завершено", "green"]]) },
  { group: "shihta", name: "Статусы шихтовых карт", sections: "Шихтовые карты, Движение материала (выдача по шихтовой карте)",
    items: st("shihta", [["Редактирование", "blue"], ["Новая", "green"], ["Выполнена", "gray"]]) },
  { group: "gost", name: "Статусы соответствия ГОСТ", sections: "Шихтовые карты, Отчётность",
    items: st("gost", [["Соответствует", "green"], ["Не соответствует", "red"]]) },
  { group: "podotchet", name: "Статусы подотчётника", sections: "Подотчётники",
    items: st("podotchet", [["В работе", "yellow"]]) },
  { group: "polzovateli", name: "Статусы пользователей", sections: "Администрирование",
    items: st("polzovateli", [["Активен", "green"], ["Заблокирован", "red"]]) },
  { group: "zhurnal", name: "Статусы позиций в журнале событий", sections: "Логирование",
    items: st("zhurnal", [["Новая", "green"], ["Изменена", "blue"], ["Без изменений", "green"], ["Удалена", "red"], ["Объединена", "purple"], ["Преобразована", "purple"], ["Исчезла", "red"]]) },
  { group: "mesta-hraneniya", name: "Статусы мест хранения", sections: "Справочники → Места хранения",
    items: st("mesta-hraneniya", [["Доступно", "green"], ["Заблокировано", "red"]]) },
  { group: "zapisi-spravochnikov", name: "Статусы записей справочников", sections: "Справочники",
    items: st("zapisi-spravochnikov", [["Активно", "green"], ["Неактивно", "gray"]]) },
];

// Тип документа, единственно допустимый для вида операции «Анализ в ЛКИ».
export const DOC_TYPE_LKI = "Накладная в ЛКИ";
// Вид операции «НИОКР» — только тип «Выдача» и только «Накладная на выдачу ДМ».
export const DOC_TYPE_NIOKR = "Накладная на выдачу ДМ";

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
  { code: "Сл", name: "Слиток" },
  { code: "Гр", name: "Гранулы" },
  { code: "Пдк", name: "Подкат" },
  { code: "Пл", name: "Пластина" },
  { code: "Прв", name: "Проволока" },
  { code: "Крт", name: "Карточка" },
  { code: "Прп", name: "Припой" },
  { code: "ОП", name: "Основная проба" },
  { code: "КП", name: "Контрольная проба" },
  { code: "ПФ", name: "Полуфабрикат" },
  { code: "ПФЗ", name: "Полуфабрикат заготовки" },
  { code: "Кмп", name: "Комплектующие" },
  { code: "НПЗ", name: "НП заготовки" },
  { code: "НПЧ", name: "НП чеканки" },
  { code: "НП", name: "НП прочее" },
  { code: "ГП", name: "Готовая продукция" },
  { code: "ОЭ", name: "Образец-эталон" },
  { code: "Плт", name: "Палитра (образцы)" },
  { code: "ПФЛ", name: "Перфолента" },
  { code: "Стр", name: "Стружка" },
  { code: "Отх", name: "Отходы" },
  { code: "ХК", name: "Хвост-козёл" },
  { code: "Крл", name: "Королёк" },
  { code: "Шл", name: "Шлам" },
  { code: "ХлС", name: "Хлорид серебра" },
  { code: "Скр", name: "Скрап" },
  { code: "ОШ", name: "Остатки шихты" },
  { code: "Эл", name: "Электролит" },
  { code: "ДК", name: "Драгоценные камни" },
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
  { id: "sl-9", sklad: "Склад ДМ №1", seyfNum: "1", polkaNum: "1", code: "СДМ1-С1-П1", available: true },
  { id: "sl-10", sklad: "Склад ДМ №1", seyfNum: "1", polkaNum: "2", code: "СДМ1-С1-П2", available: true },
  { id: "sl-11", sklad: "Склад ДМ №1", seyfNum: "2", polkaNum: "1", code: "СДМ1-С2-П1", available: true },
  { id: "sl-12", sklad: "Склад ДМ №1", seyfNum: "2", polkaNum: "2", code: "СДМ1-С2-П2", available: true },
  { id: "sl-13", sklad: "Склад ДМ №1", seyfNum: "3", polkaNum: "1", code: "СДМ1-С3-П1", available: true },
  { id: "sl-14", sklad: "Склад ДМ №1", seyfNum: "3", polkaNum: "2", code: "СДМ1-С3-П2", available: true },
  { id: "sl-1", sklad: "Склад ДМ №2", seyfNum: "1", polkaNum: "1", code: "СДМ2-С1-П1", available: true },
  { id: "sl-2", sklad: "Склад ДМ №2", seyfNum: "1", polkaNum: "2", code: "СДМ2-С1-П2", available: true },
  { id: "sl-3", sklad: "Склад ДМ №2", seyfNum: "2", polkaNum: "1", code: "СДМ2-С2-П1", available: true },
  { id: "sl-4", sklad: "Склад ДМ №2", seyfNum: "2", polkaNum: "2", code: "СДМ2-С2-П2", available: false },
  { id: "sl-5", sklad: "Склад ДМ №2", seyfNum: "3", polkaNum: "1", code: "СДМ2-С3-П1", available: true },
  { id: "sl-6", sklad: "Склад ДМ №2", seyfNum: "3", polkaNum: "2", code: "СДМ2-С3-П2", available: true },
  { id: "sl-7", sklad: "Склад ДМ №2", seyfNum: "4", polkaNum: "1", code: "СДМ2-С4-П1", available: true },
  { id: "sl-8", sklad: "Склад ДМ №2", seyfNum: "4", polkaNum: "2", code: "СДМ2-С4-П2", available: true },
];

// Класс, по которому позиция относится к складу ГП; все остальные классы — склад ДМ.
export const GP_KLASS = "Готовая продукция";
export const isGPKlass = (klass: string) => klass === GP_KLASS;

// --- Химический состав (справочник элементов) ---
// Блоки «Химический состав» строятся по этому справочнику: в формах позиций ДМ — элементы
// с признаком «Отображать в ДМ», в шихтовых картах — с признаком «Отображать в ШК».
export interface ChemElement {
  id: string;
  name: string;
  shortName: string;
  showDm: boolean;
  showShk: boolean;
}

// --- Допустимые отклонения от массы ---
// Для металла (элемент справочника «Химический состав») и диапазона массы взвешивания [minKg; maxKg) — допуск вверх / вниз, г
export interface MassTolerance {
  id: string;
  metal: string;
  minKg: number;
  maxKg: number;
  plusG: number;
  minusG: number;
}

const tol = (metal: string, minKg: number, maxKg: number, g: number): MassTolerance =>
  ({ id: `tol-${metal}-${minKg}`, metal, minKg, maxKg, plusG: g, minusG: g });

export const initialMassTolerances: MassTolerance[] = [
  tol("au", 0, 0.2, 0.02), tol("au", 0.2, 1, 0.03), tol("au", 1, 10, 0.3), tol("au", 10, 20, 0.5), tol("au", 20, 50, 1.2),
  tol("ag", 0, 0.2, 0.2), tol("ag", 0.2, 1, 0.2), tol("ag", 1, 10, 0.3), tol("ag", 10, 20, 0.5), tol("ag", 20, 50, 1.2),
];

// Допуск для массы взвешивания (г) по металлу; диапазон включает нижнюю границу, верхняя — у последнего диапазона
export function findMassTolerance(list: MassTolerance[], metal: string, massG: number): MassTolerance | undefined {
  const kg = massG / 1000;
  const ranges = list.filter(t => t.metal === metal).sort((a, b) => a.minKg - b.minKg);
  return ranges.find((t, i) => kg >= t.minKg && (kg < t.maxKg || (i === ranges.length - 1 && kg <= t.maxKg)));
}

// Значения химического состава позиции, г: id элемента → масса («-» или пусто — нет данных)
export type ChemComposition = Record<string, string>;

export const initialChemElements: ChemElement[] = [
  { id: "au", name: "Золото", shortName: "Au", showDm: true, showShk: false },
  { id: "ag", name: "Серебро", shortName: "Ag", showDm: true, showShk: true },
  { id: "pd", name: "Палладий", shortName: "Pd", showDm: true, showShk: false },
  { id: "rh", name: "Родий", shortName: "Rh", showDm: true, showShk: false },
  { id: "pt", name: "Платина", shortName: "Pt", showDm: true, showShk: false },
  { id: "ir", name: "Иридий", shortName: "Ir", showDm: false, showShk: false },
  { id: "cu", name: "Медь", shortName: "Cu", showDm: false, showShk: true },
  { id: "p", name: "Фосфор", shortName: "P", showDm: false, showShk: true },
  { id: "fe", name: "Железо", shortName: "Fe", showDm: false, showShk: true },
  { id: "pb", name: "Свинец", shortName: "Pb", showDm: false, showShk: true },
  { id: "sb", name: "Сурьма", shortName: "Sb", showDm: false, showShk: true },
  { id: "bi", name: "Висмут", shortName: "Bi", showDm: false, showShk: true },
  { id: "te", name: "Теллур", shortName: "Te", showDm: false, showShk: false },
  { id: "zn", name: "Цинк", shortName: "Zn", showDm: false, showShk: false },
  { id: "cd", name: "Кадмий", shortName: "Cd", showDm: false, showShk: false },
  { id: "sn", name: "Олово", shortName: "Sn", showDm: false, showShk: false },
  { id: "ni", name: "Никель", shortName: "Ni", showDm: false, showShk: false },
  { id: "si", name: "Кремний", shortName: "Si", showDm: false, showShk: false },
  { id: "mg", name: "Магний", shortName: "Mg", showDm: false, showShk: false },
  { id: "mn", name: "Марганец", shortName: "Mn", showDm: false, showShk: false },
  { id: "cr", name: "Хром", shortName: "Cr", showDm: false, showShk: false },
  { id: "co", name: "Кобальт", shortName: "Co", showDm: false, showShk: false },
  { id: "as", name: "Мышьяк", shortName: "As", showDm: false, showShk: false },
  { id: "se", name: "Селен", shortName: "Se", showDm: false, showShk: false },
];
