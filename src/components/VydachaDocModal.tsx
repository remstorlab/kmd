import React, { useMemo, useState } from "react";
import {
  Badge, Btn, Modal, DeleteIcon, ExportBtn, useToast, Toast, Field, Input, Select, KlassSelect, KlassCode,
  MultiFileUpload, SearchInput, SortTh, useSort,
} from "./ui";
import { SkladDoc, DocStatus, VydachaDocPosition, GPItem, DMItem, spravochniki, isGPKlass } from "../data/mock";
import { useApp } from "../store/AppContext";
import { Plus } from "lucide-react";

// ── Выдача со склада наружу (получателю) — единая для ГП и ДМ ─────────────────
// Не связана с «Движением материала»: это отгрузка стороннему получателю.

export type VydachaKind = "ГП" | "ДМ";

const DOC_TYPE: Record<VydachaKind, SkladDoc["type"]> = {
  "ГП": "Накладная на отгрузку ГП",
  "ДМ": "Накладная на отгрузку ДМ",
};

export const vydachaKindOf = (d: SkladDoc): VydachaKind => (d.type === "Накладная на отгрузку ГП" ? "ГП" : "ДМ");

const SKLADY_DM = spravochniki["Склады"].items.map(i => i.value);
const SENDERS: Record<VydachaKind, string[]> = { "ГП": ["Склад ГП"], "ДМ": SKLADY_DM };
const RECEIVERS = spravochniki["Организации"].items.map(i => i.value);

// Позиция склада в едином виде (из учёта ГП или ДМ)
type StockRow = Omit<VydachaDocPosition, "issue">;
type VydachaPosition = VydachaDocPosition;

const round2 = (v: number) => Math.round(v * 100) / 100;

// Списание выдаваемого количества: полностью выданная позиция закрывается,
// при частичной выдаче остаток остаётся на складе, а выданная часть
// выделяется в отдельную позицию со статусом «Закрыта».
function issueGp(items: GPItem[], issue: Map<string, number>, stamp: number): GPItem[] {
  return items.flatMap(it => {
    const q = issue.get(it.id);
    if (!q) return [it];
    if (q >= it.qty) return [{ ...it, status: "Закрыта" as const }];
    return [{ ...it, qty: it.qty - q }, { ...it, id: `${it.id}-v${stamp}`, qty: q, status: "Закрыта" as const }];
  });
}

function issueDm(items: DMItem[], issue: Map<string, number>, stamp: number): DMItem[] {
  return items.flatMap(it => {
    const q = issue.get(it.id);
    if (!q) return [it];
    if (q >= it.qty) return [{ ...it, status: "Закрыта" as const }];
    const k = q / it.qty;
    const issuedLig = round2(it.ligWeight * k);
    const issuedNet = round2(it.netWeight * k);
    return [
      { ...it, qty: it.qty - q, ligWeight: round2(it.ligWeight - issuedLig), netWeight: round2(it.netWeight - issuedNet) },
      { ...it, id: `${it.id}-v${stamp}`, qty: q, ligWeight: issuedLig, netWeight: issuedNet, status: "Закрыта" as const },
    ];
  });
}

const ALL_KLASS = "Все классы";
const ALL_CODES = "Все коды";
const ALL_LOCS = "Все места хранения";

// ── Подбор позиций со склада (чекбокс + количество к выдаче) ──────────────────

