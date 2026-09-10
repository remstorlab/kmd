import React, { useState, useEffect } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, PageHeader,
  ExportBtn, useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, Tabs, Textarea, FileChip, SortTh, useSort, parseRuDate,
} from "../components/ui";
import { Operation, ShihtovayaKarta } from "../data/mock";
import { Eye, Plus, Paperclip } from "lucide-react";

// ── Списание разницы modal ────────────────────────────────────────────────────

function SpisanieModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [reason, setReason] = useState("");
  const [hasFile, setHasFile] = useState(false);
  const { toast, show, clear } = useToast();

  return (
    <Modal title="Списание разницы" onClose={onClose} footer={
      <>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <button
          onClick={hasFile && reason ? onConfirm : undefined}
          disabled={!hasFile || !reason}
          className="px-4 py-2 rounded-lg border border-red-500 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Списать разницу
        </button>
      </>
    }>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-2 mb-4 text-sm">
        <span className="text-yellow-600">⚠</span>
        <span className="text-yellow-800 font-medium">Превышение допустимой дельты: +2.35 г</span>
      </div>
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">Причина списания</label>
        <Textarea value={reason} onChange={setReason} placeholder="Укажите причину списания разницы весов…" rows={4} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Акт списания (обязательно)</label>
        {hasFile ? (
          <FileChip name="Акт списания ДМ-000123.pdf" onDownload={() => show("Загрузка файла...")} />
        ) : (
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => setHasFile(true)}
          >
            <Paperclip className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Прикрепите файл акта списания<br /><span className="text-xs text-gray-400">PDF, DOCX — до 10 МБ</span></p>
          </div>
        )}
      </div>
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}

// ── Добавить позицию ДМ со склада ─────────────────────────────────────────────

type OperPosition = { n: number; name: string; nomenkl: string; klass: string; proba: number; ves: number; ag: string; cu: string; loc: string };

