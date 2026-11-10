import React, { useMemo, useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, usePerPage, FillerRows, fillerCount, PageHeader,
  useToast, Toast, Field, Input, Select, Textarea, KlassCode, MultiFileUpload, useConfirm, ConfirmDialog,
  SortTh, useSort, parseRuDate, usePaged, CREATED_LABEL, CreatedCell,
} from "../components/ui";
import {
  ShihtovayaKarta, ShihtaMaterial, ShihtaMatKind, DMItem, ChemComposition, AlloyGrade, isGPKlass, isStoneKlass, STONE_KLASS,
  PRIHOD_SKLAD, SGP, spravValues, minAffinageOf, NAZN_PROOF, STRUZHKA_KLASS, baseMetal,
} from "../data/mock";
import { returnToStock, splitRecord } from "../data/stock";
import {
  ShihtaCalc, ShihtaLine, chemStrings, fmt2, normText, nominalOf, podbor, podborElements, r2, shareOf, shihtaWarnings,
  lineChem, PodborResult, GRANULES_PURITY, PRECIOUS, kindOf,
} from "../data/shihta";
import ChemCompositionBlock from "../components/ChemCompositionBlock";
import { ChemPercent, gramsFrom, num0 } from "../data/chem";
import StockPickerModal, { StockRow } from "../components/StockPickerModal";
import { Plus, X, Calculator, Wand2, AlertTriangle } from "lucide-react";
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
  qty: number;
  loc: string;
  sklad?: string;
  // Доли элементов в материале (0..1)
  share: Record<string, number>;
  // Лигатура Cu-P: фосфор, %
  phosphorPct?: number;
  // Масса в шихту, г (поле ввода)
  ves: string;
  // Позиция склада: наибольшая масса в шихту — вес позиции
  maxVes?: number;
  // Позиция склада: лигатурный вес всей позиции (взятая часть + то, что уже на складе) — для расчёта остатка
  posLig?: number;
  // id позиции склада ДМ, выбранной в этой сессии — резервируется при сохранении карты
  srcId?: string;
  // Запись склада, уже зарезервированная под карту (при изменении массы резерв пересчитывается)
  rezId?: string;
  rezVes?: number;
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
  // Часть слитка, отрезанная по массе: можно вернуть массу до веса исходной записи на складе
  const parent = rez && isWeightPart(rez) ? dm.find(i => i.id === rez.parentId && i.status === "На складе" && i.sklad === rez.sklad) : undefined;
  // Исходная позиция, от которой отделён резерв и которая осталась на складе (остаток позиции)
  const stockParent = rez?.parentId ? dm.find(i => i.id === rez.parentId && i.status === "На складе" && i.sklad === rez.sklad) : undefined;
  return {
    key: newKey(), kind, mat: m.name, nomenkl: m.nomenkl, klass: m.klass, proba: m.proba, qty: m.qty ?? 1, loc: m.loc,
    sklad: rez?.sklad ?? m.sklad, share: shareOf(m.chem, m.ves), phosphorPct: m.phosphorPct, ves: str2(m.ves),
    maxVes: kind === "sklad" ? (rez ? r2(rez.ligWeight + (parent?.ligWeight ?? 0)) : m.ves) : undefined,
    posLig: rez ? r2(rez.ligWeight + (stockParent?.ligWeight ?? 0)) : undefined,
    rezId: rez?.id, rezVes: rez?.ligWeight,
  };
};

const lineOf = (m: MatRow): ShihtaLine => ({ kind: m.kind, mass: num(m.ves), share: m.share, phosphorPct: m.phosphorPct, klass: m.klass });

// Ошибка массы в шихту (пусто — масса корректна). Блокирует сохранение карты.
const massError = (m: MatRow): string => {
  const v = num(m.ves);
  if (!(v > 0)) return `Масса в шихту не указана: ${m.mat}`;
  if (m.maxVes != null && v > m.maxVes + 0.005) return `Масса в шихту больше веса позиции: ${m.mat} (${str2(m.maxVes)} г)`;
  return "";
};

// Строка-подсказка подбора («Гранулы Ag 99,99»): драгметалл, который нужно подобрать со склада
const hintElement = (m: MatRow) => PRECIOUS.find(e => (m.share[e] ?? 0) > 0) ?? "ag";

// Строка карты из позиции склада: q изделий, масса в шихту по умолчанию — их лигатурный вес
const stockRowOf = (it: DMItem, q: number, key = newKey()): MatRow => {
  const maxVes = r2((it.ligWeight * q) / (it.qty || 1));
  return {
    key, kind: "sklad", mat: it.name, nomenkl: it.nomenkl, klass: it.klass, proba: it.proba, qty: q,
    loc: it.location, sklad: it.sklad, share: shareOf(it.chem, it.ligWeight), ves: str2(maxVes), maxVes, posLig: it.ligWeight, srcId: it.id,
  };
};

// Следующий номер плавки в году (сквозная нумерация с 1 января)
export function nextPlavkaNo(karty: ShihtovayaKarta[], year = new Date().getFullYear()): string {
  const max = karty
    .filter(k => k.date.endsWith(String(year)))
    .reduce((m, k) => Math.max(m, parseInt(k.plavkaNo, 10) || 0), 0);
  return String(max + 1);
}

const OBOROT_CLEAN = "чистая";
const oborotValid = (v: string) => !v.trim() || /^\d+$/.test(v.trim()) || v.trim().toLowerCase() === OBOROT_CLEAN;

// ── Резерв позиций ДМ под шихтовую карту ──
// Полностью взятая позиция переводится в «Резерв». При выборе части изделий или части массы зарезервированная
// часть выделяется в отдельную запись: по количеству — data/stock.ts (splitRecord), по массе (часть слитка) —
// запись «-rw»: то же количество изделий, масса и состав — в доле взятой массы.
// Позиции, убранные из карты, возвращаются на склад — часть объединяется с исходной записью.
interface TakePlan { id: string; qty: number; mass: number }