function PickStockModal({ kind, rows, already, onClose, onAdd }: {
  kind: VydachaKind;
  rows: StockRow[];
  already: Record<string, number>;
  onClose: () => void;
  onAdd: (picked: { row: StockRow; qty: number }[]) => void;
}) {
  const isDM = kind === "ДМ";
  const [search, setSearch] = useState("");
  const [klass, setKlass] = useState(ALL_KLASS);
  const [code, setCode] = useState(ALL_CODES);
  const [loc, setLoc] = useState(ALL_LOCS);
  const [onlySelected, setOnlySelected] = useState(false);
  const [selectedQty, setSelectedQty] = useState<Record<string, string>>({});

  // Остаток с учётом уже добавленного в документ
  const left = (r: StockRow) => r.qty - (already[r.id] ?? 0);
  const available = rows.filter(r => left(r) > 0);
  const codes = [ALL_CODES, ...Array.from(new Set(available.map(r => r.code))).sort()];
  const locations = [ALL_LOCS, ...Array.from(new Set(available.map(r => r.location))).sort()];

  const filtered = available.filter(r => {
    const q = search.trim().toLowerCase();
    return (!q || r.name.toLowerCase().includes(q) || r.nomenkl.toLowerCase().includes(q))
      && (klass === ALL_KLASS || r.klass === klass)
      && (code === ALL_CODES || r.code === code)
      && (loc === ALL_LOCS || r.location === loc)
      && (!onlySelected || r.id in selectedQty);
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    nomenkl: r => r.nomenkl,
    name: r => r.name,
    klass: r => r.klass,
    code: r => r.code,
    proba: r => r.proba ?? 0,
    lig: r => r.lig ?? 0,
    net: r => r.net ?? 0,
    location: r => r.location,
    qty: r => left(r),
  });

  const selectedCount = Object.keys(selectedQty).length;
  const allChecked = filtered.length > 0 && filtered.every(r => r.id in selectedQty);

  const toggle = (id: string) => setSelectedQty(prev => {
    const next = { ...prev };
    if (id in next) delete next[id]; else next[id] = "1";
    return next;
  });
  const toggleAll = () => setSelectedQty(prev => {
    const next = { ...prev };
    if (allChecked) filtered.forEach(r => delete next[r.id]);
    else filtered.forEach(r => { if (!(r.id in next)) next[r.id] = "1"; });
    return next;
  });
  const setQty = (id: string, v: string) => setSelectedQty(prev => (id in prev ? { ...prev, [id]: v.replace(/[^\d]/g, "") } : prev));

  const reset = () => { setSearch(""); setKlass(ALL_KLASS); setCode(ALL_CODES); setLoc(ALL_LOCS); setOnlySelected(false); };

  const add = () => {
    const picked = available
      .filter(r => r.id in selectedQty)
      .map(r => ({ row: r, qty: Math.max(1, Math.min(parseInt(selectedQty[r.id], 10) || 1, left(r))) }));
    if (picked.length) onAdd(picked);
  };

  return (
    <Modal
      title={`Добавить позиции со склада ${kind}`}
      onClose={onClose}
      extraWide
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={add} disabled={selectedCount === 0}>Добавить{selectedCount > 0 ? ` (${selectedCount})` : ""}</Btn>
      </>}
    >
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 grid grid-cols-4 gap-3 items-end">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Наименование / Номенкл. №</label>
          <SearchInput value={search} onChange={setSearch} placeholder="Поиск..." />
        </div>
        <Field label="Класс материала"><KlassSelect value={klass} onChange={setKlass} allLabel={ALL_KLASS} /></Field>
        <Field label="Код материала"><Select value={code} options={codes} onChange={setCode} /></Field>
        <div className="col-span-2">
          <Field label="Место хранения"><Select value={loc} options={locations} onChange={setLoc} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 h-9 cursor-pointer">
          <input type="checkbox" checked={onlySelected} onChange={e => setOnlySelected(e.target.checked)} className="w-4 h-4 accent-blue-600" />
          Только выбранные
        </label>
        <button onClick={reset} className="h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Сбросить фильтры</button>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>Найдено: {filtered.length} из {available.length}</span>
        <span>Выбрано: {selectedCount}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
          {available.length === 0 ? `Нет доступных позиций на складе ${kind}` : "Нет позиций по заданным фильтрам"}
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10"><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <th className="w-10 px-3 py-2"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 accent-blue-600" title="Выбрать все найденные" /></th>
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className="px-3 py-2">Номенкл. №</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="code" sort={sort} onSort={toggleSort} className="px-3 py-2">Код</SortTh>
              {isDM && <>
                <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className="px-3 py-2">Проба</SortTh>
                <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className="px-3 py-2">Лигат. г</SortTh>
                <SortTh sortKey="net" sort={sort} onSort={toggleSort} className="px-3 py-2">Чистый г</SortTh>
              </>}
              <SortTh sortKey="location" sort={sort} onSort={toggleSort} className="px-3 py-2">Место хранения</SortTh>
              <SortTh sortKey="qty" sort={sort} onSort={toggleSort} className="px-3 py-2">Доступно</SortTh>
              <th className="px-3 py-2 text-left w-28">Кол-во к выдаче</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(r => {
                const checked = r.id in selectedQty;
                return (
                  <tr key={r.id} className={`hover:bg-gray-50 ${checked ? "bg-blue-50/50" : ""}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={checked} onChange={() => toggle(r.id)} className="w-4 h-4 accent-blue-600" /></td>
                    <td className="px-3 py-2 text-gray-500">{r.nomenkl}</td>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2"><KlassCode value={r.klass} /></td>
                    <td className="px-3 py-2 text-blue-600">{r.code}</td>
                    {isDM && <>
                      <td className="px-3 py-2">{r.proba}</td>
                      <td className="px-3 py-2">{r.lig}</td>
                      <td className="px-3 py-2">{r.net}</td>
                    </>}
                    <td className="px-3 py-2 text-gray-500">{r.location}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{left(r)} {r.unit}</td>
                    <td className="px-3 py-2"><Input value={selectedQty[r.id] ?? ""} onChange={v => setQty(r.id, v)} placeholder="1" disabled={!checked} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

// ── Накладная на отгрузку ────────────────────────────────────────────────────

export default function VydachaDocModal({ onClose, onSave, doc, readOnly = false, kind: fixedKind }: {
  onClose: () => void;
  onSave: (d: SkladDoc) => void;
  doc?: SkladDoc | null;
  readOnly?: boolean;
  // Склад фиксирован (вызов из «Остатки на складе ГП/ДМ»); без него — выбор в «Тип документа»
  kind?: VydachaKind;
}) {
  const ro = readOnly;
  // Оформленная накладная: позиции уже выданы и закрыты — состав менять нельзя
  const issued = doc?.status === "Оформлено";
  const lockPos = ro || issued;
  const { gpItems, dmItems, setGpItems, setDmItems } = useApp();
  const { toast, show, clear } = useToast();
  const [kind, setKind] = useState<VydachaKind>(fixedKind ?? (doc ? vydachaKindOf(doc) : "ГП"));
  const isDM = kind === "ДМ";
  const today = new Date().toLocaleDateString("ru-RU");

  const [head, setHead] = useState(() => ({
    number: doc?.number || `НО-${Math.floor(Math.random() * 900 + 100)}`,
    date: doc?.date || today,
    sender: doc?.sender && SENDERS[kind].includes(doc.sender) ? doc.sender : SENDERS[kind][0],
    receiver: doc?.receiver || RECEIVERS[0],
    schetFaktura: "",
    schetFakturaDate: today,
    dogovor: "",
    doverennost: "",
    osnovanie: "",
  }));
  const h = (k: keyof typeof head) => (v: string) => setHead(x => ({ ...x, [k]: v }));
  const [files, setFiles] = useState<File[]>(() => (doc ? [new File([], `Накладная_${doc.number}.pdf`)] : []));
  const [positions, setPositions] = useState<VydachaPosition[]>(() => doc?.positions ?? []);
  const [showPick, setShowPick] = useState(false);

  // Остатки склада: ГП — класс «Готовая продукция», ДМ — все остальные (из обоих учётов)
  const stock = useMemo<StockRow[]>(() => {
    const fromGp: StockRow[] = gpItems.map(i => ({ id: i.id, src: "gp", nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.code, qty: i.qty, unit: i.unit, proba: null, lig: null, net: null, location: i.location }));
    const fromDm: StockRow[] = dmItems.map(i => ({ id: i.id, src: "dm", nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.metal, qty: i.qty, unit: "шт", proba: i.proba, lig: i.ligWeight, net: i.netWeight, location: i.location }));
    const available = [
      ...gpItems.filter(i => i.status === "На складе").map(i => i.id),
      ...dmItems.filter(i => i.status === "На складе").map(i => i.id),
    ];
    return [...fromGp, ...fromDm].filter(r => available.includes(r.id) && r.qty > 0 && (isDM ? !isGPKlass(r.klass) : isGPKlass(r.klass)));
  }, [gpItems, dmItems, isDM]);

  const already = Object.fromEntries(positions.map(p => [p.id, p.issue]));

  const addPicked = (picked: { row: StockRow; qty: number }[]) => {
    setPositions(prev => {
      const next = [...prev];
      for (const { row, qty } of picked) {
        const idx = next.findIndex(p => p.id === row.id);
        if (idx >= 0) next[idx] = { ...next[idx], issue: Math.min(next[idx].issue + qty, row.qty) };
        else next.push({ ...row, issue: qty });
      }
      return next;
    });
    setShowPick(false);
    show(`Добавлено позиций: ${picked.length}`);
  };

  const setIssue = (id: string, v: string) =>
    setPositions(prev => prev.map(p => p.id === id ? { ...p, issue: Math.max(1, Math.min(parseInt(v.replace(/[^\d]/g, ""), 10) || 1, p.qty)) } : p));

  const changeKind = (k: VydachaKind) => {
    if (k === kind) return;
    setKind(k);
    setPositions([]);
    setHead(x => ({ ...x, sender: SENDERS[k][0] }));
  };

  const { sorted, sort, toggleSort } = useSort(positions, {
    nomenkl: p => p.nomenkl,
    name: p => p.name,
    klass: p => p.klass,
    code: p => p.code,
    issue: p => p.issue,
    lig: p => p.lig ?? 0,
    net: p => p.net ?? 0,
    location: p => p.location,
  });

  const totalQty = positions.reduce((s, p) => s + p.issue, 0);
  // Для ДМ массы пересчитываем пропорционально выдаваемому количеству
  const share = (p: VydachaPosition, v: number | null) => (v == null ? 0 : (v * p.issue) / (p.qty || 1));
  const totalLig = positions.reduce((s, p) => s + share(p, p.lig), 0);
  const totalNet = positions.reduce((s, p) => s + share(p, p.net), 0);

  const save = (status: DocStatus) => {
    // Списание выполняется один раз — при первом оформлении документа
    if (status === "Оформлено" && !issued) {
      if (positions.length === 0) { show("Добавьте хотя бы одну позицию"); return; }
      const lacking = positions.filter(p => {
        const it = p.src === "gp" ? gpItems.find(i => i.id === p.id) : dmItems.find(i => i.id === p.id);
        return !it || it.status !== "На складе" || it.qty < p.issue;
      });
      if (lacking.length) {
        show(`Недостаточно остатка на складе: ${lacking.map(p => p.name).join(", ")}`);
        return;
      }
      const stamp = Date.now();
      const gpIssue = new Map(positions.filter(p => p.src === "gp").map(p => [p.id, p.issue]));
      const dmIssue = new Map(positions.filter(p => p.src === "dm").map(p => [p.id, p.issue]));
      if (gpIssue.size) setGpItems(prev => issueGp(prev, gpIssue, stamp));
      if (dmIssue.size) setDmItems(prev => issueDm(prev, dmIssue, stamp));
    }
    onSave({
      id: doc?.id ?? `vd-${Date.now()}`,
      date: head.date,
      type: DOC_TYPE[kind],
      number: head.number,
      status,
      sender: head.sender,
      receiver: head.receiver,
      positions,
    });
  };

  const receivers = Array.from(new Set([head.receiver, ...RECEIVERS]));

  return (
    <Modal
      title={`Накладная на отгрузку ${kind}${doc ? ` ${doc.number}` : ""}`}
      onClose={onClose}
      extraWide
      footer={ro ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn> : issued ? <>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={() => save("Оформлено")}>Сохранить</Btn>
      </> : <>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={() => save("Оформлено")}>Оформить</Btn>
        <Btn variant="secondary" onClick={() => save("Редактирование")}>Сохранить</Btn>
      </>}
    >
      {issued && (
        <div className="mb-4 text-sm bg-gray-50 border border-gray-200 text-gray-600 rounded-lg px-4 py-2.5">
          Накладная оформлена: позиции выданы со склада и переведены в статус «Закрыта». Состав позиций изменить нельзя.
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Field label="Тип документа">
          <Select
            value={DOC_TYPE[kind]}
            options={[DOC_TYPE["ГП"], DOC_TYPE["ДМ"]]}
            onChange={v => changeKind(v === DOC_TYPE["ГП"] ? "ГП" : "ДМ")}
            disabled={ro || !!fixedKind || !!doc}
          />
        </Field>
        <Field label="Номер"><Input value={head.number} onChange={h("number")} disabled={ro} /></Field>
        <Field label="Дата"><Input value={head.date} onChange={h("date")} disabled={ro} /></Field>
        <Field label="Склад-отправитель"><Select value={head.sender} options={Array.from(new Set([head.sender, ...SENDERS[kind]]))} onChange={h("sender")} disabled={ro} /></Field>
        <Field label="Получатель"><Select value={head.receiver} options={receivers} onChange={h("receiver")} disabled={ro} /></Field>
        <Field label="Доверенность получателя"><Input value={head.doverennost} onChange={h("doverennost")} placeholder="№ и дата доверенности" disabled={ro} /></Field>
        <Field label="№ счёт-фактуры"><Input value={head.schetFaktura} onChange={h("schetFaktura")} placeholder="СФ-XXXX" disabled={ro} /></Field>
        <Field label="Дата счёт-фактуры"><Input value={head.schetFakturaDate} onChange={h("schetFakturaDate")} disabled={ro} /></Field>
        <Field label="Номер договора"><Input value={head.dogovor} onChange={h("dogovor")} placeholder="ДОГ-XXXX" disabled={ro} /></Field>
        <div className="col-span-3">
          <Field label="Основание выдачи"><Input value={head.osnovanie} onChange={h("osnovanie")} placeholder="Например: реализация по договору" disabled={ro} /></Field>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Документы</h4>
        <MultiFileUpload files={files} onChange={setFiles} disabled={ro} />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции для выдачи</h3>
          <div className="flex gap-2">
            {!lockPos && <Btn size="sm" onClick={() => setShowPick(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>}
            <ExportBtn onToast={show} />
          </div>
        </div>
        {positions.length === 0 ? (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
            Список позиций для выдачи пуст
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className="px-3 py-2">Номенкл. №</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="code" sort={sort} onSort={toggleSort} className="px-3 py-2">Код</SortTh>
              <SortTh sortKey="issue" sort={sort} onSort={toggleSort} className="px-3 py-2">Кол-во</SortTh>
              {isDM && <>
                <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className="px-3 py-2">Лигат. г</SortTh>
                <SortTh sortKey="net" sort={sort} onSort={toggleSort} className="px-3 py-2">Чистый г</SortTh>
              </>}
              <SortTh sortKey="location" sort={sort} onSort={toggleSort} className="px-3 py-2">Место хранения</SortTh>
              <th className="px-3 py-2 text-left">Статус</th>
              {!lockPos && <th className="w-12"></th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2"><KlassCode value={p.klass} /></td>
                  <td className="px-3 py-2 text-blue-600">{p.code}</td>
                  <td className="px-3 py-2 w-32">
                    {lockPos ? `${p.issue} ${p.unit}` : (
                      <div className="flex items-center gap-1.5">
                        <Input value={String(p.issue)} onChange={v => setIssue(p.id, v)} />
                        <span className="text-xs text-gray-400 whitespace-nowrap">/ {p.qty}</span>
                      </div>
                    )}
                  </td>
                  {isDM && <>
                    <td className="px-3 py-2">{share(p, p.lig).toFixed(2)}</td>
                    <td className="px-3 py-2 text-blue-600">{share(p, p.net).toFixed(2)}</td>
                  </>}
                  <td className="px-3 py-2 text-gray-500">{p.location}</td>
                  <td className="px-3 py-2"><Badge label={issued ? "Закрыта" : "К выдаче"} /></td>
                  {!lockPos && <td className="px-3 py-2"><DeleteIcon onClick={() => setPositions(prev => prev.filter(x => x.id !== p.id))} /></td>}
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t border-gray-200 bg-gray-50 text-sm font-medium">
              <td className="px-3 py-2" colSpan={4}>Итого: {positions.length} поз.</td>
              <td className="px-3 py-2">{totalQty}</td>
              {isDM && <>
                <td className="px-3 py-2">{totalLig.toFixed(2)}</td>
                <td className="px-3 py-2 text-blue-600">{totalNet.toFixed(2)}</td>
              </>}
              <td colSpan={lockPos ? 2 : 3}></td>
            </tr></tfoot>
          </table>
        )}
      </div>

      {showPick && (
        <PickStockModal kind={kind} rows={stock} already={already} onClose={() => setShowPick(false)} onAdd={addPicked} />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}
