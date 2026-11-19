import React, { useMemo, useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, usePerPage, FillerRows, fillerCount, PageHeader,
  useToast, Toast, Field, Input, Select, Textarea, KlassCode, MultiFileUpload, useConfirm, ConfirmDialog,
  SortTh, useSort, parseRuDate, usePaged, CREATED_LABEL, CreatedCell, useMaterialCodeLabel,
  OborotValue, oborotRowCls, OBOROT_LABEL,
} from "../components/ui";
import {
  ShihtovayaKarta, ShihtaMaterial, ShihtaMatKind, DMItem, ChemComposition, AlloyGrade, isGPKlass, isStoneKlass, STONE_KLASS,
  PRIHOD_SKLAD, SGP, spravValues, minAffinageOf, NAZN_PROOF, STRUZHKA_KLASS, spravochniki, DOP_TYPE_CUP, DOP_TYPE_MED_MO, DOP_DICT, dopDefaultPct,
  PrikazPlavka, oborotHint, oborotOver, oborotLimit,
} from "../data/mock";
import { returnToStock } from "../data/stock";
import {
  ShihtaCalc, ShihtaLine, chemStrings, fmt2, fmtFact, normText, r2, shareOf, shihtaWarnings, lineChem, kindOf,
  normCell, impuritiesText, fmtNorm, restNorm, REST_HINT, prikazStatus, itogoMaterials, lineOfMaterial, prikazGrade, isSkladMaterial,
  shihtaOborot, oborotHintText, oborotWarnings, oborotInfoText, kartaOborot,
} from "../data/shihta";
import ChemCompositionBlock from "../components/ChemCompositionBlock";
import { ChemPercent, gramsFrom, num0, pctFrom, pctSum } from "../data/chem";
import StockPickerModal, { StockRow } from "../components/StockPickerModal";
import { Plus, X, Calculator, AlertTriangle, Sigma, Info, RotateCcw } from "lucide-react";
import { useScreen } from "../router";

// ── Шихтовая карта: конструктор ─────────────────────────────────────────────────
// Технолог выбирает марку сплава, добавляет материалы со склада ДМ и доп. материалы; состав рассчитывается
// (data/shihta.ts) и сверяется с нормой марки. Резерв позиций склада ставится при «Сохранить»,
// «Оформить» переводит карту в «Новая» (доступна для выдачи на плавку).

// Строка шихтовых материалов в конструкторе
interface MatRow {
  key: string;
  kind: ShihtaMatKind;
  mat: string;
  nomenkl: string;
  klass: string;
  // Проба позиции, ‰ (99,99 % = 999,9)
  proba: number;
  // Код материала позиции склада (справочник «Коды материалов»)
  code?: string;
  qty: number;
  loc: string;
  sklad?: string;
  // Доли элементов в материале (0..1)
  share: Record<string, number>;
  // Лигатура Cu-P: фосфор, %
  phosphorPct?: number;
  // Вес лигат. в шихту, г: у позиции склада — лигатурный вес всей позиции (берётся целиком), у доп. материала — из окна доп. материала
  ves: string;
  // id позиции склада ДМ, выбранной в этой сессии — резервируется целиком при сохранении карты
  srcId?: string;
  // Оборот позиции склада (у доп. материалов — нет, в расчёте оборота шихты — 0)
  oborot?: number;
}