function reserveDm(items: DMItem[], release: Set<string>, plan: TakePlan[], remass: { id: string; mass: number }[], stamp: number): DMItem[] {
  // 1) Возврат на склад: снятые с резерва записи и записи с изменённой массой (перерезервируются ниже)
  const back = new Set([...release, ...remass.map(r => r.id)]);
  // Часть слитка по массе при объединении не добавляет изделий к исходной записи
  const wQty = new Map<string, number>();
  let out = items.map(it => {
    if (!back.has(it.id) || !isWeightPart(it)) return it;
    wQty.set(it.id, it.qty);
    return { ...it, qty: 0 };
  });
  out = returnToStock(out, back, "На складе").map(it => (wQty.has(it.id) ? { ...it, qty: wQty.get(it.id)! } : it));

  const all = [...plan];
  for (const r of remass) {
    const rec = items.find(i => i.id === r.id);
    if (!rec) continue;
    const origin = out.find(i => i.id === rec.id && i.status === "На складе") ?? out.find(i => i.id === rec.parentId && i.status === "На складе");
    if (origin) all.push({ id: origin.id, qty: rec.qty, mass: r.mass });
  }
  // 2) Резерв
  for (const t of all) {
    const it = out.find(i => i.id === t.id);
    if (!it) continue;
    const q = Math.min(t.qty, it.qty);
    const portion = it.qty > 0 ? r2((it.ligWeight * q) / it.qty) : it.ligWeight;
    const byMass = t.mass < portion - 0.005;
    const wholePieces = q >= it.qty;
    if (wholePieces && !byMass) {
      out = out.map(i => (i.id === it.id ? { ...i, status: "Резерв" as const } : i));
      continue;
    }
    const [rest, part] = splitRecord(it, wholePieces ? 0 : q, `${it.id}-${wholePieces ? "rw" : "r"}${stamp}`, byMass ? t.mass : undefined);
    const reserved: DMItem = { ...part, qty: wholePieces ? it.qty : q, status: "Резерв" };
    out = out.flatMap(i => (i.id === it.id ? [rest, reserved] : [i]));
  }
  return out;
}

// Нарушения допуска материалов в шихту (те же правила, что при добавлении со склада)
function banReason(m: { klass: string; share: Record<string, number>; kind: ShihtaMatKind }, grade: AlloyGrade | undefined, naznachenie: string): string | null {
  if (grade?.base === "Ag" && (m.share.au ?? 0) > 0) return "В шихту серебряного сплава материалы с золотом не допускаются";
  if (naznachenie === NAZN_PROOF && m.klass === STRUZHKA_KLASS) return "Стружка в шихте для монет пруф-качества не допускается";
  return null;
}

// ── Поле массы в таблице ──
function MassInput({ value, onChange, error, hint }: { value: string; onChange: (v: string) => void; error: string; hint?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
      title={error || hint}
      inputMode="decimal"
      className={`w-28 px-2 py-1 text-right bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? "border-red-400 ring-1 ring-red-400" : "border-gray-200"}`}
    />
  );
}

// ── Окно «Добавить доп. материал» ──
const DOP_TYPES = ["Лигатура Cu-P", "Медь МО", "Прочее"] as const;
type DopType = (typeof DOP_TYPES)[number];

function DopMaterialModal({ onClose, onAdd }: { onClose: () => void; onAdd: (row: MatRow) => void }) {
  const [type, setType] = useState<DopType>("Лигатура Cu-P");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("г");
  const [ves, setVes] = useState("");
  const [pPct, setPPct] = useState("");
  const [chem, setChem] = useState<ChemComposition>({});
  const [pct, setPct] = useState<ChemPercent>({});
  const mass = num(ves);
  const p = num(pPct);
  const cupChem = type === "Лигатура Cu-P" && mass > 0 && p > 0 && p < 100 ? lineChem({ kind: "cup", mass, phosphorPct: p }) : null;
  const error = !(mass > 0) ? "Укажите массу"
    : type === "Лигатура Cu-P" && !(p > 0 && p < 100) ? "Укажите содержание фосфора, %"
    : type === "Прочее" && !name.trim() ? "Укажите наименование материала"
    : "";
  const decimal = (set: (v: string) => void) => (v: string) => set(v.replace(/[^\d.,]/g, ""));

  const add = () => {
    if (error) return;
    const base = { key: newKey(), nomenkl: "", klass: "", proba: 0, qty: 1, loc: "", ves: str2(mass) };
    if (type === "Лигатура Cu-P") onAdd({ ...base, kind: "cup", mat: "Лигатура Cu-P", share: {}, phosphorPct: r2(p) });
    else if (type === "Медь МО") onAdd({ ...base, kind: "medMO", mat: "Медь МО", share: { cu: 1 } });
    else onAdd({ ...base, kind: "prochee", mat: name.trim(), share: shareOf(chem, mass) });
  };

  return (
    <Modal title="Добавить дополнительный материал" wide onClose={onClose} footer={
      <><Btn variant="secondary" onClick={onClose}>Отмена</Btn><Btn onClick={add} disabled={!!error}>Добавить</Btn></>
    }>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Тип" required><Select value={type} options={[...DOP_TYPES]} onChange={v => setType(v as DopType)} /></Field>
        {type === "Прочее" && <>
          <Field label="Наименование материала" required><Input value={name} onChange={setName} placeholder="Название" /></Field>
          <Field label="Ед. измерения" required><Select value={unit} options={["г", "кг", "шт"]} onChange={setUnit} /></Field>
        </>}
        <Field label={type === "Прочее" ? "Масса лигатурная, г" : "Масса, г"} required>
          <Input value={ves} onChange={decimal(v => { setVes(v); if (type === "Прочее") setChem(gramsFrom(pct, num0(v))); })} placeholder="0,00" />
        </Field>
        {type === "Лигатура Cu-P" && <>
          <Field label="Фосфор, %" required><Input value={pPct} onChange={decimal(setPPct)} placeholder="8,00" /></Field>
          <div />
          <Field label="Медь (Cu), г"><Input value={cupChem ? str2(cupChem.cu) : ""} disabled placeholder="рассчитывается" /></Field>
          <Field label="Фосфор (P), г"><Input value={cupChem ? str2(cupChem.p) : ""} disabled placeholder="рассчитывается" /></Field>
        </>}
        {type === "Медь МО" && <Field label="Медь (Cu), г"><Input value={mass > 0 ? str2(mass) : ""} disabled placeholder="= массе" /></Field>}
      </div>
      {type === "Лигатура Cu-P" && <p className="mt-3 text-xs text-gray-500">Cu = масса × (1 − P / 100), округление до 0,01 г; P = масса − Cu. Фосфор выгорает и не входит в базу расчёта долей.</p>}
      {type === "Прочее" && (
        <div className="mt-4">
          <ChemCompositionBlock scope="shk" value={chem} lig={mass} pct={pct} onChange={(c, pc) => { setChem(c); setPct(pc); }} />
        </div>
      )}
    </Modal>
  );
}