function AddDMPositionModal({ onClose, onAdd }: { onClose: () => void; onAdd: (rows: Omit<OperPosition, "n">[]) => void }) {
  const { dmItems } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const availableItems = dmItems.filter(i => i.status === "На складе");

  const { sorted, sort, toggleSort } = useSort(availableItems, {
    name: i => i.name,
    nomenkl: i => i.nomenkl,
    klass: i => i.klass,
    proba: i => i.proba,
    netWeight: i => i.netWeight,
    location: i => i.location,
  });

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const add = () => {
    const chosen = availableItems.filter(i => selected.has(i.id));
    if (chosen.length === 0) return;
    onAdd(chosen.map(i => ({ name: i.name, nomenkl: i.nomenkl, klass: i.klass, proba: i.proba, ves: i.netWeight, ag: "-", cu: "-", loc: i.location })));
  };

  return (
    <Modal
      title="Добавить позицию ДМ со склада"
      onClose={onClose}
      wide
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={add} disabled={selected.size === 0}>Добавить{selected.size > 0 ? ` (${selected.size})` : ""}</Btn>
      </>}
    >
      {availableItems.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
          Нет доступных позиций на складе ДМ
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0"><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <th className="w-10 px-3 py-2"></th>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className="px-3 py-2">Номенкл.№</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className="px-3 py-2">Проба</SortTh>
              <SortTh sortKey="netWeight" sort={sort} onSort={toggleSort} className="px-3 py-2">Чистый вес г</SortTh>
              <SortTh sortKey="location" sort={sort} onSort={toggleSort} className="px-3 py-2">Размещение</SortTh>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(i => {
                const checked = selected.has(i.id);
                return (
                  <tr key={i.id} className={`hover:bg-gray-50 ${checked ? "bg-blue-50/50" : ""}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={checked} onChange={() => toggle(i.id)} className="w-4 h-4 accent-blue-600" /></td>
                    <td className="px-3 py-2 font-medium">{i.name}</td>
                    <td className="px-3 py-2 text-gray-500">{i.nomenkl}</td>
                    <td className="px-3 py-2">{i.klass}</td>
                    <td className="px-3 py-2">{i.proba}</td>
                    <td className="px-3 py-2">{i.netWeight}</td>
                    <td className="px-3 py-2 text-gray-500">{i.location}</td>
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

// ── Выдача по шихтовой карте ──────────────────────────────────────────────────

function ShihtaPickModal({ onClose, onPick }: { onClose: () => void; onPick: (k: ShihtovayaKarta) => void }) {
  const { shihtovyeKarty } = useApp();
  const available = shihtovyeKarty.filter(k => k.status === "Новая");

  return (
    <Modal title="Выдача по шихтовой карте" onClose={onClose} footer={<Btn variant="secondary" onClick={onClose}>Отмена</Btn>}>
      {available.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
          Нет шихтовых карт в статусе «Новая»
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
          {available.map(k => (
            <button
              key={k.id}
              onClick={() => onPick(k)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-gray-900">{k.name}</div>
                <div className="text-xs text-gray-400">{k.plavkaNo} · {k.date}</div>
              </div>
              <Badge label={k.status} />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Operation modal ───────────────────────────────────────────────────────────

type TabName = "Выдача" | "Возврат" | "Итого";

const vydachaPositions = [
  { n: 1, name: "Слиток золота ЗлА-1", nomenkl: "DM-001", klass: "Слиток", proba: 999, ves: 500.25, ag: "-", cu: "-", loc: "Сейф №1, Полка А" },
  { n: 2, name: "Стружка золотая", nomenkl: "DM-003", klass: "Стружка", proba: 585, ves: 45.80, ag: "0.12", cu: "1.20", loc: "Сейф №2, Полка А" },
];
const vozvratPositions = [
  { n: 1, name: "Подкат 30х20", nomenkl: "DM-R01", klass: "Подкат", proba: 999, ves: 480.10, ag: "-", cu: "-", loc: "Сейф №1, Полка Б" },
  { n: 2, name: "Королёк №1", nomenkl: "DM-R02", klass: "Королёк", proba: 999, ves: 55.60, ag: "-", cu: "-", loc: "Сейф №2, Полка Б" },
  { n: 3, name: "Шлак золотосодержащий", nomenkl: "DM-R03", klass: "Шлак", proba: 500, ves: 8.00, ag: "0.05", cu: "2.10", loc: "Сейф №3, Полка А" },
];

function OperModal({ op, onClose, onSave, readOnly = false }: { op?: Operation | null; onClose: () => void; onSave: (o: Operation) => void; readOnly?: boolean }) {
  const [tab, setTab] = useState<TabName>("Выдача");
  const [vid, setVid] = useState<"Отбор пробы" | "Анализ в ЛКИ" | "Плавка" | "Гальванопокрытие" | "Производство ГП">(op?.vid || "Плавка");
  const [type, setType] = useState<"Выдача" | "Возврат" | "Выдача-Возврат">(op?.type || "Выдача");
  const [vydacha, setVydacha] = useState<OperPosition[]>(op ? vydachaPositions : []);
  const [vozvrat, setVozvrat] = useState<OperPosition[]>(op ? vozvratPositions : []);
  const [showSpisanie, setShowSpisanie] = useState(false);
  const [addDMTarget, setAddDMTarget] = useState<null | "vydacha" | "vozvrat">(null);
  const [showShihtaPick, setShowShihtaPick] = useState(false);
  const { toast, show, clear } = useToast();

  const appendPositions = (target: "vydacha" | "vozvrat", rows: Omit<OperPosition, "n">[]) => {
    const setFn = target === "vydacha" ? setVydacha : setVozvrat;
    setFn(prev => {
      const maxN = prev.reduce((m, p) => Math.max(m, p.n), 0);
      return [...prev, ...rows.map((r, i) => ({ n: maxN + i + 1, ...r }))];
    });
  };

  const { sorted: sortedVydacha, sort: vydachaSort, toggleSort: toggleVydachaSort } = useSort(vydacha, {
    name: p => p.name,
    nomenkl: p => p.nomenkl,
    klass: p => p.klass,
    proba: p => p.proba,
    ves: p => p.ves,
    ag: p => p.ag,
    cu: p => p.cu,
    loc: p => p.loc,
  });
  const { sorted: sortedVozvrat, sort: vozvratSort, toggleSort: toggleVozvratSort } = useSort(vozvrat, {
    name: p => p.name,
    nomenkl: p => p.nomenkl,
    klass: p => p.klass,
    proba: p => p.proba,
    ves: p => p.ves,
    ag: p => p.ag,
    cu: p => p.cu,
  });

  const [head, setHead] = useState(() => ({
    docType: op ? "Приказ" : "",
    document: op?.document || "",
    date: op?.date || new Date().toLocaleDateString("ru-RU"),
    zakazchik: op ? "Монетный двор" : "",
    responsible: op?.responsible || "",
    material: op ? "Золото (Au)" : "",
    plavkaNo: op ? "П-2026-0089" : "",
    vydal: op ? "Ким Александр Юрьевич" : "",
    poluchil: op?.responsible || "",
  }));

  // Blank options list for a brand-new operation so pickers start unselected.
  const withBlank = (opts: string[]) => (op ? opts : ["", ...opts]);

  const delta = -10.35;
  const deltaSign = delta >= 0 ? "+" : "";
  const inNorm = Math.abs(delta) <= 5;

  const save = () => {
    const o: Operation = {
      id: op?.id || `op-${Date.now()}`,
      date: head.date,
      type: type as any,
      vid: vid as any,
      positions: vydacha.length,
      document: head.document,
      responsible: head.responsible,
      statusVydacha: "Выдано",
      statusVozvrat: "Не начат",
      statusClose: "Не закрыто",
    };
    onSave(o);
  };

  return (
    <Modal
      title={`Движение материала${op ? ` — ${op.vid}` : vid ? ` — ${vid}` : ""}`}
      onClose={onClose}
      extraWide
      footer={readOnly ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn> : (
        <>
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn variant="secondary" onClick={save}>Сохранить и печать</Btn>
          <Btn onClick={save}>Сохранить</Btn>
        </>
      )}
    >
      {/* Status badges for saved ops */}
      {op && (
        <div className="flex gap-2 mb-4">
          <Badge label={op.statusVydacha} />
          <Badge label={op.statusVozvrat === "Не начат" ? "Не начат" : `Возврат: ${op.statusVozvrat}`} />
          <Badge label={op.statusClose} />
        </div>
      )}

      {/* Fields */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Field label="Тип операции">
          <Select value={type} options={["Выдача", "Возврат", "Выдача-Возврат"]} onChange={v => setType(v as any)} disabled={readOnly || !!op} />
        </Field>
        <Field label="Вид">
          <Select value={vid} options={["Отбор пробы", "Анализ в ЛКИ", "Плавка", "Гальванопокрытие", "Производство ГП"]} onChange={v => setVid(v as any)} disabled={readOnly || !!op} />
        </Field>
        <Field label="Тип документа"><Select value={head.docType} options={withBlank(["Приказ", "Заказ-наряд"])} onChange={v => setHead(h => ({ ...h, docType: v }))} disabled={readOnly} /></Field>
        <Field label="Номер документа"><Input value={head.document} onChange={v => setHead(h => ({ ...h, document: v }))} disabled={readOnly || !!op} /></Field>
        <Field label="Дата операции"><Input value={head.date} onChange={v => setHead(h => ({ ...h, date: v }))} disabled={readOnly} /></Field>
        <Field label="Заказчик"><Select value={head.zakazchik} options={withBlank(["Монетный двор"])} onChange={v => setHead(h => ({ ...h, zakazchik: v }))} disabled={readOnly} /></Field>
        <Field label="Подотчётное лицо" full><Select value={head.responsible} options={withBlank(["Нурланов Асхат Бекович", "Петров Сергей Владимирович", "Иванова Мария Сергеевна"])} onChange={v => setHead(h => ({ ...h, responsible: v }))} disabled={readOnly} /></Field>
        {vid === "Плавка" && <>
          <Field label="Материал"><Select value={head.material} options={withBlank(["Золото (Au)", "Серебро (Ag)", "Платина (Pt)"])} onChange={v => setHead(h => ({ ...h, material: v }))} disabled={readOnly} /></Field>
          <Field label="Номер плавки"><Input value={head.plavkaNo} onChange={v => setHead(h => ({ ...h, plavkaNo: v }))} disabled={readOnly} /></Field>
        </>}
        <Field label="Выдал"><Select value={head.vydal} options={withBlank(["Ким Александр Юрьевич", "Жумабаев Даурен"])} onChange={v => setHead(h => ({ ...h, vydal: v }))} disabled={readOnly} /></Field>
        <Field label="Получил"><Select value={head.poluchil} options={withBlank(["Нурланов Асхат Бекович", "Петров Сергей Владимирович"])} onChange={v => setHead(h => ({ ...h, poluchil: v }))} disabled={readOnly} /></Field>
      </div>

      {/* Tabs */}
      <Tabs tabs={["Выдача", "Возврат", "Итого"]} active={tab} onChange={t => setTab(t as TabName)} />

      {tab === "Выдача" && (
        <>
          {!readOnly && (
            <div className="flex gap-2 mb-3">
              {vid === "Плавка" ? (
                <>
                  <Btn size="sm" onClick={() => setShowShihtaPick(true)}><Plus className="w-4 h-4" />Выдать по ШК</Btn>
                  <Btn size="sm" variant="secondary" onClick={() => setAddDMTarget("vydacha")}><Plus className="w-4 h-4" />Добавить</Btn>
                </>
              ) : (
                <Btn size="sm" onClick={() => setAddDMTarget("vydacha")}><Plus className="w-4 h-4" />Добавить позицию</Btn>
              )}
              <ExportBtn onToast={show} />
            </div>
          )}
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <th className="px-3 py-2 text-left">№</th>
              <SortTh sortKey="name" sort={vydachaSort} onSort={toggleVydachaSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="nomenkl" sort={vydachaSort} onSort={toggleVydachaSort} className="px-3 py-2">Номенкл.№</SortTh>
              <SortTh sortKey="klass" sort={vydachaSort} onSort={toggleVydachaSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="proba" sort={vydachaSort} onSort={toggleVydachaSort} className="px-3 py-2">Проба</SortTh>
              <SortTh sortKey="ves" sort={vydachaSort} onSort={toggleVydachaSort} className="px-3 py-2">Вес г</SortTh>
              <SortTh sortKey="ag" sort={vydachaSort} onSort={toggleVydachaSort} className="px-3 py-2">Ag</SortTh>
              <SortTh sortKey="cu" sort={vydachaSort} onSort={toggleVydachaSort} className="px-3 py-2">Cu</SortTh>
              <SortTh sortKey="loc" sort={vydachaSort} onSort={toggleVydachaSort} className="px-3 py-2">Размещение</SortTh>
              {!readOnly && <th className="w-16"></th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sortedVydacha.map(p => (
                <tr key={p.n} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400">{p.n}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                  <td className="px-3 py-2">{p.klass}</td>
                  <td className="px-3 py-2">{p.proba}</td>
                  <td className="px-3 py-2 font-medium">{p.ves}</td>
                  <td className="px-3 py-2 text-gray-400">{p.ag}</td>
                  <td className="px-3 py-2 text-gray-400">{p.cu}</td>
                  <td className="px-3 py-2 text-gray-500">{p.loc}</td>
                  {!readOnly && <td className="px-3 py-2"><DeleteIcon onClick={() => setVydacha(prev => prev.filter(x => x.n !== p.n))} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
          {vid === "Плавка" && (
            <div className="mt-3 flex items-center gap-2">
              <FileChip name="Приказ-001234.pdf" onDownload={() => show("Загрузка файла...")} />
            </div>
          )}
        </>
      )}

      {tab === "Возврат" && (
        <>
          {!readOnly && (
            <div className="flex gap-2 mb-3">
              <Btn size="sm" onClick={() => setAddDMTarget("vozvrat")}><Plus className="w-4 h-4" />Добавить позицию</Btn>
              <ExportBtn onToast={show} />
            </div>
          )}
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <th className="px-3 py-2 text-left">№</th>
              <SortTh sortKey="name" sort={vozvratSort} onSort={toggleVozvratSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="nomenkl" sort={vozvratSort} onSort={toggleVozvratSort} className="px-3 py-2">Номенкл.№</SortTh>
              <SortTh sortKey="klass" sort={vozvratSort} onSort={toggleVozvratSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="proba" sort={vozvratSort} onSort={toggleVozvratSort} className="px-3 py-2">Проба</SortTh>
              <SortTh sortKey="ves" sort={vozvratSort} onSort={toggleVozvratSort} className="px-3 py-2">Вес г</SortTh>
              <SortTh sortKey="ag" sort={vozvratSort} onSort={toggleVozvratSort} className="px-3 py-2">Ag</SortTh>
              <SortTh sortKey="cu" sort={vozvratSort} onSort={toggleVozvratSort} className="px-3 py-2">Cu</SortTh>
              {!readOnly && <th className="w-16"></th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sortedVozvrat.map(p => (
                <tr key={p.n} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400">{p.n}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                  <td className="px-3 py-2">{p.klass}</td>
                  <td className="px-3 py-2">{p.proba}</td>
                  <td className="px-3 py-2 font-medium">{p.ves}</td>
                  <td className="px-3 py-2 text-gray-400">{p.ag}</td>
                  <td className="px-3 py-2 text-gray-400">{p.cu}</td>
                  {!readOnly && <td className="px-3 py-2"><DeleteIcon onClick={() => setVozvrat(prev => prev.filter(x => x.n !== p.n))} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex items-center gap-2">
            <FileChip name="МСЛ-001234.pdf" onDownload={() => show("Загрузка файла...")} />
          </div>
        </>
      )}

      {tab === "Итого" && (
        <>
          <div className={`flex items-center justify-between rounded-lg px-4 py-3 mb-5 border ${inNorm ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            <div className="flex items-center gap-2">
              <span className={inNorm ? "text-green-600" : "text-yellow-600"}>{inNorm ? "✓" : "⚠"}</span>
              <span className={`font-medium text-sm ${inNorm ? "text-green-800" : "text-yellow-800"}`}>
                Дельта: {deltaSign}{Math.abs(delta)} г (допуск: ±5 г) {inNorm ? "— В норме!" : "— Превышение!"}
              </span>
            </div>
            {!inNorm && (
              <button
                onClick={() => setShowSpisanie(true)}
                className="px-3 py-1.5 border border-red-500 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
              >
                Списать разницу
              </button>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
              Операция 1 — Плавка золотых слитков
            </div>
            <div className="p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Выдача</div>
              {vydacha.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <div className="text-sm text-gray-900">{p.name} <span className="text-gray-400 text-xs">{p.nomenkl}</span></div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{p.ves} г</span>
                    <Badge label="Преобразован" />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-center py-2 text-gray-400 text-xs">↓ связь ↓</div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Возврат</div>
              {vozvrat.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <div className="text-sm text-gray-900">{p.name} <span className="text-gray-400 text-xs">{p.nomenkl}</span></div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{p.ves} г</span>
                    <Badge label={i === 0 ? "Без изменений" : i === 2 ? "Новая" : "Без изменений"} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showSpisanie && (
        <SpisanieModal
          onClose={() => setShowSpisanie(false)}
          onConfirm={() => { setShowSpisanie(false); show("Разница списана"); onSave({ ...op!, statusClose: "Закрыто: списано" }); }}
        />
      )}
      {addDMTarget && (
        <AddDMPositionModal
          onClose={() => setAddDMTarget(null)}
          onAdd={rows => { appendPositions(addDMTarget, rows); setAddDMTarget(null); show("Позиции добавлены"); }}
        />
      )}
      {showShihtaPick && (
        <ShihtaPickModal
          onClose={() => setShowShihtaPick(false)}
          onPick={k => {
            appendPositions("vydacha", k.materials.map(m => ({ ...m, ag: "-", cu: "-" })));
            setHead(h => ({ ...h, plavkaNo: k.plavkaNo }));
            setShowShihtaPick(false);
            show(`Позиции шихтовой карты «${k.name}» добавлены`);
          }}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}

// ── Реестр операций ───────────────────────────────────────────────────────────

export function DvizhenieMateriаla() {
  const { operations, setOperations, pageParams } = useApp();
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [page, setPage] = useState(1);
  const [filterVid, setFilterVid] = useState("Все виды");
  const [search, setSearch] = useState("");
  const [viewOp, setViewOp] = useState<Operation | null>(null);
  const [editOp, setEditOp] = useState<Operation | null>(null);
  const [showNew, setShowNew] = useState(false);
  const perPage = 8;

  useEffect(() => {
    if (pageParams.openNew) setShowNew(true);
  }, [pageParams.openNew]);

  const filtered = operations.filter(o => {
    const matchSearch = !search || o.document.toLowerCase().includes(search.toLowerCase()) || o.responsible.toLowerCase().includes(search.toLowerCase());
    const matchVid = filterVid === "Все виды" || o.vid === filterVid;
    return matchSearch && matchVid;
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    date: o => parseRuDate(o.date),
    type: o => o.type,
    vid: o => o.vid,
    positions: o => o.positions,
    document: o => o.document,
    responsible: o => o.responsible,
    statusVydacha: o => o.statusVydacha,
  });

  const typeColor: Record<string, string> = {
    "Выдача": "text-green-600",
    "Возврат": "text-blue-600",
    "Выдача-Возврат": "text-orange-500",
  };

  return (
    <div>
      <PageHeader
        title="Движение материала"
        subtitle="Выдача и возврат материалов подотчётным лицам"
        breadcrumb={["Движение материала", "Реестр операций"]}
        actions={
          <>
            <Btn variant="secondary" onClick={() => setShowNew(true)}>Оформить возврат</Btn>
            <Btn onClick={() => setShowNew(true)}>Новая операция</Btn>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Документ / Подотчётник</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="min-w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Вид операции</label>
          <select value={filterVid} onChange={e => setFilterVid(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {["Все виды", "Отбор пробы", "Анализ в ЛКИ", "Плавка", "Гальванопокрытие", "Производство ГП"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <button onClick={() => { setSearch(""); setFilterVid("Все виды"); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Сбросить</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortTh sortKey="date" sort={sort} onSort={toggleSort}>Дата</SortTh>
              <SortTh sortKey="type" sort={sort} onSort={toggleSort}>Тип</SortTh>
              <SortTh sortKey="vid" sort={sort} onSort={toggleSort}>Вид операции</SortTh>
              <SortTh sortKey="positions" sort={sort} onSort={toggleSort}>Позиции</SortTh>
              <SortTh sortKey="document" sort={sort} onSort={toggleSort}>Документ</SortTh>
              <SortTh sortKey="responsible" sort={sort} onSort={toggleSort}>Подотчётник</SortTh>
              <SortTh sortKey="statusVydacha" sort={sort} onSort={toggleSort}>Статус выдачи</SortTh>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.slice((page - 1) * perPage, page * perPage).map(op => (
              <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{op.date}</td>
                <td className={`px-4 py-3 font-medium ${typeColor[op.type] || "text-gray-700"}`}>{op.type}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setViewOp(op)} className="text-blue-600 hover:underline">{op.vid}</button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setViewOp(op)} className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
                    {op.positions}
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
                <td className="px-4 py-3 text-blue-600">{op.document}</td>
                <td className="px-4 py-3 text-gray-700">{op.responsible}</td>
                <td className="px-4 py-3"><Badge label={op.statusVydacha} /></td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <EyeIcon onClick={() => setViewOp(op)} />
                  <EditIcon onClick={() => setEditOp(op)} />
                  <DeleteIcon onClick={() => confirm("Удалить операцию?", () => setOperations(prev => prev.filter(o => o.id !== op.id)))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewOp && <OperModal op={viewOp} onClose={() => setViewOp(null)} onSave={() => setViewOp(null)} readOnly />}
      {editOp && (
        <OperModal
          op={editOp}
          onClose={() => setEditOp(null)}
          onSave={updated => {
            setOperations(prev => prev.map(o => o.id === updated.id ? updated : o));
            setEditOp(null);
            show("Операция сохранена");
          }}
        />
      )}
      {showNew && (
        <OperModal
          onClose={() => setShowNew(false)}
          onSave={o => {
            setOperations(prev => [o, ...prev]);
            setShowNew(false);
            show("Операция создана");
          }}
        />
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