let rowSeq = 0;
const newKey = () => `mr-${Date.now()}-${rowSeq++}`;
const num = (v: string | undefined) => {
  const n = parseFloat((v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const str2 = (v: number) => r2(v).toFixed(2).replace(".", ",");
const probaPctText = (proba: number) => (proba > 0 ? (proba / 10).toFixed(2).replace(".", ",") : "");
const isWeightPart = (it: { id: string }) => /-rw\d+$/.test(it.id);

// Строка из сохранённой карты
const toRow = (m: ShihtaMaterial, dm: DMItem[]): MatRow => {
  const kind = kindOf(m);
  const rez = kind === "sklad" && m.nomenkl ? dm.find(i => i.nomenkl === m.nomenkl && i.status === "Резерв") : undefined;
  return {
    key: newKey(), kind, mat: m.name, nomenkl: m.nomenkl, klass: m.klass, proba: m.proba, qty: m.qty ?? 1, loc: m.loc,
    code: m.code ?? (m.nomenkl ? dm.find(i => i.nomenkl === m.nomenkl)?.metal : undefined),
    sklad: rez?.sklad ?? m.sklad, share: shareOf(m.chem, m.ves), phosphorPct: m.phosphorPct, ves: str2(m.ves),
    ...(kind === "sklad" ? { oborot: m.oborot ?? (m.nomenkl ? dm.find(i => i.nomenkl === m.nomenkl)?.oborot : undefined) ?? 0 } : {}),
  };
};

// Строки конструктора в виде материалов карты — для расчёта оборота шихты
const asMaterials = (rows: MatRow[]): ShihtaMaterial[] =>
  rows.map(m => ({ kind: m.kind, name: m.mat, nomenkl: m.nomenkl, klass: m.klass, proba: m.proba, ves: num(m.ves), loc: m.loc, code: m.code, oborot: m.oborot }));

const lineOf = (m: MatRow): ShihtaLine => ({ kind: m.kind, mass: num(m.ves), share: m.share, phosphorPct: m.phosphorPct, klass: m.klass });

// Ошибка массы в шихту (пусто — масса корректна). Блокирует сохранение карты.
const massError = (m: MatRow): string => {
  const v = num(m.ves);
  if (!(v > 0)) return `Вес лигат. в шихту не указан: ${m.mat}`;
  return "";
};

// Строка карты из позиции склада: позиция берётся целиком — все изделия, масса в шихту = лигатурный вес позиции
const stockRowOf = (it: DMItem, key = newKey()): MatRow => ({
  key, kind: "sklad", mat: it.name, nomenkl: it.nomenkl, klass: it.klass, proba: it.proba, code: it.metal, qty: it.qty,
  loc: it.location, sklad: it.sklad, share: shareOf(it.chem, it.ligWeight), ves: str2(it.ligWeight), srcId: it.id,
  oborot: it.oborot ?? 0,
});

// Следующий номер плавки в году (сквозная нумерация с 1 января)
export function nextPlavkaNo(karty: ShihtovayaKarta[], year = new Date().getFullYear()): string {
  const max = karty
    .filter(k => k.date.endsWith(String(year)))
    .reduce((m, k) => Math.max(m, parseInt(k.plavkaNo, 10) || 0), 0);
  return String(max + 1);
}


// ── Резерв позиций ДМ под шихтовую карту ──
// Позиция склада (СДМ1 или СДМ2) берётся в карту целиком и целиком переводится в «Резерв» — без ввода части
// количества или веса, запись не делится. Позиции, убранные из карты, возвращаются на склад («На складе»).
// Части, выделенные ранее (старые карты с частичным резервом), при возврате объединяются с исходной записью.
function reserveDm(items: DMItem[], release: Set<string>, reserve: Set<string>): DMItem[] {
  // 1) Возврат на склад. Часть слитка по массе при объединении не добавляет изделий к исходной записи
  const wQty = new Map<string, number>();
  let out = items.map(it => {
    if (!release.has(it.id) || !isWeightPart(it)) return it;
    wQty.set(it.id, it.qty);
    return { ...it, qty: 0 };
  });
  out = returnToStock(out, release, "На складе").map(it => (wQty.has(it.id) ? { ...it, qty: wQty.get(it.id)! } : it));
  // 2) Резерв позиций целиком
  return out.map(i => (reserve.has(i.id) && i.status === "На складе" ? { ...i, status: "Резерв" as const } : i));
}

// Нарушения допуска материалов в шихту (те же правила, что при добавлении со склада)
function banReason(m: { klass: string; share: Record<string, number>; kind: ShihtaMatKind }, grade: AlloyGrade | undefined, naznachenie: string): string | null {
  if (grade?.base === "Ag" && (m.share.au ?? 0) > 0) return "В шихту серебряного сплава материалы с золотом не допускаются";
  if (naznachenie === NAZN_PROOF && m.klass === STRUZHKA_KLASS) return "Стружка в шихте для монет пруф-качества не допускается";
  return null;
}

// ── Окно «Добавить доп. материал» ──
// Одно окно для всех типов справочника «Типы доп. материалов шихты»: тип, наименование, вес лигат., состав
// (граммы / % элементов). Выбор типа подставляет его наименование и хим. состав по умолчанию (chemPct справочника,
// граммы — от введённого лигат. веса); «Прочее» — наименование вводится вручную, состав пустой.
// По коду типа определяется вид строки: лигатура Cu-P (проверка фосфора по ГОСТ), медь МО, прочее.
const dopKindOf = (type: string): ShihtaMatKind => {
  const code = spravochniki[DOP_DICT].items.find(i => i.value === type)?.code;
  return code === DOP_TYPE_CUP ? "cup" : code === DOP_TYPE_MED_MO ? "medMO" : "prochee";
};

// Тип справочника для строки при редактировании — по виду строки
const dopTypeOf = (m: MatRow, types: string[]) => types.find(t => dopKindOf(t) === m.kind) ?? types[0] ?? "";

// Наименование строки в таблицах карты: у лигатуры Cu-P — фосфор, %, если его нет в наименовании
// («Лигатура Cu-P (Фосфор 9,44%)» при P = 9,44 % — без пометки)
const cupName = (kind: ShihtaMatKind, name: string, p?: number) =>
  kind === "cup" && !name.includes(str2(p ?? 0)) ? `${name} (P = ${str2(p ?? 0)} %)` : name;

// Окно доп. материала: добавление (initial не задан) и редактирование строки карты (initial — строка).
function DopMaterialModal({ initial, onClose, onSave }: { initial?: MatRow; onClose: () => void; onSave: (row: MatRow) => void }) {
  const types = spravValues(DOP_DICT);
  const initType = initial ? dopTypeOf(initial, types) : types[0] ?? "";
  // Состав строки при редактировании (у строк без состава — расчёт лигатуры / меди), у новой — по умолчанию типа
  const initChem: ChemComposition = initial ? chemStrings(lineChem(lineOf(initial))) : {};
  const [type, setType] = useState(initType);
  const kind = dopKindOf(type);
  const [name, setName] = useState(initial ? initial.mat : kind === "prochee" ? "" : initType);
  const [ves, setVes] = useState(initial?.ves ?? "");
  const [chem, setChem] = useState<ChemComposition>(initChem);
  const [pct, setPct] = useState<ChemPercent>(() => (initial ? pctFrom(initChem, num(initial.ves)) : dopDefaultPct(initType)));
  const mass = num(ves);
  const error = !(mass > 0) ? "Укажите вес лигат."
    : !name.trim() ? "Укажите наименование материала"
    : pctSum(pct) > 100.005 ? "Сумма содержания элементов больше 100 %"
    : "";
  const decimal = (set: (v: string) => void) => (v: string) => set(v.replace(/[^\d.,]/g, ""));

  // Смена типа: наименование и состав по умолчанию из справочника («Прочее» — пустые)
  const changeType = (t: string) => {
    setType(t);
    const p = dopDefaultPct(t);
    setName(dopKindOf(t) === "prochee" ? "" : t);
    setPct(p);
    setChem(gramsFrom(p, mass));
  };

  const save = () => {
    if (error) return;
    const base = { key: initial?.key ?? newKey(), nomenkl: "", klass: "", proba: 0, qty: 1, loc: "", ves: str2(mass) };
    onSave({
      ...base, kind, mat: name.trim(), share: shareOf(chem, mass),
      // Лигатура Cu-P: фосфор, % — для проверки по ГОСТ 4515 и суммирования строк
      ...(kind === "cup" ? { phosphorPct: r2(num(pct.p)) } : {}),
    });
  };

  return (
    <Modal title={initial ? "Редактировать дополнительный материал" : "Добавить дополнительный материал"} wide onClose={onClose} footer={
      <><Btn variant="secondary" onClick={onClose}>Отмена</Btn><Btn onClick={save} disabled={!!error}>{initial ? "Сохранить" : "Добавить"}</Btn></>
    }>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Тип" required><Select value={type} options={types} onChange={changeType} /></Field>
        <Field label="Наименование материала" required>
          <Input value={name} onChange={setName} placeholder="Название" disabled={kind !== "prochee"} />
        </Field>
        <Field label="Вес лигат., г" required>
          <Input value={ves} onChange={decimal(v => { setVes(v); setChem(gramsFrom(pct, num0(v))); })} placeholder="0,00" />
        </Field>
      </div>
      <div className="mt-4">
        <ChemCompositionBlock scope="shk" value={chem} lig={mass} pct={pct} onChange={(c, pc) => { setChem(c); setPct(pc); }} />
      </div>
    </Modal>
  );
}

// Значение нормы: только число или прочерк (у элемента-остатка марки — расчётная граница, с подсказкой)
function NormValue({ v, rest = false }: { v: number | null; rest?: boolean }) {
  if (v == null) return <span className="text-gray-400" title={rest ? REST_HINT : undefined}>—</span>;
  return rest ? <span className="cursor-help" title={REST_HINT}>{fmtNorm(v)}</span> : <>{fmtNorm(v)}</>;
}

// Заголовок колонки элемента: у элемента-остатка марки — пометка «ост.» (значения в колонке остаются числами)
function ElHead({ short, rest }: { short: string; rest: boolean }) {
  return rest ? <span className="cursor-help" title={REST_HINT}>{short} <span className="text-[10px] font-normal text-gray-400">ост.</span></span> : <>{short}</>;
}

// prikaz — приказ на плавку, в который входит карта; defaults — шапка новой карты (из предыдущей карты приказа)
function ShihtaConstructor({ karta, prikaz, defaults, onClose, onSave, readOnly = false }: {
  karta?: ShihtovayaKarta | null; prikaz?: PrikazPlavka; defaults?: Partial<ShihtovayaKarta>;
  onClose: () => void; onSave: (k: ShihtovayaKarta) => void; readOnly?: boolean;
}) {
  const { currentUser, dmItems, setDmItems, chemElements, alloyGrades, shihtovyeKarty } = useApp();
  const init = karta ?? defaults;
  // Колонки «Содержание в чистоте, г» — элементы справочника с признаком «Отображать в ШК»
  const shkEls = chemElements.filter(e => e.showShk);
  const shortName = (id: string) => chemElements.find(e => e.id === id)?.shortName ?? id.toUpperCase();
  const elName = (id: string) => { const e = chemElements.find(x => x.id === id); return e ? `${e.name} (${e.shortName})` : id; };

  const [name, setName] = useState(init?.name || "");
  // Марка сплава и назначение слитков задаются в приказе на плавку — в карте приказа только для чтения
  // (у старых карт без приказа — вводятся в карте)
  const fromPrikaz = !!prikaz;
  const [ownAlloyId, setAlloyId] = useState(init?.alloyId ?? "");
  const alloyId = fromPrikaz ? prikaz.alloyId ?? init?.alloyId ?? "" : ownAlloyId;
  const [plavkaNo, setPlavkaNo] = useState(() => karta?.plavkaNo ?? nextPlavkaNo(shihtovyeKarty));
  const [ownNaznachenie, setNaznachenie] = useState(init?.naznachenie ?? "");
  const naznachenie = fromPrikaz ? prikaz.naznachenie ?? init?.naznachenie ?? "" : ownNaznachenie;
  const [note, setNote] = useState(karta?.note ?? "");
  const [materials, setMaterials] = useState<MatRow[]>(() => (karta?.materials ?? []).map(m => toRow(m, dmItems)));
  // Вложенные экраны: …/from-sklad, …/dop-material, …/raschet (результат расчёта)
  const screen = useScreen();
  const nested = (n: string) => [screen.has(n), (open: boolean) => (open ? screen.open(n) : screen.close(n))] as const;
  const [showFromSklad, setShowFromSklad] = nested("from-sklad");
  const [showAddDop, setShowAddDop] = nested("dop-material");
  // Редактируемая строка доп. материала (null — окно открыто на добавление)
  const [dopEditKey, setDopEditKey] = useState<string | null>(null);
  const dopEditRow = materials.find(m => m.key === dopEditKey && m.kind !== "sklad");
  const openDop = (key: string | null) => { setDopEditKey(key); setShowAddDop(true); };
  const closeDop = () => { setDopEditKey(null); setShowAddDop(false); };
  const showResult = screen.has("raschet");
  const setShowResult = (on: boolean) => screen.toggle("raschet", on);
  const { toast, show, clear } = useToast();
  const ro = readOnly;

  // Марки: активные + уже выбранная (даже если её сделали неактивной)
  const grade = alloyGrades.find(g => g.id === alloyId);
  const gradeOptions = ["", ...alloyGrades.filter(g => g.status === "Активно" || g.id === alloyId).map(g => g.id)];
  const gradeLabel = (id: string) => { const g = alloyGrades.find(x => x.id === id); return g ? `${g.name} (${g.nd})` : "Выберите марку"; };
  const naznOptions = ["", ...new Set([...spravValues("Назначение слитков"), ...(naznachenie ? [naznachenie] : [])])];

  // Доступные позиции для шихты — со всех складов СДМ или с выбранного склада. Позиции СДМ1
  // по требованию перемещаются на СДМ2 (резерв сохраняется); с СДМ2 карта выдаётся на плавку.
  // Склады СДМ (СГП №2 — только через выдачу со склада и «Возврат СГП №2»). Драгоценные камни в шихту не идут.
  const sklady = spravValues("Склады").filter(s => s !== SGP);
  // По умолчанию — все склады СДМ: позицию можно взять с любого склада
  const ALL_SKLADY = "Все склады";
  const [pickSklad, setPickSklad] = useState(ALL_SKLADY);
  const skladRows = useMemo<StockRow[]>(() => dmItems
    .filter(i => i.sklad !== SGP && i.status !== "Закрыта" && i.qty > 0 && !isGPKlass(i.klass) && !isStoneKlass(i.klass))
    // Чистый вес — сохранённый у позиции (тот же, по которому считается состав строки карты)
    .map(i => ({ id: i.id, src: "dm" as const, nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.metal, qty: i.qty, unit: "шт", proba: i.proba, lig: i.ligWeight, net: i.netWeight, location: i.location, sklad: i.sklad, chem: i.chem, status: i.status, oborot: i.oborot ?? 0 })),
  [dmItems]);


  // Уже взято в карту из каждой позиции склада (в этой сессии)
  const already = materials.reduce<Record<string, number>>((acc, m) => {
    if (m.srcId) acc[m.srcId] = (acc[m.srcId] ?? 0) + m.qty;
    return acc;
  }, {});

  // Позиция добавляется целиком (все изделия, весь лигатурный вес) с любого склада СДМ; повторно одна позиция не добавляется.
  // Нарушения правил допуска в шихту и превышение оборота не запрещают добавление: строка подсвечивается,
  // пояснение выводится над таблицей материалов (rowIssues)
  const addFromSklad = (picked: { row: StockRow; qty: number }[]) => {
    const items = picked.map(({ row }) => dmItems.find(i => i.id === row.id)).filter((i): i is DMItem => !!i);
    setMaterials(prev => [...prev, ...items.filter(it => !prev.some(m => m.srcId === it.id)).map(it => stockRowOf(it))]);
    setShowFromSklad(false);
    show(`Добавлено позиций: ${items.length}. Позиции резервируются целиком при сохранении карты`);
  };

  // ── Расчёт (автоматически при любом изменении строк и марки) ──
  const calc = useMemo(() => new ShihtaCalc(materials.map(lineOf), grade), [materials, grade]);
  const chemOfKey = useMemo(() => new Map(materials.map((m, i) => [m.key, calc.chems[i]])), [materials, calc]);
  const idxOfKey = useMemo(() => new Map(materials.map((m, i) => [m.key, i])), [materials]);
  const badMass = materials.filter(m => massError(m));
  // Позиции, выданные в другой операции (карта возвращена в «На редактировании»): их нужно заменить
  const issuedNomenkl = new Set((karta?.vydannyePozicii ?? []).map(v => v.nomenkl));
  const isIssued = (m: MatRow) => m.kind === "sklad" && issuedNomenkl.has(m.nomenkl);
  // Оборот шихты — расчётный: максимум оборотов материалов (без оборота — 0); проверки — только для СрМ 92,5
  const ob = useMemo(() => shihtaOborot(asMaterials(materials)), [materials]);
  // Оборот шихты редактируется всегда; по умолчанию подставляется расчётный и пересчитывается при изменении
  // материалов, пока значение не изменено вручную (ручное значение сохраняется в карте)
  const [oborotManual, setOborotManual] = useState<string | null>(() => {
    if (!karta?.oborot || !/^\d+$/.test(karta.oborot.trim())) return null;
    return karta.oborot.trim() !== String(shihtaOborot(karta.materials).max) ? karta.oborot.trim() : null;
  });
  const oborotValue = oborotManual ?? String(ob.max);
  const oborotManualSet = oborotManual !== null && oborotManual !== String(ob.max);
  // Пустое поле — расчётное значение
  const oborotNum = oborotValue.trim() === "" ? ob.max : parseInt(oborotValue, 10) || 0;
  const oborotInfo = oborotInfoText(ob, grade);
  // Предупреждения — подсказки, оформление не блокируют; пересчитываются при любом изменении карты
  const warnings = [
    ...shihtaWarnings(calc, { minAffinage: minAffinageOf(naznachenie) }),
    // Предельный оборот позиций — в замечаниях по строкам над таблицей (rowIssues)
  ];
  // Замечания по строкам материалов (над таблицей, строка подсвечивается): нарушение правил допуска в шихту,
  // достигнутый предельный оборот, позиция выдана в другой операции
  const issuesOf = (m: MatRow): string[] => [
    ...(isIssued(m) ? ["выдана в другой операции — замените позицию"] : []),
    ...(banReason(m, grade, naznachenie) ? [banReason(m, grade, naznachenie)!] : []),
    ...(m.kind === "sklad" && oborotOver(m.oborot ?? 0, m.code)
      ? [`оборот ${m.oborot ?? 0} — достигнут предельный (${oborotLimit(m.code) ?? "—"}), рекомендуется передать на аффинаж`] : []),
  ];
  const rowIssues = materials.map(m => ({ m, issues: issuesOf(m) })).filter(x => x.issues.length > 0);
  // Норма элемента в строках «Норма мин / макс»: число — из диапазона или предела примеси; элемент-остаток — расчётная граница (restNorm)
  const normOf = (e: string, k: "min" | "max") => {
    const c = normCell(grade, e);
    if (!c) return null;
    if (c.kind === "rest") return restNorm(grade, k);
    if (c.kind === "impurity") return k === "max" ? c.max : null;
    return c[k] ?? null;
  };
  const impText = impuritiesText(grade, shkEls.map(e => e.id), shortName);

  const pctCell = (e: string) => {
    // Фосфор выгорает и в базу не входит — его доля не показывается
    if (e === "p") return "—";
    const t = calc.total(e);
    if (!(t > 0) || calc.base <= 0) return "—";
    return fmt2(calc.pct(e));
  };

  // Причина, по которой карту нельзя оформить
  const failText = calc.failed.map(c => `${shortName(c.element)} ${fmtFact(c)} % при норме ${normText(c)}`).join("; ");
  const oformitBlock: string | null =
    materials.length === 0 ? "Добавьте хотя бы один материал"
    : !grade ? (fromPrikaz ? "Укажите марку сплава в приказе на плавку" : "Выберите марку сплава")
    : !naznachenie ? (fromPrikaz ? "Укажите назначение слитков в приказе на плавку" : "Выберите назначение слитков")
    : !plavkaNo.trim() ? "Укажите номер плавки"
    : materials.some(isIssued) ? "Замените позиции, выданные в другой операции"
    : calc.complies ? null
    : !grade.allowDeviation ? `Состав не соответствует марке ${grade.name}: ${failText}`
    : !note.trim() ? `Состав не соответствует марке ${grade.name}: ${failText}. Для марки допускается отклонение — заполните «Примечание»`
    : null;

  const { sorted: sortedMaterials, sort: matSort, toggleSort: toggleMatSort } = useSort(materials, {
    nomenkl: m => m.nomenkl,
    mat: m => m.mat,
    code: m => m.code ?? "",
    proba: m => m.proba,
    loc: m => m.loc,
    oborot: m => m.oborot ?? -1,
    sklad: m => m.sklad ?? "",
    klass: m => m.klass,
    ves: m => num(m.ves),
    ...Object.fromEntries(shkEls.map(e => [`el-${e.id}`, (m: MatRow) => chemOfKey.get(m.key)?.[e.id] ?? 0])),
    dola: m => num(m.ves),
  });

  // Сохранить — карта «На редактировании», позиции склада резервируются (убранные — снимаются с резерва).
  // Оформление — в приказе на плавку: «Оформить» приказа переводит все его карты в «Новая».
  const save = () => {
    if (badMass.length) { show(massError(badMass[0])); return; }
    // Выбранные позиции склада должны быть всё ещё на складе (резервируются целиком)
    const reserve = new Set(materials.filter(m => m.srcId).map(m => m.srcId!));
    const lacking = [...reserve].filter(id => dmItems.find(i => i.id === id)?.status !== "На складе");
    if (lacking.length) {
      show(`Позиции уже недоступны на складе: ${lacking.map(id => materials.find(m => m.srcId === id)?.mat).join(", ")}`);
      return;
    }
    // Позиции, убранные из карты, снимаются с резерва
    const kept = new Set(materials.map(m => m.nomenkl));
    const releaseNomenkl = new Set((karta?.materials ?? []).map(m => m.nomenkl).filter(n => n && !kept.has(n)));
    const release = new Set(dmItems.filter(i => i.status === "Резерв" && releaseNomenkl.has(i.nomenkl)).map(i => i.id));
    if (reserve.size || release.size) setDmItems(prev => reserveDm(prev, release, reserve));

    const mats: ShihtaMaterial[] = materials.map((m, i) => ({
      kind: m.kind, name: m.mat, nomenkl: m.nomenkl, klass: m.klass, proba: m.proba, ves: r2(num(m.ves)), loc: m.loc, qty: m.qty,
      chem: chemStrings(calc.chems[i]), phosphorPct: m.phosphorPct, sklad: m.sklad, code: m.code,
      ...(m.kind === "sklad" ? { oborot: m.oborot ?? 0 } : {}),
    }));
    const head = {
      name: name.trim() || karta?.name || "Новая шихтовая карта",
      plavkaNo: plavkaNo.trim(), alloyId: alloyId || undefined, oborot: String(oborotNum), naznachenie, note: note.trim(),
      // Дата, основание и документы в конструкторе не редактируются: дата — дата создания карты,
      // основание — приказ, документы прикрепляются к приказу на плавку
      osnovanie: (init?.osnovanie ?? "").trim(),
      date: karta?.date || new Date().toLocaleDateString("ru-RU"),
      materials: mats,
    };
    // Пометка о выданных позициях остаётся, пока такие позиции есть в карте
    const status = "На редактировании" as const;
    const stillIssued = (karta?.vydannyePozicii ?? []).filter(v => materials.some(m => isIssued(m) && m.nomenkl === v.nomenkl));
    const k: ShihtovayaKarta = karta
      ? { ...karta, ...head, status, vydannyePozicii: stillIssued.length ? stillIssued : undefined }
      : {
        id: `sk-${Date.now()}`, ...head, status, prikazId: prikaz?.id,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.fullName || currentUser?.name || "—",
      };
    onSave(k);
  };

  const codeLabel = useMaterialCodeLabel();
  // Наименование строки: у лигатуры — с содержанием фосфора
  const matName = (m: MatRow) => cupName(m.kind, m.mat, m.phosphorPct);
  const dash = <span className="text-gray-400">—</span>;
  // Колонки атрибутов позиции (до «Массы в шихту»)
  const LEAD = 8;
  const cols = LEAD + 1 + shkEls.length + 1 + (ro ? 0 : 1);
  const pg9 = usePaged(sortedMaterials, "shihta-materials");
  return (
    <Modal
      title="Конструктор шихтовой карты"
      onClose={onClose}
      fullWide
      footer={ro ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn> : (
        <div className="w-full">
          {/* Зона сообщений: ошибки массы блокируют сохранение, причина — оформление */}
          {(badMass.length > 0 || (oformitBlock && materials.length > 0)) && (
            <div className="mb-3 space-y-1 text-xs">
              {badMass.map(m => <div key={m.key} className="text-red-600">⛔ {massError(m)}</div>)}
              {oformitBlock && materials.length > 0 && <div className="text-orange-700">Карта не готова к оформлению приказа: {oformitBlock}</div>}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
            <Btn onClick={() => save()} disabled={badMass.length > 0}>Сохранить</Btn>
          </div>
        </div>
      )}
    >
      {prikaz && (
        <div className="mb-4 text-sm text-gray-600">
          Приказ на плавку № <span className="font-medium text-gray-900">{prikaz.number}</span> от {prikaz.date}
          <span className="text-gray-400"> · {prikaz.name}</span>
        </div>
      )}
      {karta && (
        <div className="flex items-center gap-2 mb-4">
          <Badge label={karta.status} group="shihta" />
          {karta.status === "Новая" && <span className="text-xs text-gray-500">Приказ оформлен — карта доступна для выдачи на плавку, редактирование закрыто</span>}
          {karta.status === "На редактировании" && !karta.vydannyePozicii?.length && <span className="text-xs text-gray-500">Карта сохранена — оформляется вместе с приказом на плавку (кнопка «Оформить» в приказе)</span>}
        </div>
      )}
      {karta?.status === "На редактировании" && !!karta.vydannyePozicii?.length && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-sm text-red-800 space-y-1">
          {karta.vydannyePozicii.map(v => (
            <div key={v.nomenkl}>⚠ Позиция {v.name}, № {v.nomenkl} выдана в другой операции ({v.doc}) — замените позицию и оформите карту</div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-5">
        <Field label="Наименование" required={!ro} full><Input value={name} onChange={setName} placeholder="Наименование шихты" disabled={ro} /></Field>
        <Field label={fromPrikaz ? "Марка сплава (из приказа)" : "Марка сплава"} required={!ro && !fromPrikaz} full>
          <Select value={alloyId} options={gradeOptions} optionLabel={gradeLabel} onChange={setAlloyId} disabled={ro || fromPrikaz} />
        </Field>
        <Field label="Номер плавки" required={!ro}><Input value={plavkaNo} onChange={v => setPlavkaNo(v.replace(/[^\d]/g, ""))} placeholder="1" disabled={ro} /></Field>
        {/* Оборот шихты — расчётный (максимум оборотов материалов), не редактируется */}
        {/* Оборот шихты: по умолчанию — расчётный (максимум оборотов материалов), можно изменить вручную */}
        <Field label="Оборот">
          <div
            className={`relative ${oborotOver(oborotNum, grade?.materialCode) ? "rounded-lg ring-1 ring-red-400" : ""}`}
            title={[
              oborotManualSet ? `Изменён вручную, расчётный оборот — ${ob.max}` : "Расчётный оборот — максимум оборотов материалов шихты",
              oborotHintText(ob),
              oborotOver(oborotNum, grade?.materialCode) ? oborotHint(grade?.materialCode) : "",
            ].filter(Boolean).join("\n")}
          >
            <Input value={oborotValue} onChange={v => setOborotManual(v.replace(/[^\d]/g, ""))} placeholder={String(ob.max)} disabled={ro} />
            {/* Ручное значение: вернуть расчётный оборот */}
            {!ro && oborotManualSet && (
              <button type="button" onClick={() => setOborotManual(null)} title={`Подставить расчётный оборот (${ob.max})`} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </Field>
        <Field label={fromPrikaz ? "Назначение слитков (из приказа)" : "Назначение слитков"} required={!ro && !fromPrikaz}>
          <Select value={naznachenie} options={naznOptions} optionLabel={v => v || "Не выбрано"} onChange={setNaznachenie} disabled={ro || fromPrikaz} />
        </Field>
        <Field label="Примечание" full><Textarea value={note} onChange={setNote} rows={2} placeholder={grade?.allowDeviation ? "Обязательно при отклонении состава от марки" : ""} disabled={ro} /></Field>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Шихтовые материалы</h3>
          {!ro && (
            <div className="flex gap-2">
              <Btn size="sm" onClick={() => setShowFromSklad(true)}><Plus className="w-4 h-4" />Добавить со склада</Btn>
              <Btn size="sm" variant="secondary" onClick={() => openDop(null)}><Plus className="w-4 h-4" />Добавить доп. материал</Btn>
            </div>
          )}
        </div>

        {/* Замечания по позициям: строки добавлены, но не соответствуют правилам — подсвечены в таблице */}
        {rowIssues.length > 0 && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-800 space-y-1">
            {rowIssues.map(({ m, issues }) => (
              <div key={m.key} className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span><span className="font-medium">{matName(m)}{m.nomenkl ? `, № ${m.nomenkl}` : ""}</span> — {issues.join("; ")}</span>
              </div>
            ))}
          </div>
        )}

        {materials.length === 0 ? (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 mb-4 text-center border border-dashed border-gray-200">
            Нет материалов. Нажмите «+ Добавить со склада»
          </div>
        ) : (
          <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              {shkEls.length > 0 && (
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th colSpan={LEAD + 1}></th>
                  <th colSpan={shkEls.length} className="px-3 pt-2 pb-1 text-center font-medium uppercase tracking-wide border-b border-gray-200">Содержание в чистоте, г</th>
                  <th colSpan={ro ? 1 : 2}></th>
                </tr>
              )}
              <tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200 whitespace-nowrap">
                <SortTh sortKey="nomenkl" sort={matSort} onSort={toggleMatSort} className="px-3 py-2">Номенкл. №</SortTh>
                <SortTh sortKey="mat" sort={matSort} onSort={toggleMatSort} className="px-3 py-2">Наименование</SortTh>
                <SortTh sortKey="klass" sort={matSort} onSort={toggleMatSort} className="px-3 py-2">Класс</SortTh>
                <SortTh sortKey="code" sort={matSort} onSort={toggleMatSort} className="px-3 py-2">Код материала</SortTh>
                <SortTh sortKey="proba" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Проба, %</SortTh>
                <SortTh sortKey="sklad" sort={matSort} onSort={toggleMatSort} className="px-3 py-2">Склад</SortTh>
                <SortTh sortKey="loc" sort={matSort} onSort={toggleMatSort} className="px-3 py-2">Место хранения</SortTh>
                <SortTh sortKey="oborot" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">{OBOROT_LABEL}</SortTh>
                <SortTh sortKey="ves" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Вес лигат. г (в шихту)</SortTh>
                {shkEls.map(e => (
                  <SortTh key={e.id} sortKey={`el-${e.id}`} sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2"><ElHead short={e.shortName} rest={grade?.rest === e.id} /></SortTh>
                ))}
                <SortTh sortKey="dola" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Доля, %</SortTh>
                {!ro && <th className="w-16"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pg9.pageItems.map(m => {
                const ch = chemOfKey.get(m.key) ?? {};
                const sklad = m.kind === "sklad";
                // Строка с замечаниями (правила допуска, оборот, выдана) — светло-красная; текст замечаний — над таблицей
                const bad = issuesOf(m).length > 0;
                return (
                  <tr key={m.key} className={bad ? "bg-red-50 hover:bg-red-100/60" : "hover:bg-gray-50"}>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{m.nomenkl || dash}</td>
                    <td className="px-3 py-2 font-medium">{matName(m)}</td>
                    <td className="px-3 py-2">{m.klass ? <KlassCode value={m.klass} /> : dash}</td>
                    <td className="px-3 py-2 text-blue-600 whitespace-nowrap">{m.code ? codeLabel(m.code) : dash}</td>
                    <td className="px-3 py-2 text-right">{sklad && m.proba > 0 ? probaPctText(m.proba) : dash}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{m.sklad ?? dash}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{sklad && m.loc && m.loc !== "-" ? m.loc : dash}</td>
                    {/* Оборот — у позиций склада; доп. материалы без оборота (в расчёте — 0) */}
                    <td className="px-3 py-2 text-right">{sklad ? <OborotValue value={m.oborot} code={m.code} /> : dash}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {/* Вес в таблице не редактируется: позиция склада берётся целиком (вес позиции),
                          вес доп. материала меняется в окне редактирования (карандаш) */}
                      <span title={sklad ? "Позиция берётся целиком" : undefined}>
                        {str2(num(m.ves))}
                        {sklad && m.qty > 1 && <span className="block text-xs font-normal text-gray-400">{m.qty} шт</span>}
                      </span>
                    </td>
                    {shkEls.map(e => (
                      <td key={e.id} className="px-3 py-2 text-right text-gray-600">{(ch[e.id] ?? 0) > 0 ? str2(ch[e.id]) : "—"}</td>
                    ))}
                    <td className="px-3 py-2 text-right text-blue-600">{fmt2(calc.dola(idxOfKey.get(m.key) ?? 0))}</td>
                    {!ro && <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {/* Доп. материал правится целиком: тип, фосфор лигатуры, наименование и состав «Прочего» */}
                        {!sklad && <EditIcon onClick={() => openDop(m.key)} title="Редактировать строку" />}
                        <button onClick={() => setMaterials(prev => prev.filter(x => x.key !== m.key))} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Убрать из карты"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>}
                  </tr>
                );
              })}
              <FillerRows count={pg9.fill} cols={cols} />
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50 text-sm divide-y divide-gray-200">
              <tr className="font-medium">
                <td className="px-3 py-2" colSpan={LEAD}>Вес лигат. шихты, г <span className="text-xs font-normal text-gray-400">({materials.length} поз.)</span></td>
                <td className="px-3 py-2 text-right font-semibold">{str2(calc.mass)}</td>
                {shkEls.map(e => <td key={e.id} className="px-3 py-2 text-right text-gray-400">—</td>)}
                <td className="px-3 py-2 text-right text-blue-600">100,00</td>
                {!ro && <td></td>}
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium" colSpan={LEAD}>Содержание в шихте, г</td>
                <td className="px-3 py-2 text-right text-gray-400">—</td>
                {shkEls.map(e => <td key={e.id} className="px-3 py-2 text-right">{calc.total(e.id) > 0 ? str2(calc.total(e.id)) : "—"}</td>)}
                <td colSpan={ro ? 1 : 2}></td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium" colSpan={LEAD}>Содержание в шихте, % <span className="text-xs font-normal text-gray-400">(к массе без фосфора {str2(calc.base)} г)</span></td>
                <td className="px-3 py-2 text-right text-gray-400">—</td>
                {shkEls.map(e => {
                  const v = pctCell(e.id);
                  // Элемент-остаток марки — та же расчётная доля числом, пояснение в подсказке
                  if (grade?.rest === e.id) return <td key={e.id} className={`px-3 py-2 text-right cursor-help ${v === "—" ? "text-gray-400" : "font-semibold"}`} title={REST_HINT}>{v}</td>;
                  return <td key={e.id} className={`px-3 py-2 text-right ${v === "—" ? "text-gray-400" : "font-semibold"}`}>{v}</td>;
                })}
                <td colSpan={ro ? 1 : 2}></td>
              </tr>
              {grade && (["min", "max"] as const).map(k => (
                <tr key={k} className="text-gray-600">
                  <td className="px-3 py-2 font-medium" colSpan={LEAD}>{k === "min" ? "Норма мин, %" : "Норма макс, %"} <span className="text-xs font-normal text-gray-400">({grade.name})</span></td>
                  <td className="px-3 py-2 text-right text-gray-400">—</td>
                  {shkEls.map(e => <td key={e.id} className="px-3 py-2 text-right"><NormValue v={normOf(e.id, k)} rest={grade?.rest === e.id} /></td>)}
                  <td colSpan={ro ? 1 : 2}></td>
                </tr>
              ))}
              {grade && impText && (
                <tr className="text-gray-600">
                  <td className="px-3 py-2 text-xs" colSpan={cols}>Примеси, не более, % <span className="text-gray-400">({grade.nd})</span>: {impText}</td>
                </tr>
              )}
            </tfoot>
          </table>
          {pg9.pager}
          </div>
        )}

        {!ro && (
          <div className="flex gap-2">
            <Btn size="sm" variant="secondary" onClick={() => { setShowResult(true); show("Расчёт обновлён"); }}>
              <Calculator className="w-4 h-4" /> Рассчитать
            </Btn>
          </div>
        )}

        {(showResult || ro || materials.length > 0) && (
          <div className="mt-4">
            {warnings.map(w => (
              <div key={w} className="mb-2 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{w}
              </div>
            ))}
            {/* Разные обороты материалов — информация, оформление не блокирует */}
            {oborotInfo && (
              <div className="mb-2 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />{oborotInfo}
              </div>
            )}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {grade ? `Соответствие марке ${grade.name} (${grade.nd})` : "Соответствие марке"}
              </div>
              {!grade ? (
                <div className="px-4 py-3 text-sm text-gray-500">Выберите марку сплава — состав будет сверен с её нормой</div>
              ) : calc.checks.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">Добавьте материалы для расчёта</div>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-2 text-left font-medium">Элемент</th>
                    <th className="px-4 py-2 text-right font-medium">Факт, %</th>
                    <th className="px-4 py-2 text-right font-medium">Норма мин, %</th>
                    <th className="px-4 py-2 text-right font-medium">Норма макс, %</th>
                    <th className="px-4 py-2 text-left font-medium">Результат</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {calc.checks.map(c => (
                      <tr key={c.element}>
                        <td className="px-4 py-3 font-medium text-gray-900">{elName(c.element)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${c.ok ? "text-gray-900" : "text-red-600"}`}>{fmtFact(c)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{c.min != null ? fmt2(c.min) : "—"}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{c.max != null ? fmtNorm(c.max) : "—"}</td>
                        <td className="px-4 py-3"><Badge label={c.ok ? "Соответствует" : "Не соответствует"} group="gost" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {grade && !calc.complies && calc.checks.length > 0 && (
                <div className={`px-4 py-2 text-xs border-t border-gray-100 ${grade.allowDeviation ? "text-orange-700 bg-orange-50" : "text-red-700 bg-red-50"}`}>
                  {grade.allowDeviation
                    ? "Для марки допускается отклонение — карту можно оформить при заполненном «Примечании»"
                    : "Оформление недоступно: состав не соответствует марке"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showFromSklad && (
        <StockPickerModal
          title="Добавить материал со склада"
          toolbar={
            <div className="w-64">
              <Field label="Склад" required><Select value={pickSklad} options={[ALL_SKLADY, ...sklady]} onChange={setPickSklad} /></Field>
            </div>
          }
          rows={skladRows}
          skladFilter={pickSklad === ALL_SKLADY ? undefined : pickSklad}
          showSklad
          already={already}
          showWeights
          probaPct
          withStatus
          excludeKlass={[STONE_KLASS]}
          emptyText={pickSklad === ALL_SKLADY ? "Нет доступных позиций на складах" : `Нет доступных позиций на складе «${pickSklad}»`}
          addLabel="Добавить выбранные"
          onClose={() => setShowFromSklad(false)}
          onAdd={addFromSklad}
        />
      )}

      {showAddDop && (
        <DopMaterialModal
          key={dopEditRow?.key ?? "new"}
          initial={dopEditRow}
          onClose={closeDop}
          onSave={row => {
            setMaterials(prev => (dopEditRow ? prev.map(m => (m.key === row.key ? row : m)) : [...prev, row]));
            closeDop();
            show(dopEditRow ? "Строка обновлена" : "Материал добавлен");
          }}
        />
      )}

      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}

// ── Итого по приказу ────────────────────────────────────────────────────────────
// Сумма шихтовых материалов всех карт приказа: одинаковые материалы складываются, состав рассчитывается заново
// по итоговым массам (как лист «ИТОГО» книги шихтовых карт).
function PrikazItogoModal({ prikaz, karty, onClose }: { prikaz: PrikazPlavka; karty: ShihtovayaKarta[]; onClose: () => void }) {
  const { chemElements, alloyGrades } = useApp();
  const shkEls = chemElements.filter(e => e.showShk);
  const shortName = (id: string) => chemElements.find(e => e.id === id)?.shortName ?? id.toUpperCase();
  const codeLabel = useMaterialCodeLabel();
  const mats = useMemo(() => itogoMaterials(karty), [karty]);
  const grade = prikazGrade(karty, alloyGrades);
  const calc = useMemo(() => new ShihtaCalc(mats.map(lineOfMaterial), grade), [mats, grade]);
  const status = prikazStatus(karty);
  const pct = (e: string) => (e === "p" || !(calc.total(e) > 0) || calc.base <= 0 ? "—" : fmt2(calc.pct(e)));
  const normOf = (e: string, k: "min" | "max") => {
    const c = normCell(grade, e);
    if (!c) return null;
    if (c.kind === "rest") return restNorm(grade, k);
    if (c.kind === "impurity") return k === "max" ? c.max : null;
    return c[k] ?? null;
  };
  const impText = impuritiesText(grade, shkEls.map(e => e.id), shortName);
  const matName = (m: ShihtaMaterial) => cupName(kindOf(m), m.name, m.phosphorPct);
  const LEAD = 5;
  const cols = LEAD + 1 + shkEls.length;
  const dash = <span className="text-gray-400">—</span>;
  const skladCount = mats.filter(isSkladMaterial).length;

  return (
    <Modal title={`Итого по приказу № ${prikaz.number} от ${prikaz.date}`} fullWide onClose={onClose} footer={<Btn variant="secondary" onClick={onClose}>Закрыть</Btn>}>
      <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
        <Badge label={status} group="shihta" />
        <span className="text-gray-700">{prikaz.name}</span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-600">Марка: {grade ? `${grade.name} (${grade.nd})` : karty.length ? "разные марки — сверка итога не выполняется" : "—"}</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {karty.map(k => (
          <span key={k.id} className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-xs text-gray-700">
            Плавка № {k.plavkaNo} · {str2(kartaMass(k))} г <Badge label={k.status} group="shihta" />
          </span>
        ))}
      </div>
      {mats.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">В приказе нет шихтовых карт с материалами</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th colSpan={LEAD + 1}></th>
                <th colSpan={shkEls.length} className="px-3 pt-2 pb-1 text-center font-medium uppercase tracking-wide border-b border-gray-200">Содержание в чистоте, г</th>
              </tr>
              <tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200 whitespace-nowrap">
                <th className="px-3 py-2 text-left font-medium w-10">№</th>
                <th className="px-3 py-2 text-left font-medium">Шихтовый материал</th>
                <th className="px-3 py-2 text-left font-medium">Номенкл. № / код</th>
                <th className="px-3 py-2 text-left font-medium">Плавки</th>
                <th className="px-3 py-2 text-right font-medium">{OBOROT_LABEL}</th>
                <th className="px-3 py-2 text-right font-medium">Масса лигатурная, г</th>
                {shkEls.map(e => <th key={e.id} className="px-3 py-2 text-right font-medium"><ElHead short={e.shortName} rest={grade?.rest === e.id} /></th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mats.map((m, i) => (
                <tr key={`${m.nomenkl}-${m.name}-${i}`} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{matName(m)}{!isSkladMaterial(m) && <span className="ml-2 text-xs font-normal text-gray-400">доп. материал</span>}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {m.nomenkl ? <span className="text-gray-500">{m.nomenkl}</span> : dash}
                    {m.code && <span className="ml-2 text-blue-600">{codeLabel(m.code)}</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{m.plavki.join(", ")}</td>
                  <td className="px-3 py-2 text-right">{isSkladMaterial(m) ? <OborotValue value={m.oborot} code={m.code} /> : <span className="text-gray-400">—</span>}</td>
                  <td className="px-3 py-2 text-right font-medium">{str2(m.ves)}</td>
                  {shkEls.map(e => {
                    const v = calc.chems[i][e.id] ?? 0;
                    return <td key={e.id} className="px-3 py-2 text-right text-gray-600">{v > 0 ? str2(v) : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50 text-sm divide-y divide-gray-200">
              <tr className="font-medium">
                <td className="px-3 py-2" colSpan={LEAD}>Масса шихты, г <span className="text-xs font-normal text-gray-400">({mats.length} поз., из них со склада — {skladCount})</span></td>
                <td className="px-3 py-2 text-right font-semibold">{str2(calc.mass)}</td>
                {shkEls.map(e => <td key={e.id} className="px-3 py-2 text-right text-gray-400">—</td>)}
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium" colSpan={LEAD}>Содержание в шихте, г</td>
                <td className="px-3 py-2 text-right text-gray-400">—</td>
                {shkEls.map(e => <td key={e.id} className="px-3 py-2 text-right">{calc.total(e.id) > 0 ? str2(calc.total(e.id)) : "—"}</td>)}
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium" colSpan={LEAD}>Содержание в шихте, % <span className="text-xs font-normal text-gray-400">(к массе без фосфора {str2(calc.base)} г)</span></td>
                <td className="px-3 py-2 text-right text-gray-400">—</td>
                {shkEls.map(e => {
                  const v = pct(e.id);
                  if (grade?.rest === e.id) return <td key={e.id} className={`px-3 py-2 text-right cursor-help ${v === "—" ? "text-gray-400" : "font-semibold"}`} title={REST_HINT}>{v}</td>;
                  return <td key={e.id} className={`px-3 py-2 text-right ${v === "—" ? "text-gray-400" : "font-semibold"}`}>{v}</td>;
                })}
              </tr>
              {grade && (["min", "max"] as const).map(k => (
                <tr key={k} className="text-gray-600">
                  <td className="px-3 py-2 font-medium" colSpan={LEAD}>{k === "min" ? "Норма мин, %" : "Норма макс, %"} <span className="text-xs font-normal text-gray-400">({grade.name}, {grade.nd})</span></td>
                  <td className="px-3 py-2 text-right text-gray-400">—</td>
                  {shkEls.map(e => <td key={e.id} className="px-3 py-2 text-right"><NormValue v={normOf(e.id, k)} rest={grade?.rest === e.id} /></td>)}
                </tr>
              ))}
              {grade && impText && (
                <tr className="text-gray-600">
                  <td className="px-3 py-2 text-xs" colSpan={cols}>Примеси, не более, %: {impText}</td>
                </tr>
              )}
            </tfoot>
          </table>
          {grade && calc.checks.length > 0 && (
            <div className={`mt-3 px-4 py-2 rounded-lg text-sm border ${calc.complies ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
              {calc.complies
                ? `Итоговый состав соответствует марке ${grade.name}`
                : `Итоговый состав не соответствует марке ${grade.name}: ${calc.failed.map(c => `${shortName(c.element)} ${fmtFact(c)} % при норме ${normText(c)}`).join("; ")}`}
            </div>
          )}
          <p className="mt-3 text-xs text-gray-500">
            Со склада по кнопке «Выдать по ШК» (Движение материала, операция «Плавка») выдаются позиции склада всех карт приказа; доп. материалы (лигатура, медь МО) выдаёт распределитель работ участка.
          </p>
        </div>
      )}
    </Modal>
  );
}

// ── Приказ на плавку: окно записи ───────────────────────────────────────────────
// Шапка приказа, общая информация, шихтовые карты приказа и «Добавить ШК» — карта создаётся в конструкторе
// поверх окна. Вложенные экраны: …/karta-new, …/view/:id, …/edit/:id, …/itogo.
// Новый приказ: «Сохранить» создаёт приказ, окно остаётся открытым — после этого доступна «Добавить ШК».

// Снятие резерва с позиций ДМ невыполненных карт
function releaseKarty(setDmItems: React.Dispatch<React.SetStateAction<DMItem[]>>, karty: ShihtovayaKarta[]) {
  const nomenkl = new Set(karty.filter(k => k.status !== "Выполнена").flatMap(k => k.materials.map(m => m.nomenkl)).filter(Boolean));
  if (nomenkl.size) setDmItems(prev => reserveDm(prev, new Set(prev.filter(i => i.status === "Резерв" && nomenkl.has(i.nomenkl)).map(i => i.id)), new Set()));
}

// Карты приказа — по номеру плавки
const kartyOfPrikaz = (all: ShihtovayaKarta[], id: string) =>
  all.filter(k => k.prikazId === id).sort((a, b) => (parseInt(a.plavkaNo, 10) || 0) - (parseInt(b.plavkaNo, 10) || 0));

// Причина, по которой карту приказа нельзя оформить (null — можно): те же условия, что показывает конструктор
function kartaOformitBlock(k: ShihtovayaKarta, grade: AlloyGrade | undefined, label: (el: string) => string): string | null {
  if (k.materials.length === 0) return "нет материалов";
  if (k.materials.some(m => !(m.ves > 0))) return "не указан вес лигат. материала";
  if (!grade) return "не указана марка сплава";
  if (!k.naznachenie) return "не указано назначение слитков";
  if (!k.plavkaNo?.trim()) return "не указан номер плавки";
  if (k.vydannyePozicii?.length) return `позиции выданы в другой операции: ${k.vydannyePozicii.map(v => v.name).join(", ")}`;
  const calc = new ShihtaCalc(k.materials.map(lineOfMaterial), grade);
  if (calc.complies) return null;
  const fail = calc.failed.map(c => `${label(c.element)} ${fmtFact(c)} % при норме ${normText(c)}`).join("; ");
  if (!grade.allowDeviation) return `состав не соответствует марке ${grade.name}: ${fail}`;
  if (!k.note?.trim()) return `состав не соответствует марке ${grade.name}: ${fail} — заполните «Примечание» карты`;
  return null;
}

// Приказ на плавку. Новый приказ сначала сохраняется (окно остаётся открытым), затем добавляются шихтовые карты —
// каждая сохраняется «На редактировании», позиции склада резервируются при каждом сохранении карты.
// «Оформить» приказа переводит все его карты и сам приказ в «Новая» — редактирование закрыто.
// Если позицию из резерва выдали со склада, карта (и приказ) возвращается в «На редактировании».
function PrikazModal({ prikaz, readOnly = false, onClose, onSave }: {
  prikaz?: PrikazPlavka | null;
  readOnly?: boolean;
  onClose: () => void;
  // created — приказ сохранён впервые (окно остаётся открытым для добавления карт); oformlen — приказ оформлен
  onSave: (p: PrikazPlavka, mode: "created" | "saved" | "oformlen") => void;
}) {
  const { currentUser, shihtovyeKarty, setShihtovyeKarty, setDmItems, alloyGrades, chemElements } = useApp();
  const screen = useScreen();
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const shortName = (id: string) => chemElements.find(e => e.id === id)?.shortName ?? id.toUpperCase();
  const [number, setNumber] = useState(prikaz?.number ?? "");
  const [date, setDate] = useState(prikaz?.date ?? new Date().toLocaleDateString("ru-RU"));
  const [name, setName] = useState(prikaz?.name ?? "");
  const [note, setNote] = useState(prikaz?.note ?? "");
  const [files, setFiles] = useState<File[]>(() => prikaz?.files ?? []);

  const karty = prikaz ? kartyOfPrikaz(shihtovyeKarty, prikaz.id) : [];
  const status = prikazStatus(karty);
  const done = !!prikaz && status === "Выполнена";
  // Оформленный приказ («Новая») и выполненный не редактируются
  const ro = readOnly || (!!prikaz && status !== "На редактировании");
  const mass = r2(karty.reduce((s, k) => s + kartaMass(k), 0));
  const gradeName = (k: ShihtovayaKarta) => alloyGrades.find(g => g.id === k.alloyId)?.name ?? "";

  // Марка сплава и назначение слитков — общие для всех карт приказа (в картах только для чтения).
  // Поля приказа не меняются, как только в приказе сохранена хотя бы одна шихтовая карта.
  const [alloyId, setAlloyId] = useState(prikaz?.alloyId ?? "");
  const [naznachenie, setNaznachenie] = useState(prikaz?.naznachenie ?? "");
  const headLocked = ro || karty.length > 0;
  const gradeOptions = ["", ...alloyGrades.filter(g => g.status === "Активно" || g.id === alloyId).map(g => g.id)];
  const gradeLabel = (id: string) => { const g = alloyGrades.find(x => x.id === id); return g ? `${g.name} (${g.nd})` : "Выберите марку"; };
  const naznOptions = ["", ...new Set([...spravValues("Назначение слитков"), ...(naznachenie ? [naznachenie] : [])])];

  const error = !number.trim() ? "Укажите номер приказа" : !date.trim() ? "Укажите дату приказа" : !name.trim() ? "Укажите наименование"
    : !alloyId ? "Выберите марку сплава" : !naznachenie ? "Выберите назначение слитков" : "";
  const build = (): PrikazPlavka => {
    const head = { number: number.trim(), date: date.trim(), name: name.trim(), note: note.trim() || undefined, files, alloyId, naznachenie };
    return prikaz
      ? { ...prikaz, ...head }
      : { id: `pp-${Date.now()}`, ...head, createdAt: new Date().toISOString(), createdBy: currentUser?.fullName || currentUser?.name || "—" };
  };
  const save = () => {
    if (error) { show(error); return; }
    onSave(build(), prikaz ? "saved" : "created");
  };
  // Шапка изменена, но не сохранена — карту добавить нельзя (карта берёт марку и назначение из сохранённого приказа)
  const dirty = !!prikaz && (number.trim() !== prikaz.number || date.trim() !== prikaz.date || name.trim() !== prikaz.name
    || alloyId !== (prikaz.alloyId ?? "") || naznachenie !== (prikaz.naznachenie ?? ""));
  const addKartaBlock = !prikaz ? "Сначала сохраните приказ" : dirty ? "Данные приказа изменены — сохраните приказ" : null;
  const addKarta = () => {
    if (addKartaBlock) { show(addKartaBlock); return; }
    screen.open("karta-new");
  };

  // Оформление приказа: все карты — «Новая» (редактирование закрыто), приказ — «Новая»
  const kartaBlocks = karty.filter(k => k.status === "На редактировании")
    .map(k => ({ k, why: kartaOformitBlock(k, alloyGrades.find(g => g.id === k.alloyId), shortName) }))
    .filter((x): x is { k: ShihtovayaKarta; why: string } => !!x.why);
  const oformitBlock = !prikaz ? "Сначала сохраните приказ"
    : karty.length === 0 ? "Добавьте хотя бы одну шихтовую карту"
    : dirty ? "Данные приказа изменены — сохраните приказ"
    : kartaBlocks.length ? `не готовы карты: ${kartaBlocks.map(({ k, why }) => `плавка № ${k.plavkaNo} — ${why}`).join("; ")}`
    : null;
  const oformit = () => {
    if (!prikaz || oformitBlock) { if (oformitBlock) show(oformitBlock); return; }
    // Выполненные карты (уже выданы на плавку) не меняются
    const ids = new Set(karty.filter(k => k.status === "На редактировании").map(k => k.id));
    setShihtovyeKarty(prev => prev.map(k => (ids.has(k.id) ? { ...k, status: "Новая", vydannyePozicii: undefined } : k)));
    onSave(build(), "oformlen");
  };

  // Вложенные экраны карты
  const viewKarta = karty.find(k => k.id === screen.after("view")) ?? null;
  const editKarta = karty.find(k => k.id === screen.after("edit")) ?? null;
  const showNewKarta = !!prikaz && screen.has("karta-new");
  const showItogo = !!prikaz && screen.has("itogo");

  // Новая карта приказа: шапка — из последней карты приказа, основание — сам приказ
  const defaults = (): Partial<ShihtovayaKarta> => {
    const last = karty[karty.length - 1];
    return {
      name: last?.name ?? "", alloyId: last?.alloyId, naznachenie: last?.naznachenie,
      osnovanie: prikaz ? `Приказ № ${prikaz.number} от ${prikaz.date}` : "",
    };
  };
  const removeKarta = (k: ShihtovayaKarta) => {
    releaseKarty(setDmItems, [k]);
    setShihtovyeKarty(prev => prev.filter(s => s.id !== k.id));
    show(`Шихтовая карта плавки № ${k.plavkaNo} удалена, резерв позиций снят`);
  };
  const dash = <span className="text-gray-400">—</span>;

  return (
    <Modal
      title={prikaz ? `Приказ на плавку № ${prikaz.number}` : "Новый приказ на плавку"}
      fullWide
      onClose={onClose}
      footer={ro ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn> : (
        <div className="w-full">
          {prikaz && oformitBlock && (
            <div className="mb-3 text-xs text-red-600">Оформление недоступно: {oformitBlock}</div>
          )}
          <div className="flex items-center gap-2">
            <div className="mr-auto"><Btn variant="success" onClick={oformit} disabled={!!oformitBlock}>Оформить</Btn></div>
            <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
            <Btn onClick={save} disabled={!!error}>Сохранить</Btn>
          </div>
        </div>
      )}
    >
      {prikaz && (
        <div className="flex items-center gap-2 mb-4">
          <Badge label={status} group="shihta" />
          {done && <span className="text-xs text-gray-500">Карты приказа выданы на плавку — изменения недоступны</span>}
          {status === "Новая" && <span className="text-xs text-gray-500">Приказ оформлен — карты доступны для выдачи на плавку, редактирование закрыто</span>}
          {status === "На редактировании" && karty.some(k => k.vydannyePozicii?.length) && (
            <span className="text-xs text-red-600">Позиции из резерва выданы со склада — замените их в отмеченных картах и оформите приказ</span>
          )}
        </div>
      )}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <Field label="Номер приказа" required={!headLocked}><Input value={number} onChange={setNumber} placeholder="№" disabled={headLocked} /></Field>
        <Field label="Дата приказа" required={!headLocked}><Input value={date} onChange={setDate} placeholder="дд.мм.гггг" disabled={headLocked} /></Field>
        <Field label="Наименование" required={!headLocked} full><Input value={name} onChange={setName} placeholder="Например: слитки СрМ 92,5 для монет пруф-качества" disabled={headLocked} /></Field>
        <Field label="Марка сплава" required={!headLocked} full>
          <Select value={alloyId} options={gradeOptions} optionLabel={gradeLabel} onChange={setAlloyId} disabled={headLocked} />
        </Field>
        <Field label="Назначение слитков" required={!headLocked}>
          <Select value={naznachenie} options={naznOptions} optionLabel={v => v || "Не выбрано"} onChange={setNaznachenie} disabled={headLocked} />
        </Field>
        <Field label="Примечание" full><Textarea value={note} onChange={setNote} rows={2} disabled={headLocked} /></Field>
        {!ro && headLocked && (
          <div className="col-span-4 -mt-2 text-xs text-gray-500">Поля приказа не меняются: в приказе сохранены шихтовые карты</div>
        )}
      </div>

      <div className="mb-5">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
        <MultiFileUpload files={files} onChange={setFiles} disabled={ro} />
      </div>

      {prikaz && karty.length > 0 && <PrikazSummary karty={karty} mass={mass} />}

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Шихтовые карты</h3>
          <div className="flex gap-2">
            {prikaz && karty.length > 0 && <Btn size="sm" variant="secondary" onClick={() => screen.open("itogo")}><Sigma className="w-4 h-4" />Итого по приказу</Btn>}
            {!ro && <span title={addKartaBlock ?? undefined}><Btn size="sm" onClick={addKarta} disabled={!!addKartaBlock}><Plus className="w-4 h-4" />Добавить ШК</Btn></span>}
          </div>
        </div>
        {karty.length === 0 ? (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
            {prikaz ? "В приказе нет шихтовых карт. Нажмите «+ Добавить ШК»" : "Заполните поля приказа и нажмите «Сохранить» — после сохранения станет доступна кнопка «+ Добавить ШК»"}
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left font-medium">№ плавки</th>
                  <th className="px-3 py-2 text-left font-medium">Дата документа</th>
                  <th className="px-3 py-2 text-left font-medium">Наименование</th>
                  <th className="px-3 py-2 text-left font-medium">Марка сплава</th>
                  <th className="px-3 py-2 text-left font-medium">Оборот</th>
                  <th className="px-3 py-2 text-right font-medium">Позиций</th>
                  <th className="px-3 py-2 text-right font-medium">Масса шихты, г</th>
                  <th className="px-3 py-2 text-left font-medium">Статус</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {karty.map(k => {
                  // Редактировать и удалять карту можно, пока она не оформлена
                  const draft = !ro && k.status === "На редактировании";
                  // Карта, позиции которой выданы со склада, — подсвечена
                  const issued = !!k.vydannyePozicii?.length;
                  return (
                    <tr key={k.id} className={issued ? "bg-red-50 hover:bg-red-100/60" : "hover:bg-gray-50"} title={issued ? `Выданы со склада: ${k.vydannyePozicii!.map(v => `${v.name} (${v.doc})`).join("; ")}` : undefined}>
                      <td className="px-3 py-2 text-blue-600 font-medium">{k.plavkaNo}</td>
                      <td className="px-3 py-2 text-gray-500">{k.date}</td>
                      <td className="px-3 py-2 text-gray-900">{k.name}</td>
                      <td className="px-3 py-2 text-gray-700">{gradeName(k) || dash}</td>
                      <td className="px-3 py-2"><OborotValue value={kartaOborot(k)} code={alloyGrades.find(g => g.id === k.alloyId)?.materialCode} /></td>
                      <td className="px-3 py-2 text-right">{k.materials.length}</td>
                      <td className="px-3 py-2 text-right">{str2(kartaMass(k))}</td>
                      <td className="px-3 py-2"><Badge label={k.status} group="shihta" /></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <EyeIcon onClick={() => screen.open("view", k.id)} />
                          {!ro && <>
                            <EditIcon onClick={() => screen.open("edit", k.id)} disabled={!draft} title={draft ? "Редактировать" : "Карта оформлена — редактирование недоступно"} />
                            <DeleteIcon
                              onClick={() => confirm(`Удалить шихтовую карту плавки № ${k.plavkaNo} «${k.name}»? Резерв позиций будет снят.`, () => removeKarta(k))}
                              disabled={!draft}
                              title={draft ? "Удалить" : "Карта оформлена — удаление недоступно"}
                            />
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr className="font-medium">
                  <td className="px-3 py-2" colSpan={5}>Итого по приказу <span className="text-xs font-normal text-gray-400">({karty.length} карт)</span></td>
                  <td className="px-3 py-2 text-right">{karty.reduce((s, k) => s + k.materials.length, 0)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{str2(mass)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showItogo && prikaz && <PrikazItogoModal prikaz={prikaz} karty={karty} onClose={() => screen.close("itogo")} />}
      {viewKarta && <ShihtaConstructor key={viewKarta.id} karta={viewKarta} prikaz={prikaz ?? undefined} onClose={() => screen.close("view")} onSave={() => screen.close("view")} readOnly />}
      {editKarta && (
        <ShihtaConstructor
          key={editKarta.id}
          karta={editKarta}
          prikaz={prikaz ?? undefined}
          // Оформленная карта не редактируется — даже если открыта по прямой ссылке
          readOnly={ro || editKarta.status !== "На редактировании"}
          onClose={() => screen.close("edit")}
          onSave={k => {
            setShihtovyeKarty(prev => prev.map(s => (s.id === k.id ? k : s)));
            screen.close("edit");
            show("Карта сохранена, позиции склада зарезервированы");
          }}
        />
      )}
      {showNewKarta && !ro && (
        <ShihtaConstructor
          prikaz={prikaz ?? undefined}
          defaults={defaults()}
          onClose={() => screen.close("karta-new")}
          onSave={k => {
            setShihtovyeKarty(prev => [k, ...prev]);
            screen.close("karta-new");
            show("Шихтовая карта сохранена в статусе «На редактировании», позиции склада зарезервированы");
          }}
        />
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}

// ── Общая информация по приказу (в окне приказа) ────────────────────────────────
function PrikazSummary({ karty, mass }: { karty: ShihtovayaKarta[]; mass: number }) {
  const { alloyGrades, chemElements } = useApp();
  const grade = prikazGrade(karty, alloyGrades);
  const mats = useMemo(() => itogoMaterials(karty), [karty]);
  const calc = useMemo(() => new ShihtaCalc(mats.map(lineOfMaterial), grade), [mats, grade]);
  const shortName = (id: string) => chemElements.find(e => e.id === id)?.shortName ?? id.toUpperCase();
  const skl = mats.filter(isSkladMaterial);
  const count = (pred: (k: ShihtovayaKarta) => boolean) => karty.filter(pred).length;
  const item = (label: string, value: React.ReactNode) => (
    <div><div className="text-xs text-gray-500">{label}</div><div className="text-sm text-gray-900 font-medium">{value}</div></div>
  );
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-5">
      <div className="grid grid-cols-5 gap-4">
        {item("Марка сплава", grade ? `${grade.name} (${grade.nd})` : "разные")}
        {item("Шихтовых карт", `${karty.length} (оформлено ${count(k => k.status !== "На редактировании")}, выполнено ${count(k => k.status === "Выполнена")})`)}
        {item("Плавки", karty.map(k => k.plavkaNo).join(", "))}
        {item("Масса шихты, г", str2(mass))}
        {item("Позиций со склада", skl.length ? `${skl.length} · ${str2(skl.reduce((s, m) => s + m.ves, 0))} г` : "—")}
      </div>
      {grade && calc.checks.length > 0 && (
        <div className="mt-3 text-sm">
          Итоговый состав: {calc.checks.map(c => (
            <span key={c.element} className={`mr-3 ${c.ok ? "text-gray-800" : "text-red-600 font-medium"}`}>{shortName(c.element)} {fmtFact(c)} % <span className="text-gray-400">({normText(c)})</span></span>
          ))}
          <Badge label={calc.complies ? "Соответствует" : "Не соответствует"} group="gost" />
        </div>
      )}
    </div>
  );
}

// Масса шихты карты, г
const kartaMass = (k: ShihtovayaKarta) => r2(k.materials.reduce((s, m) => s + m.ves, 0));

export function ShihtovyeKarty() {
  const { shihtovyeKarty, setShihtovyeKarty, shihtaPrikazy, setShihtaPrikazy, setDmItems, alloyGrades } = useApp();
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [page, setPage] = useState(1);
  // Экраны: /new (новый приказ), /prikaz/:id (редактирование), /prikaz-view/:id (просмотр);
  // карты — внутри окна приказа (…/karta-new, …/view/:id, …/edit/:id, …/itogo)
  const screen = useScreen();
  const showNew = screen.has("new");
  const editPrikaz = shihtaPrikazy.find(p => p.id === screen.after("prikaz")) ?? null;
  const viewPrikaz = shihtaPrikazy.find(p => p.id === screen.after("prikaz-view")) ?? null;
  const [perPage, setPerPage] = usePerPage("shihtovye-karty", 8);

  const rows = shihtaPrikazy.map(p => {
    const karty = kartyOfPrikaz(shihtovyeKarty, p.id);
    const grades = [...new Set(karty.map(k => alloyGrades.find(g => g.id === k.alloyId)?.name).filter(Boolean))];
    // Итоговая масса шихты — сумма масс всех шихтовых карт приказа
    return { id: p.id, p, karty, status: prikazStatus(karty), grade: grades.join(", "), mass: r2(karty.reduce((s, k) => s + kartaMass(k), 0)) };
  });

  const removePrikaz = (p: PrikazPlavka) => {
    const karty = kartyOfPrikaz(shihtovyeKarty, p.id);
    releaseKarty(setDmItems, karty);
    const ids = new Set(karty.map(k => k.id));
    setShihtovyeKarty(prev => prev.filter(k => !ids.has(k.id)));
    setShihtaPrikazy(prev => prev.filter(x => x.id !== p.id));
    show(`Приказ № ${p.number} удалён${karty.length ? ` вместе с картами (${karty.length})` : ""}`);
  };

  const { sorted, sort, toggleSort } = useSort(rows, {
    date: r => parseRuDate(r.p.date),
    number: r => parseInt(r.p.number, 10) || 0,
    name: r => r.p.name,
    grade: r => r.grade,
    kartyCount: r => r.karty.length,
    mass: r => r.mass,
    status: r => r.status,
    createdAt: r => new Date(r.p.createdAt).getTime(),
  });
  const dash = <span className="text-gray-400">—</span>;

  return (
    <div>
      <PageHeader
        title="Шихтовые карты"
        subtitle="Приказы на плавку и шихтовые карты в их составе"
        breadcrumb={["Шихтовые карты"]}
        actions={<Btn onClick={() => screen.openTop("new")}><Plus className="w-4 h-4" />Новый приказ на плавку</Btn>}
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortTh sortKey="date" sort={sort} onSort={toggleSort}>Дата приказа</SortTh>
              <SortTh sortKey="number" sort={sort} onSort={toggleSort}>№ приказа</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort}>Наименование</SortTh>
              <SortTh sortKey="grade" sort={sort} onSort={toggleSort}>Марка сплава</SortTh>
              <SortTh sortKey="kartyCount" sort={sort} onSort={toggleSort} align="right">ШК</SortTh>
              <SortTh sortKey="mass" sort={sort} onSort={toggleSort} align="right">Итоговая масса, г.</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort}>Статус</SortTh>
              <SortTh sortKey="createdAt" sort={sort} onSort={toggleSort}>{CREATED_LABEL}</SortTh>
              <th className="w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.slice((page - 1) * perPage, page * perPage).map(({ p, karty, status, grade, mass }) => {
              const done = status === "Выполнена";
              // Приказ, по которому уже выдавались карты, не удаляется
              const canDelete = !karty.some(k => k.status === "Выполнена");
              return (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{p.date}</td>
                  <td className="px-4 py-3 text-blue-600">{p.number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-700">{grade || dash}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{karty.length}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{karty.length ? str2(mass) : dash}</td>
                  <td className="px-4 py-3"><Badge label={status} group="shihta" /></td>
                  <CreatedCell row={p} />
                  <td className="px-4 py-3 flex items-center gap-1">
                    <EyeIcon onClick={() => screen.openTop("prikaz-view", p.id)} />
                    <EditIcon onClick={() => screen.openTop("prikaz", p.id)} disabled={status !== "На редактировании"} title={status === "На редактировании" ? "Редактировать" : done ? "Приказ выполнен — редактирование недоступно" : "Приказ оформлен — редактирование недоступно"} />
                    <DeleteIcon
                      onClick={() => confirm(
                        karty.length ? `Удалить приказ № ${p.number} и его шихтовые карты (${karty.length})? Резерв позиций будет снят.` : `Удалить приказ № ${p.number}?`,
                        () => removePrikaz(p),
                      )}
                      disabled={!canDelete}
                      title={canDelete ? "Удалить" : "Карты приказа выданы на плавку — удаление недоступно"}
                    />
                  </td>
                </tr>
              );
            })}
            <FillerRows count={fillerCount(rows.length, page, perPage)} cols={9} />
          </tbody>
        </table>
        <Pagination page={page} total={rows.length} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
      </div>

      {showNew && (
        <PrikazModal
          onClose={() => screen.close("new")}
          onSave={p => {
            setShihtaPrikazy(prev => [p, ...prev]);
            // Окно остаётся открытым: приказ переходит в редактирование, становится доступна «+ Добавить ШК»
            screen.openTop("prikaz", p.id);
            show(`Приказ № ${p.number} сохранён — добавьте шихтовые карты`);
          }}
        />
      )}
      {editPrikaz && (
        <PrikazModal
          key={editPrikaz.id}
          prikaz={editPrikaz}
          onClose={() => screen.close("prikaz")}
          onSave={(p, mode) => {
            setShihtaPrikazy(prev => prev.map(x => (x.id === p.id ? p : x)));
            screen.close("prikaz");
            show(mode === "oformlen" ? `Приказ № ${p.number} оформлен — шихтовые карты в статусе «Новая», доступны для выдачи на плавку` : "Приказ сохранён");
          }}
        />
      )}
      {viewPrikaz && (
        <PrikazModal key={viewPrikaz.id} prikaz={viewPrikaz} readOnly onClose={() => screen.close("prikaz-view")} onSave={() => {}} />
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