// ── Окно «Подбор состава» ──
function PodborModal({ grade, lines, shortName, onClose, onApply }: {
  grade: AlloyGrade;
  lines: ShihtaLine[];
  shortName: (e: string) => string;
  onClose: () => void;
  onApply: (r: PodborResult) => void;
}) {
  const els = podborElements(grade);
  const [targets, setTargets] = useState<Record<string, string>>(() => Object.fromEntries(els.map(e => {
    const r = grade.ranges.find(x => x.element === e);
    const n = r ? nominalOf(r) : undefined;
    return [e, n != null ? String(n).replace(".", ",") : ""];
  })));
  const nums = Object.fromEntries(Object.entries(targets).map(([k, v]) => [k, num(v)]));
  const res = podbor(lines, grade, nums, shortName);
  const cupNow = lines.find(l => l.kind === "cup");
  const ok = res.baseTarget > 0;

  return (
    <Modal title={`Подбор состава: ${grade.name}`} wide onClose={onClose} footer={
      <><Btn variant="secondary" onClick={onClose}>Отмена</Btn><Btn onClick={() => onApply(res)} disabled={!ok}>Применить</Btn></>
    }>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Целевые доли, %</h4>
      <div className="grid grid-cols-4 gap-4 mb-4">
        {els.map((e, i) => (
          <Field key={e} label={`${shortName(e)}${i === 0 ? " (основа)" : ""}, %`} required>
            <Input value={targets[e] ?? ""} onChange={v => setTargets(t => ({ ...t, [e]: v.replace(/[^\d.,]/g, "") }))} />
          </Field>
        ))}
      </div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Предлагаемые строки</h4>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
            <th className="px-3 py-2 text-left">Материал</th>
            <th className="px-3 py-2 text-right">Текущая масса, г</th>
            <th className="px-3 py-2 text-right">Масса в шихту, г</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {res.granules.map(g => (
              <tr key={g.element}><td className="px-3 py-2">Гранулы {shortName(g.element)} 99,99</td><td className="px-3 py-2 text-right text-gray-400">—</td><td className="px-3 py-2 text-right font-medium">{str2(g.mass)}</td></tr>
            ))}
            {res.cupMass != null && (
              <tr><td className="px-3 py-2">Лигатура Cu-P</td><td className="px-3 py-2 text-right text-gray-500">{cupNow ? str2(cupNow.mass) : "—"}</td><td className="px-3 py-2 text-right font-medium">{str2(res.cupMass)}</td></tr>
            )}
            <tr><td className="px-3 py-2">Медь МО</td><td className="px-3 py-2 text-right text-gray-400">—</td><td className="px-3 py-2 text-right font-medium">{res.medMO > 0 ? str2(res.medMO) : "не требуется"}</td></tr>
          </tbody>
        </table>
      </div>
      {ok && <p className="mt-2 text-xs text-gray-500">Расчётная база B* = {str2(res.baseTarget)} г. Медь МО округляется вниз до 5 г. {grade.base === "Au" ? "Для золотых сплавов лигатура Cu-P не подбирается." : !cupNow ? "Лигатуры Cu-P в карте нет — масса лигатуры не подбирается." : ""}</p>}
      {res.warnings.map(w => (
        <div key={w} className="mt-3 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{w}
        </div>
      ))}
    </Modal>
  );
}

function ShihtaConstructor({ karta, onClose, onSave, readOnly = false }: { karta?: ShihtovayaKarta | null; onClose: () => void; onSave: (k: ShihtovayaKarta) => void; readOnly?: boolean }) {
  const { currentUser, dmItems, setDmItems, chemElements, alloyGrades, shihtovyeKarty } = useApp();
  // Колонки «Содержание в чистоте, г» — элементы справочника с признаком «Отображать в ШК»
  const shkEls = chemElements.filter(e => e.showShk);
  const shortName = (id: string) => chemElements.find(e => e.id === id)?.shortName ?? id.toUpperCase();
  const elName = (id: string) => { const e = chemElements.find(x => x.id === id); return e ? `${e.name} (${e.shortName})` : id; };

  const [name, setName] = useState(karta?.name || "");
  const [alloyId, setAlloyId] = useState(karta?.alloyId ?? "");
  const [plavkaNo, setPlavkaNo] = useState(() => karta?.plavkaNo ?? nextPlavkaNo(shihtovyeKarty));
  const [oborot, setOborot] = useState(karta?.oborot ?? "");
  // Дата документа — задаётся вручную, по умолчанию сегодняшняя
  const [docDate, setDocDate] = useState(karta?.date || new Date().toLocaleDateString("ru-RU"));
  const [naznachenie, setNaznachenie] = useState(karta?.naznachenie ?? "");
  const [osnovanie, setOsnovanie] = useState(karta?.osnovanie ?? "");
  const [note, setNote] = useState(karta?.note ?? "");
  const [files, setFiles] = useState<File[]>(() => karta?.files ?? []);
  const [materials, setMaterials] = useState<MatRow[]>(() => (karta?.materials ?? []).map(m => toRow(m, dmItems)));
  // Вложенные экраны: …/from-sklad, …/dop-material, …/podbor, …/raschet (результат расчёта)
  const screen = useScreen();
  const nested = (n: string) => [screen.has(n), (open: boolean) => (open ? screen.open(n) : screen.close(n))] as const;
  const [showFromSklad, setShowFromSklad] = nested("from-sklad");
  const [showAddDop, setShowAddDop] = nested("dop-material");
  const [showPodbor, setShowPodbor] = nested("podbor");
  const showResult = screen.has("raschet");
  const setShowResult = (on: boolean) => screen.toggle("raschet", on);
  const { toast, show, clear } = useToast();
  const ro = readOnly;

  // Марки: активные + уже выбранная (даже если её сделали неактивной)
  const grade = alloyGrades.find(g => g.id === alloyId);
  const gradeOptions = ["", ...alloyGrades.filter(g => g.status === "Активно" || g.id === alloyId).map(g => g.id)];
  const gradeLabel = (id: string) => { const g = alloyGrades.find(x => x.id === id); return g ? `${g.name} (${g.nd})` : "Выберите марку"; };
  const naznOptions = ["", ...new Set([...spravValues("Назначение слитков"), ...(naznachenie ? [naznachenie] : [])])];

  // Доступные позиции для шихты — на выбранном складе (по умолчанию склад приёмки СДМ1). Позиции СДМ1
  // по требованию перемещаются на СДМ2 (резерв сохраняется); с СДМ2 карта выдаётся на плавку.
  // Склады СДМ (СГП №2 — только через выдачу со склада и «Возврат СГП №2»). Драгоценные камни в шихту не идут.
  const sklady = spravValues("Склады").filter(s => s !== SGP);
  const [pickSklad, setPickSklad] = useState(PRIHOD_SKLAD);
  const skladRows = useMemo<StockRow[]>(() => dmItems
    .filter(i => i.status === "На складе" && i.qty > 0 && !isGPKlass(i.klass) && !isStoneKlass(i.klass))
    // Чистый вес — сохранённый у позиции (тот же, по которому считается состав строки карты)
    .map(i => ({ id: i.id, src: "dm" as const, nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.metal, qty: i.qty, unit: "шт", proba: i.proba, lig: i.ligWeight, net: i.netWeight, location: i.location, sklad: i.sklad, chem: i.chem })),
  [dmItems]);
  // «Выбрать со склада» у строки-подсказки: окно выбора с фильтром по её драгметаллу, выбранные позиции заменяют подсказку
  const [replaceKey, setReplaceKey] = useState<string | null>(null);
  const replaceRow = materials.find(m => m.key === replaceKey && m.kind === "granuly");
  const pickerRows = replaceRow ? skladRows.filter(r => baseMetal(r.code).toLowerCase() === hintElement(replaceRow)) : skladRows;
  const openPicker = (hintKey: string | null) => { setReplaceKey(hintKey); setShowFromSklad(true); };
  const closePicker = () => { setReplaceKey(null); setShowFromSklad(false); };

  // Уже взято в карту из каждой позиции склада (в этой сессии)
  const already = materials.reduce<Record<string, number>>((acc, m) => {
    if (m.srcId) acc[m.srcId] = (acc[m.srcId] ?? 0) + m.qty;
    return acc;
  }, {});

  // Позиции из окна выбора, прошедшие запреты допуска в шихту (отклонённые — в сообщение)
  const acceptPicked = (picked: { row: StockRow; qty: number }[]) => {
    const rejected: string[] = [];
    const accepted = picked.flatMap(({ row, qty }) => {
      const it = dmItems.find(i => i.id === row.id);
      if (!it) return [];
      const why = banReason({ klass: it.klass, share: shareOf(it.chem, it.ligWeight), kind: "sklad" }, grade, naznachenie);
      if (why) { rejected.push(`${it.name}: ${why}`); return []; }
      return [{ it, qty }];
    });
    if (rejected.length) show(`Не добавлено — ${rejected.join("; ")}`);
    return accepted;
  };

  const addFromSklad = (picked: { row: StockRow; qty: number }[]) => {
    const accepted = acceptPicked(picked);
    setMaterials(prev => {
      const next = [...prev];
      for (const { it, qty } of accepted) {
        const idx = next.findIndex(m => m.srcId === it.id);
        if (idx >= 0) next[idx] = stockRowOf(it, Math.min(next[idx].qty + qty, it.qty), next[idx].key);
        else next.push(stockRowOf(it, qty));
      }
      return next;
    });
    closePicker();
    if (accepted.length === picked.length) show(`Добавлено позиций: ${accepted.length}. Резерв — при сохранении карты`);
  };

  // Замена строки-подсказки позициями склада: масса подсказки распределяется по выбранным позициям
  // (каждой — не больше её веса); если выбранного не хватает, подсказка остаётся с недостающей массой
  const replaceHint = (picked: { row: StockRow; qty: number }[]) => {
    if (!replaceRow) return closePicker();
    let rest = num(replaceRow.ves);
    const rows: MatRow[] = [];
    for (const { it, qty } of acceptPicked(picked)) {
      if (rest <= 0.005) break;
      const row = stockRowOf(it, qty);
      const mass = Math.min(rest, row.maxVes ?? rest);
      rows.push({ ...row, ves: str2(mass) });
      rest = r2(rest - mass);
    }
    const hintKey = replaceRow.key;
    setMaterials(prev => prev.flatMap(m => (m.key !== hintKey ? [m] : [...rows, ...(rest > 0.005 ? [{ ...m, ves: str2(rest) }] : [])])));
    closePicker();
    if (rows.length) show(rest > 0.005 ? `Подсказка заменена частично — не хватает ${str2(rest)} г` : "Подсказка заменена позициями склада");
  };

  // Остаток позиции на складе при взятии в шихту её части: вес позиции − масса в шихту (нет части — null)
  const stockRest = (m: MatRow): number | null => {
    if (m.kind !== "sklad" || m.posLig == null || massError(m)) return null;
    const rest = r2(m.posLig - num(m.ves));
    return rest > 0.005 ? rest : null;
  };

  const setVes = (key: string, v: string) => setMaterials(prev => prev.map(m => (m.key === key ? { ...m, ves: v } : m)));

  // ── Расчёт (автоматически при любом изменении строк и марки) ──
  const calc = useMemo(() => new ShihtaCalc(materials.map(lineOf), grade), [materials, grade]);
  const chemOfKey = useMemo(() => new Map(materials.map((m, i) => [m.key, calc.chems[i]])), [materials, calc]);
  const idxOfKey = useMemo(() => new Map(materials.map((m, i) => [m.key, i])), [materials]);
  const badMass = materials.filter(m => massError(m));
  // Позиции, выданные в другой операции (карта возвращена в «На редактировании»): их нужно заменить
  const issuedNomenkl = new Set((karta?.vydannyePozicii ?? []).map(v => v.nomenkl));
  const isIssued = (m: MatRow) => m.kind === "sklad" && issuedNomenkl.has(m.nomenkl);
  // Предупреждения — подсказки, оформление не блокируют; пересчитываются при любом изменении карты
  const warnings = [
    ...shihtaWarnings(calc, { oborot, minAffinage: minAffinageOf(naznachenie) }),
    ...(oborotValid(oborot) ? [] : ["Оборот — число или «чистая»"]),
    ...materials.filter(m => m.kind === "granuly").map(m => `Строка «${m.mat}» не со склада — материал не будет зарезервирован`),
    ...[...new Set(materials.map(m => banReason(m, grade, naznachenie)).filter((w): w is string => !!w))],
  ];
  const rangeOf = (e: string) => grade?.ranges.find(r => r.element === e);

  const pctCell = (e: string) => {
    // Фосфор выгорает и в базу не входит — его доля не показывается
    if (e === "p") return "—";
    const t = calc.total(e);
    if (!(t > 0) || calc.base <= 0) return "—";
    return fmt2(calc.pct(e));
  };

  // Причина, по которой карту нельзя оформить
  const failText = calc.failed.map(c => `${shortName(c.element)} ${fmt2(c.fact)} % при норме ${normText(c)}`).join("; ");
  const oformitBlock: string | null =
    materials.length === 0 ? "Добавьте хотя бы один материал"
    : !grade ? "Выберите марку сплава"
    : !naznachenie ? "Выберите назначение слитков"
    : !plavkaNo.trim() ? "Укажите номер плавки"
    : materials.some(isIssued) ? "Замените позиции, выданные в другой операции"
    : calc.complies ? null
    : !grade.allowDeviation ? `Состав не соответствует марке ${grade.name}: ${failText}`
    : !note.trim() ? `Состав не соответствует марке ${grade.name}: ${failText}. Для марки допускается отклонение — заполните «Примечание»`
    : null;

  const canPodbor = !!grade && materials.some(m => m.kind === "sklad");
  const applyPodbor = (r: PodborResult) => {
    setMaterials(prev => {
      let cupDone = false;
      const kept = prev.filter(m => m.kind !== "granuly" && m.kind !== "medMO").map(m => {
        if (m.kind !== "cup" || cupDone || r.cupMass == null) return m;
        cupDone = true;
        return { ...m, ves: str2(r.cupMass) };
      });
      const extra: MatRow[] = [
        ...r.granules.map(g => ({
          key: newKey(), kind: "granuly" as const, mat: `Гранулы ${shortName(g.element)} 99,99`, nomenkl: "", klass: "", proba: 0, qty: 1, loc: "",
          share: { [g.element]: GRANULES_PURITY }, ves: str2(g.mass),
        })),
        ...(r.medMO > 0 ? [{ key: newKey(), kind: "medMO" as const, mat: "Медь МО", nomenkl: "", klass: "", proba: 0, qty: 1, loc: "", share: { cu: 1 }, ves: str2(r.medMO) }] : []),
      ];
      return [...kept, ...extra];
    });
    setShowPodbor(false);
    setShowResult(true);
    show("Состав подобран, расчёт обновлён");
  };

  const { sorted: sortedMaterials, sort: matSort, toggleSort: toggleMatSort } = useSort(materials, {
    mat: m => m.mat,
    sklad: m => m.sklad ?? "",
    klass: m => m.klass,
    ves: m => num(m.ves),
    ...Object.fromEntries(shkEls.map(e => [`el-${e.id}`, (m: MatRow) => chemOfKey.get(m.key)?.[e.id] ?? 0])),
    dola: m => num(m.ves),
  });

  // Сохранить — карта «На редактировании»; Оформить — «Новая»: доступна для плавки, редактирование закрыто
  const save = (oformit = false) => {
    if (badMass.length) { show(massError(badMass[0])); return; }
    if (oformit && oformitBlock) { show(oformitBlock); return; }
    // Выбранные позиции склада должны быть всё ещё доступны в нужном количестве
    const plan: TakePlan[] = materials.filter(m => m.srcId).map(m => ({ id: m.srcId!, qty: m.qty, mass: num(m.ves) }));
    const lacking = plan.filter(t => {
      const it = dmItems.find(i => i.id === t.id);
      return !it || it.status !== "На складе" || it.qty < t.qty;
    });
    if (lacking.length) {
      show(`Позиции уже недоступны на складе: ${lacking.map(t => materials.find(m => m.srcId === t.id)?.mat).join(", ")}`);
      return;
    }
    // Позиции, убранные из карты, снимаются с резерва; у зарезервированных с изменённой массой — резерв пересчитывается
    const kept = new Set(materials.map(m => m.nomenkl));
    const releaseNomenkl = new Set((karta?.materials ?? []).map(m => m.nomenkl).filter(n => n && !kept.has(n)));
    const release = new Set(dmItems.filter(i => i.status === "Резерв" && releaseNomenkl.has(i.nomenkl)).map(i => i.id));
    const remass = materials
      .filter(m => m.rezId && m.rezVes != null && Math.abs(num(m.ves) - m.rezVes) > 0.005)
      .map(m => ({ id: m.rezId!, mass: num(m.ves) }));
    if (plan.length || release.size || remass.length) setDmItems(prev => reserveDm(prev, release, plan, remass, Date.now()));

    const mats: ShihtaMaterial[] = materials.map((m, i) => ({
      kind: m.kind, name: m.mat, nomenkl: m.nomenkl, klass: m.klass, proba: m.proba, ves: r2(num(m.ves)), loc: m.loc, qty: m.qty,
      chem: chemStrings(calc.chems[i]), phosphorPct: m.phosphorPct, sklad: m.sklad,
    }));
    const head = {
      name: name.trim() || karta?.name || "Новая шихтовая карта",
      plavkaNo: plavkaNo.trim(), alloyId: alloyId || undefined, oborot: oborot.trim(), naznachenie, osnovanie: osnovanie.trim(), note: note.trim(),
      date: docDate.trim() || karta?.date || new Date().toLocaleDateString("ru-RU"),
      materials: mats, files,
    };
    // Пометка о выданных позициях остаётся, пока такие позиции есть в карте; оформление её снимает.
    const status = oformit ? "Новая" as const : "На редактировании" as const;
    const stillIssued = (karta?.vydannyePozicii ?? []).filter(v => materials.some(m => isIssued(m) && m.nomenkl === v.nomenkl));
    const k: ShihtovayaKarta = karta
      ? { ...karta, ...head, status, vydannyePozicii: !oformit && stillIssued.length ? stillIssued : undefined }
      : {
        id: `sk-${Date.now()}`, ...head, status,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.fullName || currentUser?.name || "—",
      };
    onSave(k);
  };

  const subline = (m: MatRow) => {
    if (m.kind === "cup") return `P = ${str2(m.phosphorPct ?? 0)} %`;
    if (m.kind === "granuly") return "подобрать со склада";
    if (m.kind !== "sklad") return "";
    return [m.nomenkl, m.proba > 0 ? `проба ${probaPctText(m.proba)} %` : "", m.loc && m.loc !== "-" ? m.loc : ""].filter(Boolean).join(" · ");
  };

  const cols = 4 + shkEls.length + 1 + (ro ? 0 : 1);
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
              {oformitBlock && materials.length > 0 && <div className="text-red-600">Оформление недоступно: {oformitBlock}</div>}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="mr-auto"><Btn variant="success" onClick={() => save(true)} disabled={!!oformitBlock || badMass.length > 0}>Оформить</Btn></div>
            <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
            <Btn onClick={() => save()} disabled={badMass.length > 0}>Сохранить</Btn>
          </div>
        </div>
      )}
    >
      {karta && (
        <div className="flex items-center gap-2 mb-4">
          <Badge label={karta.status} group="shihta" />
          {karta.status === "Новая" && <span className="text-xs text-gray-500">Карта оформлена — доступна для выдачи на плавку</span>}
          {karta.status === "На редактировании" && !karta.vydannyePozicii?.length && <span className="text-xs text-gray-500">Карта сохранена, но не оформлена — недоступна для выдачи в плавку</span>}
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
        <Field label="Марка сплава" required={!ro} full>
          <Select value={alloyId} options={gradeOptions} optionLabel={gradeLabel} onChange={setAlloyId} disabled={ro} />
        </Field>
        <Field label="Номер плавки" required={!ro}><Input value={plavkaNo} onChange={v => setPlavkaNo(v.replace(/[^\d]/g, ""))} placeholder="1" disabled={ro} /></Field>
        <Field label="Дата документа" required={!ro}><Input value={docDate} onChange={setDocDate} placeholder="дд.мм.гггг" disabled={ro} /></Field>
        <Field label="Оборот">
          <Input value={oborot} onChange={setOborot} placeholder="число или «чистая»" disabled={ro} />
          {!oborotValid(oborot) && <div className="text-xs text-red-600 mt-1">Число или «чистая»</div>}
        </Field>
        <Field label="Назначение слитков" required={!ro}>
          <Select value={naznachenie} options={naznOptions} optionLabel={v => v || "Не выбрано"} onChange={setNaznachenie} disabled={ro} />
        </Field>
        <Field label="Основание" full><Input value={osnovanie} onChange={setOsnovanie} placeholder="Приказ, распоряжение" disabled={ro} /></Field>
        <Field label="Примечание" full><Textarea value={note} onChange={setNote} rows={2} placeholder={grade?.allowDeviation ? "Обязательно при отклонении состава от марки" : ""} disabled={ro} /></Field>
      </div>

      <div className="mb-5">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
        <MultiFileUpload files={files} onChange={setFiles} disabled={ro} />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Шихтовые материалы</h3>
          {!ro && (
            <div className="flex gap-2">
              <Btn size="sm" onClick={() => openPicker(null)}><Plus className="w-4 h-4" />Добавить со склада</Btn>
              <Btn size="sm" variant="secondary" onClick={() => setShowAddDop(true)}><Plus className="w-4 h-4" />Добавить доп. материал</Btn>
            </div>
          )}
        </div>

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
                  <th colSpan={4}></th>
                  <th colSpan={shkEls.length} className="px-3 pt-2 pb-1 text-center font-medium uppercase tracking-wide border-b border-gray-200">Содержание в чистоте, г</th>
                  <th colSpan={ro ? 1 : 2}></th>
                </tr>
              )}
              <tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200 whitespace-nowrap">
                <SortTh sortKey="mat" sort={matSort} onSort={toggleMatSort} className="px-3 py-2">Материал</SortTh>
                <SortTh sortKey="sklad" sort={matSort} onSort={toggleMatSort} className="px-3 py-2">Склад</SortTh>
                <SortTh sortKey="klass" sort={matSort} onSort={toggleMatSort} className="px-3 py-2">Класс</SortTh>
                <SortTh sortKey="ves" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Масса в шихту, г</SortTh>
                {shkEls.map(e => (
                  <SortTh key={e.id} sortKey={`el-${e.id}`} sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">{e.shortName}</SortTh>
                ))}
                <SortTh sortKey="dola" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Доля, %</SortTh>
                {!ro && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pg9.pageItems.map(m => {
                const ch = chemOfKey.get(m.key) ?? {};
                const err = massError(m);
                const ban = banReason(m, grade, naznachenie);
                const issued = isIssued(m);
                const hint = m.kind === "granuly";
                return (
                  <tr key={m.key} className={`hover:bg-gray-50 ${ban || issued ? "bg-red-50/60" : ""}`}>
                    <td className="px-3 py-2">
                      <div className={hint ? "italic text-gray-400" : "font-medium"}>{m.mat}</div>
                      {subline(m) && <div className={`text-xs text-gray-400 ${hint ? "italic" : ""}`}>{subline(m)}</div>}
                      {hint && !ro && <button onClick={() => openPicker(m.key)} className="mt-0.5 text-xs text-blue-600 hover:underline">Выбрать со склада</button>}
                      {issued && <div className="text-xs text-red-600">Выдана в другой операции — замените позицию</div>}
                      {ban && <div className="text-xs text-red-600">{ban}</div>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{m.sklad ?? <span className="text-gray-400">—</span>}</td>
                    <td className="px-3 py-2">{m.klass ? <KlassCode value={m.klass} /> : <span className="text-gray-400">—</span>}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {ro ? str2(num(m.ves)) : (
                        <div className="inline-block text-right">
                          <MassInput value={m.ves} onChange={v => setVes(m.key, v)} error={err} hint={m.maxVes != null ? `Вес позиции ${str2(m.maxVes)} г — можно взять часть` : undefined} />
                          {stockRest(m) != null && <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap font-normal">остаток на складе: {str2(stockRest(m)!)} г</div>}
                        </div>
                      )}
                    </td>
                    {shkEls.map(e => (
                      <td key={e.id} className="px-3 py-2 text-right text-gray-600">{(ch[e.id] ?? 0) > 0 ? str2(ch[e.id]) : "—"}</td>
                    ))}
                    <td className="px-3 py-2 text-right text-blue-600">{fmt2(calc.dola(idxOfKey.get(m.key) ?? 0))}</td>
                    {!ro && <td className="px-3 py-2 text-center">
                      <button onClick={() => setMaterials(prev => prev.filter(x => x.key !== m.key))} className="text-gray-400 hover:text-red-500 transition-colors" title="Убрать из карты"><X className="w-3.5 h-3.5" /></button>
                    </td>}
                  </tr>
                );
              })}
              <FillerRows count={pg9.fill} cols={cols} />
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50 text-sm divide-y divide-gray-200">
              <tr className="font-medium">
                <td className="px-3 py-2" colSpan={3}>Масса шихты, г <span className="text-xs font-normal text-gray-400">({materials.length} поз.)</span></td>
                <td className="px-3 py-2 text-right font-semibold">{str2(calc.mass)}</td>
                {shkEls.map(e => <td key={e.id} className="px-3 py-2 text-right text-gray-400">—</td>)}
                <td className="px-3 py-2 text-right text-blue-600">100,00</td>
                {!ro && <td></td>}
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium" colSpan={3}>Содержание в шихте, г</td>
                <td className="px-3 py-2 text-right text-gray-400">—</td>
                {shkEls.map(e => <td key={e.id} className="px-3 py-2 text-right">{calc.total(e.id) > 0 ? str2(calc.total(e.id)) : "—"}</td>)}
                <td colSpan={ro ? 1 : 2}></td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium" colSpan={3}>Содержание в шихте, % <span className="text-xs font-normal text-gray-400">(к массе без фосфора {str2(calc.base)} г)</span></td>
                <td className="px-3 py-2 text-right text-gray-400">—</td>
                {shkEls.map(e => {
                  const v = pctCell(e.id);
                  return <td key={e.id} className={`px-3 py-2 text-right ${v === "—" ? "text-gray-400" : "font-semibold"}`}>{v}</td>;
                })}
                <td colSpan={ro ? 1 : 2}></td>
              </tr>
              {grade && (["min", "max"] as const).map(k => (
                <tr key={k} className="text-gray-600">
                  <td className="px-3 py-2 font-medium" colSpan={3}>{k === "min" ? "Норма мин, %" : "Норма макс, %"} <span className="text-xs font-normal text-gray-400">({grade.name})</span></td>
                  <td className="px-3 py-2 text-right text-gray-400">—</td>
                  {shkEls.map(e => {
                    const v = rangeOf(e.id)?.[k];
                    return <td key={e.id} className="px-3 py-2 text-right">{v != null ? fmt2(v) : <span className="text-gray-400">—</span>}</td>;
                  })}
                  <td colSpan={ro ? 1 : 2}></td>
                </tr>
              ))}
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
            <span title={canPodbor ? undefined : "Выберите марку сплава и добавьте хотя бы один материал со склада"}>
              <Btn size="sm" variant="secondary" onClick={() => setShowPodbor(true)} disabled={!canPodbor}>
                <Wand2 className="w-4 h-4" /> Подобрать
              </Btn>
            </span>
          </div>
        )}

        {(showResult || ro || materials.length > 0) && (
          <div className="mt-4">
            {warnings.map(w => (
              <div key={w} className="mb-2 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{w}
              </div>
            ))}
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
                        <td className={`px-4 py-3 text-right font-semibold ${c.ok ? "text-gray-900" : "text-red-600"}`}>{fmt2(c.fact)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{c.min != null ? fmt2(c.min) : "—"}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{c.max != null ? fmt2(c.max) : "—"}</td>
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
          title={replaceRow ? `Выбрать со склада: ${replaceRow.mat} (${replaceRow.ves} г)` : "Добавить материал со склада"}
          toolbar={
            <div className="w-64">
              <Field label="Склад" required><Select value={pickSklad} options={sklady} onChange={setPickSklad} /></Field>
            </div>
          }
          rows={pickerRows}
          skladFilter={pickSklad}
          already={already}
          showWeights
          probaPct
          excludeKlass={[STONE_KLASS]}
          qtyLabel="Количество к выдаче"
          emptyText={`Нет доступных позиций на складе «${pickSklad}»`}
          addLabel="Добавить выбранные"
          onClose={closePicker}
          onAdd={replaceRow ? replaceHint : addFromSklad}
        />
      )}

      {showAddDop && (
        <DopMaterialModal
          onClose={() => setShowAddDop(false)}
          onAdd={row => { setMaterials(prev => [...prev, row]); setShowAddDop(false); show("Материал добавлен"); }}
        />
      )}

      {showPodbor && grade && (
        <PodborModal grade={grade} lines={materials.map(lineOf)} shortName={shortName} onClose={() => setShowPodbor(false)} onApply={applyPodbor} />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}

export function ShihtovyeKarty() {
  const { shihtovyeKarty, setShihtovyeKarty, setDmItems, alloyGrades } = useApp();
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [page, setPage] = useState(1);
  // Экраны: /shihtovye-karty/new, /view/:id, /edit/:id
  const screen = useScreen();
  const viewKarta = shihtovyeKarty.find(k => k.id === screen.after("view")) ?? null;
  const editKarta = shihtovyeKarty.find(k => k.id === screen.after("edit")) ?? null;
  const showNew = screen.has("new");
  const setViewKarta = (k: ShihtovayaKarta | null) => (k ? screen.openTop("view", k.id) : screen.close("view"));
  const setEditKarta = (k: ShihtovayaKarta | null) => (k ? screen.openTop("edit", k.id) : screen.close("edit"));
  const setShowNew = (open: boolean) => (open ? screen.openTop("new") : screen.close("new"));
  const [perPage, setPerPage] = usePerPage("shihtovye-karty", 8);
  const gradeName = (k: ShihtovayaKarta) => alloyGrades.find(g => g.id === k.alloyId)?.name ?? "";

  // Удаление невыполненной карты снимает резерв с её позиций ДМ
  const removeKarta = (karta: ShihtovayaKarta) => {
    if (karta.status !== "Выполнена") {
      const nomenkl = new Set(karta.materials.map(m => m.nomenkl).filter(Boolean));
      setDmItems(prev => reserveDm(prev, new Set(prev.filter(i => i.status === "Резерв" && nomenkl.has(i.nomenkl)).map(i => i.id)), [], [], Date.now()));
    }
    setShihtovyeKarty(prev => prev.filter(s => s.id !== karta.id));
    show(`Шихтовая карта «${karta.name}» удалена`);
  };

  const { sorted, sort, toggleSort } = useSort(shihtovyeKarty, {
    date: k => parseRuDate(k.date),
    name: k => k.name,
    grade: k => gradeName(k),
    plavkaNo: k => parseInt(k.plavkaNo, 10) || 0,
    status: k => k.status,
    createdAt: k => new Date(k.createdAt).getTime(),
  });

  return (
    <div>
      <PageHeader
        title="Шихтовые карты"
        subtitle="Расчёт состава шихты для плавки слитков"
        breadcrumb={["Шихтовые карты"]}
        actions={<Btn onClick={() => setShowNew(true)}><Plus className="w-4 h-4" />Новая шихтовая карта</Btn>}
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortTh sortKey="date" sort={sort} onSort={toggleSort}>Дата документа</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort}>Наименование</SortTh>
              <SortTh sortKey="grade" sort={sort} onSort={toggleSort}>Марка сплава</SortTh>
              <SortTh sortKey="plavkaNo" sort={sort} onSort={toggleSort}>№ плавки</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort}>Статус</SortTh>
              <SortTh sortKey="createdAt" sort={sort} onSort={toggleSort}>{CREATED_LABEL}</SortTh>
              <th className="w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.slice((page - 1) * perPage, page * perPage).map(karta => (
              <tr key={karta.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{karta.date}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{karta.name}</td>
                <td className="px-4 py-3 text-gray-700">{gradeName(karta) || <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-3 text-blue-600">{karta.plavkaNo}</td>
                <td className="px-4 py-3"><Badge label={karta.status} group="shihta" /></td>
                <CreatedCell row={karta} />
                <td className="px-4 py-3 flex items-center gap-1">
                  <EyeIcon onClick={() => setViewKarta(karta)} />
                  <EditIcon
                    onClick={() => setEditKarta(karta)}
                    disabled={karta.status !== "На редактировании"}
                    title={karta.status === "На редактировании" ? "Редактировать" : "Карта оформлена — редактирование недоступно"}
                  />
                  <DeleteIcon onClick={() => confirm(`Удалить шихтовую карту «${karta.name}»?`, () => removeKarta(karta))} />
                </td>
              </tr>
            ))}
            <FillerRows count={fillerCount(shihtovyeKarty.length, page, perPage)} cols={7} />
          </tbody>
        </table>
        <Pagination page={page} total={shihtovyeKarty.length} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
      </div>

      {viewKarta && <ShihtaConstructor key={viewKarta.id} karta={viewKarta} onClose={() => setViewKarta(null)} onSave={() => setViewKarta(null)} readOnly />}
      {editKarta && (
        <ShihtaConstructor
          key={editKarta.id}
          karta={editKarta}
          // Оформленная карта не редактируется — даже если открыта по прямой ссылке /edit/:id
          readOnly={editKarta.status !== "На редактировании"}
          onClose={() => setEditKarta(null)}
          onSave={k => {
            setShihtovyeKarty(prev => prev.map(s => s.id === k.id ? k : s));
            setEditKarta(null);
            show(k.status === "Новая" ? "Карта оформлена — доступна для выдачи на плавку" : "Карта сохранена");
          }}
        />
      )}
      {showNew && (
        <ShihtaConstructor
          onClose={() => setShowNew(false)}
          onSave={k => {
            setShihtovyeKarty(prev => [k, ...prev]);
            setShowNew(false);
            show(k.status === "Новая" ? "Шихтовая карта оформлена, позиции зарезервированы" : "Шихтовая карта сохранена в статусе «На редактировании»");
          }}
        />
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
