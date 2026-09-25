import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, PageHeader,
  ExportBtn, useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, Tabs, Textarea, FileChip, MultiFileUpload, SortTh, useSort, parseRuDate,
} from "../components/ui";
import { Operation, ShihtovayaKarta } from "../data/mock";
import { Eye, Plus, Paperclip, Upload, Download } from "lucide-react";

// ── Списание разницы modal ────────────────────────────────────────────────────

function SpisanieModal({ delta, onClose, onConfirm }: { delta: number; onClose: () => void; onConfirm: () => void }) {
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Modal title="Списание разницы" onClose={onClose} footer={
      <>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <button
          onClick={files.length > 0 && reason ? onConfirm : undefined}
          disabled={files.length === 0 || !reason}
          className="px-4 py-2 rounded-lg border border-red-500 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Списать разницу
        </button>
      </>
    }>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-2 mb-4 text-sm">
        <span className="text-yellow-600">⚠</span>
        <span className="text-yellow-800 font-medium">Превышение допустимой дельты: {delta >= 0 ? "+" : "−"}{Math.abs(delta).toFixed(2)} г</span>
      </div>
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">Причина списания</label>
        <Textarea value={reason} onChange={setReason} placeholder="Укажите причину списания разницы весов…" rows={4} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Акт списания (обязательно)</label>
        {files.length === 0 ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" multiple className="hidden" onChange={e => { if (e.target.files?.length) setFiles(Array.from(e.target.files)); }} />
            <Paperclip className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Прикрепите файл акта списания<br /><span className="text-xs text-gray-400">PDF, DOCX — до 10 МБ</span></p>
          </div>
        ) : (
          <MultiFileUpload files={files} onChange={setFiles} />
        )}
      </div>
    </Modal>
  );
}

// ── Добавить позицию ДМ со склада ─────────────────────────────────────────────

type OperPosition = { n: number; name: string; nomenkl: string; klass: string; proba: number; ves: number; ag: string; cu: string; au?: string; pd?: string; rh?: string; pt?: string; loc: string; posType: "ГП" | "ДМ" };

function AddDMPositionModal({ onClose, onAdd }: { onClose: () => void; onAdd: (rows: Omit<OperPosition, "n">[]) => void }) {
  const { dmItems, shihtovyeKarty } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Позиции в резерве тоже можно выдать — тогда шихтовая карта, которая их резервирует, уйдёт «На редактировании».
  const availableItems = dmItems.filter(i => i.status === "На складе" || i.status === "Резерв");
  const reservedBy = (nomenkl: string) => shihtovyeKarty.find(k => k.status === "Новая" && k.materials.some(m => m.nomenkl === nomenkl));
  const affectedKarty = [...new Set(
    availableItems.filter(i => selected.has(i.id) && i.status === "Резерв").map(i => reservedBy(i.nomenkl)?.name).filter(Boolean),
  )];

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
    onAdd(chosen.map(i => ({ name: i.name, nomenkl: i.nomenkl, klass: i.klass, proba: i.proba, ves: i.netWeight, ag: "-", cu: "-", au: "-", pd: "-", rh: "-", pt: "-", loc: i.location, posType: "ДМ" as const })));
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
              <th className="px-3 py-2 text-left">Статус</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(i => {
                const checked = selected.has(i.id);
                const karta = i.status === "Резерв" ? reservedBy(i.nomenkl) : undefined;
                return (
                  <tr key={i.id} className={`hover:bg-gray-50 ${checked ? "bg-blue-50/50" : ""}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={checked} onChange={() => toggle(i.id)} className="w-4 h-4 accent-blue-600" /></td>
                    <td className="px-3 py-2 font-medium">{i.name}</td>
                    <td className="px-3 py-2 text-gray-500">{i.nomenkl}</td>
                    <td className="px-3 py-2">{i.klass}</td>
                    <td className="px-3 py-2">{i.proba}</td>
                    <td className="px-3 py-2">{i.netWeight}</td>
                    <td className="px-3 py-2 text-gray-500">{i.location}</td>
                    <td className="px-3 py-2">
                      <Badge label={i.status} />
                      {karta && <div className="text-xs text-gray-400 mt-0.5" title={karta.name}>ШК {karta.plavkaNo}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {affectedKarty.length > 0 && (
        <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-sm text-orange-800">
          ⚠ Выбраны позиции из резерва. После выдачи шихтовая карта {affectedKarty.map(n => `«${n}»`).join(", ")} перейдёт в статус «На редактировании» и станет недоступна для плавки.
        </div>
      )}
    </Modal>
  );
}

// ── Добавить позицию ДМ (новая, вручную) ──────────────────────────────────────

function NewDMPositionModal({ onClose, onAdd }: { onClose: () => void; onAdd: (rows: Omit<OperPosition, "n">[]) => void }) {
  const [form, setForm] = useState({ posType: "ДМ" as "ГП" | "ДМ", nomenkl: "", klass: "Слиток", name: "", proba: "999", ves: "", au: "-", ag: "-", pd: "-", rh: "-", pt: "-", sey: "Сейф №1", polka: "Полка А" });

  const add = () => {
    if (!form.name || !form.nomenkl) return;
    onAdd([{
      name: form.name,
      nomenkl: form.nomenkl,
      klass: form.klass,
      proba: parseFloat(form.proba) || 0,
      ves: parseFloat(form.ves) || 0,
      ag: form.ag || "-",
      cu: "-",
      au: form.au || "-",
      pd: form.pd || "-",
      rh: form.rh || "-",
      pt: form.pt || "-",
      loc: `${form.sey}, ${form.polka}`,
      posType: form.posType,
    }]);
  };

  return (
    <Modal
      title="Добавить позицию ДМ"
      onClose={onClose}
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={add} disabled={!form.name || !form.nomenkl}>Добавить</Btn>
      </>}
    >
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Field label="Позиция"><Select value={form.posType} options={["ГП", "ДМ"]} onChange={v => setForm(f => ({ ...f, posType: v as "ГП" | "ДМ" }))} /></Field>
        <Field label="Номенкл. номер"><Input value={form.nomenkl} onChange={v => setForm(f => ({ ...f, nomenkl: v }))} placeholder="DM-XXX" /></Field>
        <Field label="Класс"><Select value={form.klass} options={["Слиток", "Стружка", "Проба", "Раствор"]} onChange={v => setForm(f => ({ ...f, klass: v }))} /></Field>
        <Field label="Проба"><Input value={form.proba} onChange={v => setForm(f => ({ ...f, proba: v }))} placeholder="999" /></Field>
        <Field label="Наименование" full><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Наименование позиции" /></Field>
        <Field label="Вес г"><Input value={form.ves} onChange={v => setForm(f => ({ ...f, ves: v }))} placeholder="0.00" /></Field>
        <Field label="Сейф"><Select value={form.sey} options={["Сейф №1", "Сейф №2", "Сейф №3"]} onChange={v => setForm(f => ({ ...f, sey: v }))} /></Field>
        <Field label="Полка"><Select value={form.polka} options={["Полка А", "Полка Б", "Полка В"]} onChange={v => setForm(f => ({ ...f, polka: v }))} /></Field>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Химический состав (в чистоте), г</h4>
        <div className="grid grid-cols-5 gap-3">
          <Field label="Au, г"><Input value={form.au} onChange={v => setForm(f => ({ ...f, au: v }))} placeholder="-" /></Field>
          <Field label="Ag, г"><Input value={form.ag} onChange={v => setForm(f => ({ ...f, ag: v }))} placeholder="-" /></Field>
          <Field label="Pd, г"><Input value={form.pd} onChange={v => setForm(f => ({ ...f, pd: v }))} placeholder="-" /></Field>
          <Field label="Rh, г"><Input value={form.rh} onChange={v => setForm(f => ({ ...f, rh: v }))} placeholder="-" /></Field>
          <Field label="Pt, г"><Input value={form.pt} onChange={v => setForm(f => ({ ...f, pt: v }))} placeholder="-" /></Field>
        </div>
      </div>
    </Modal>
  );
}

// ── Добавить позицию возврата (из выдачи или новую) ───────────────────────────

function VozvratPickModal({ vydacha, onClose, onAdd }: { vydacha: OperPosition[]; onClose: () => void; onAdd: (rows: Omit<OperPosition, "n">[]) => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showAddNew, setShowAddNew] = useState(false);

  const toggle = (n: number) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(n) ? s.delete(n) : s.add(n);
      return s;
    });
  };

  const addSelected = () => {
    const chosen = vydacha.filter(p => selected.has(p.n));
    if (chosen.length === 0) return;
    onAdd(chosen.map(({ n, ...rest }) => rest));
  };

  return (
    <Modal
      title="Добавить позицию возврата"
      onClose={onClose}
      wide
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={addSelected} disabled={selected.size === 0}>Добавить{selected.size > 0 ? ` (${selected.size})` : ""}</Btn>
      </>}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Позиции из выдачи</h3>
        <Btn size="sm" variant="secondary" onClick={() => setShowAddNew(true)}><Plus className="w-4 h-4" />Добавить новую</Btn>
      </div>

      {vydacha.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
          В выдаче пока нет позиций
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0"><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <th className="w-10 px-3 py-2"></th>
              <th className="px-3 py-2 text-left">Наименование</th>
              <th className="px-3 py-2 text-left">Номенкл.№</th>
              <th className="px-3 py-2 text-left">Класс</th>
              <th className="px-3 py-2 text-left">Проба</th>
              <th className="px-3 py-2 text-left">Вес г</th>
              <th className="px-3 py-2 text-left">Размещение</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {vydacha.map(p => {
                const checked = selected.has(p.n);
                return (
                  <tr key={p.n} className={`hover:bg-gray-50 ${checked ? "bg-blue-50/50" : ""}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={checked} onChange={() => toggle(p.n)} className="w-4 h-4 accent-blue-600" /></td>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-gray-500">{p.nomenkl}</td>
                    <td className="px-3 py-2">{p.klass}</td>
                    <td className="px-3 py-2">{p.proba}</td>
                    <td className="px-3 py-2">{p.ves}</td>
                    <td className="px-3 py-2 text-gray-500">{p.loc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddNew && (
        <NewDMPositionModal
          onClose={() => setShowAddNew(false)}
          onAdd={rows => { onAdd(rows); setShowAddNew(false); }}
        />
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

// ── Списание потерь (с промежуточными взвешиваниями для Производства ГП) ─────

type LossKind = "Безвозвратные" | "Возвратные";
type LossRow = { id: string; date: string; name: string; kind: LossKind; ves: string; toVozvrat?: boolean };
type SpisanieDoc = { id: string; name: string; size: number; docType: string; uploaded: string };
// Промежуточное взвешивание: позицию приносят на весы, фиксируют вес и потери,
// но на склад не сдают — она уходит на следующий этап в рамках той же выдачи.
type WeighStage = { id: string; etap: string; datetime: string; vesOut: string; losses: LossRow[] };

const lossNames = ["Угар", "Обрезь", "Высечка", "Опилки", "Стружка", "Шлиф-пыль", "Смывы (травление)", "Безвозвратные потери"];
const gpEtapy = ["Прокатка", "Отжиг", "Вырубка кружков", "Гуртовка", "Травление", "Гальтовка", "Чеканка", "Полировка", "Другое"];

const num = (s: string) => parseFloat(String(s).replace(",", ".")) || 0;
const fmt = (v: number) => v.toFixed(2);
const nowStr = () => new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const uid = () => Math.random().toString(36).slice(2, 9);
// Дата строки потерь хранится в ISO (yyyy-mm-dd) для <input type="date">, показывается в формате ru-RU.
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const isoToRu = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "");
const newLoss = (): LossRow => ({ id: uid(), date: todayIso(), name: "", kind: "Безвозвратные", ves: "" });

const docTypes = ["Акт списания", "Акт взвешивания", "Служебная записка", "Протокол", "Прочее"];
const fmtSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} МБ` : `${Math.max(1, Math.round(b / 1024))} КБ`);
const seedDocs: SpisanieDoc[] = [
  { id: "d1", name: "Акт_списания_угар_18082026.pdf", size: 412_000, docType: "Акт списания", uploaded: "18.08.2026, 16:05" },
  { id: "d2", name: "Скан_взвешивание_этап1.jpg", size: 1_850_000, docType: "Акт взвешивания", uploaded: "18.08.2026, 10:52" },
];
const newStage = (etap = ""): WeighStage => ({ id: uid(), etap, datetime: nowStr(), vesOut: "", losses: [newLoss()] });

const seedGpStages: WeighStage[] = [
  { id: "s1", etap: "Прокатка", datetime: "18.08.2026, 10:40", vesOut: "544.90", losses: [
    { id: "l1", date: "2026-08-18", name: "Угар", kind: "Безвозвратные", ves: "0.35" },
    { id: "l2", date: "2026-08-18", name: "Обрезь", kind: "Возвратные", ves: "0.80" },
  ] },
  { id: "s2", etap: "Вырубка кружков", datetime: "18.08.2026, 15:10", vesOut: "544.10", losses: [
    { id: "l3", date: "2026-08-18", name: "Опилки", kind: "Возвратные", ves: "0.60" },
    { id: "l4", date: "2026-08-18", name: "Шлиф-пыль", kind: "Безвозвратные", ves: "0.15" },
  ] },
];

const sumLosses = (stages: WeighStage[], pred: (l: LossRow) => boolean = () => true) =>
  stages.reduce((s, st) => s + st.losses.filter(pred).reduce((a, l) => a + num(l.ves), 0), 0);

function LossTable({ losses, readOnly, onChange }: { losses: LossRow[]; readOnly: boolean; onChange: (rows: LossRow[]) => void }) {
  const upd = (id: string, patch: Partial<LossRow>) => onChange(losses.map(l => (l.id === id ? { ...l, ...patch } : l)));
  return (
    <>
      <datalist id="loss-names">{lossNames.map(n => <option key={n} value={n} />)}</datalist>
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
          <th className="px-3 py-2 text-left w-10">№</th>
          <th className="px-3 py-2 text-left w-44">Дата</th>
          <th className="px-3 py-2 text-left">Наименование потерь</th>
          <th className="px-3 py-2 text-left w-48">Вид потерь</th>
          <th className="px-3 py-2 text-left w-36">Вес потерь, г</th>
          {!readOnly && <th className="w-10"></th>}
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {losses.map((l, i) => (
            <tr key={l.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-400">{i + 1}</td>
              <td className="px-3 py-1.5">
                <input
                  type="date"
                  value={l.date}
                  onChange={e => upd(l.id, { date: e.target.value })}
                  disabled={readOnly || l.toVozvrat}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </td>
              <td className="px-3 py-1.5">
                <input
                  list="loss-names"
                  value={l.name}
                  onChange={e => upd(l.id, { name: e.target.value })}
                  disabled={readOnly || l.toVozvrat}
                  placeholder="Выберите или введите"
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </td>
              <td className="px-3 py-1.5">
                {l.toVozvrat
                  ? <Badge label="Передано в возврат" />
                  : <Select value={l.kind} options={["Безвозвратные", "Возвратные"]} onChange={v => upd(l.id, { kind: v as LossKind })} disabled={readOnly} />}
              </td>
              <td className="px-3 py-1.5"><Input value={l.ves} onChange={v => upd(l.id, { ves: v })} placeholder="0.00" disabled={readOnly || l.toVozvrat} /></td>
              {!readOnly && <td className="px-2 py-1.5">{!l.toVozvrat && <DeleteIcon onClick={() => onChange(losses.filter(x => x.id !== l.id))} />}</td>}
            </tr>
          ))}
          {losses.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-3 text-center text-xs text-gray-400">Потери не указаны</td></tr>
          )}
        </tbody>
      </table>
      {!readOnly && (
        <button
          onClick={() => onChange([...losses, newLoss()])}
          className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />Добавить потерю
        </button>
      )}
    </>
  );
}

function SpisanieDocs({ docs, setDocs, readOnly, onDownload }: {
  docs: SpisanieDoc[];
  setDocs: React.Dispatch<React.SetStateAction<SpisanieDoc[]>>;
  readOnly: boolean;
  onDownload: (d: SpisanieDoc) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const ts = nowStr();
    setDocs(prev => [...prev, ...Array.from(list).map(f => ({
      id: uid(), name: f.name, size: f.size, uploaded: ts,
      docType: /акт/i.test(f.name) ? "Акт списания" : "Прочее",
    }))]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Документы списания{docs.length > 0 && ` (${docs.length})`}</span>
        <span className="text-xs text-gray-400">Сканы актов, служебные записки и прочее</span>
      </div>
      <div className="p-4">
        {docs.length > 0 && (
          <table className="w-full text-sm mb-3">
            <thead><tr className="text-gray-500 text-xs border-b border-gray-200">
              <th className="px-3 py-2 text-left">Файл</th>
              <th className="px-3 py-2 text-left w-56">Тип документа</th>
              <th className="px-3 py-2 text-left w-24">Размер</th>
              <th className="px-3 py-2 text-left w-40">Загружен</th>
              <th className="w-16"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate text-gray-800" title={d.name}>{d.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <Select value={d.docType} options={docTypes} onChange={v => setDocs(prev => prev.map(x => (x.id === d.id ? { ...x, docType: v } : x)))} disabled={readOnly} />
                  </td>
                  <td className="px-3 py-1.5 text-gray-500">{fmtSize(d.size)}</td>
                  <td className="px-3 py-1.5 text-gray-500">{d.uploaded}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center">
                      <button onClick={() => onDownload(d)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Скачать"><Download className="w-4 h-4" /></button>
                      {!readOnly && <DeleteIcon onClick={() => setDocs(prev => prev.filter(x => x.id !== d.id))} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {readOnly ? (
          docs.length === 0 && <span className="text-sm text-gray-400">Документы не прикреплены</span>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${drag ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"}`}
          >
            <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff" className="hidden" onChange={e => addFiles(e.target.files)} />
            <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">Перетащите файлы сюда или <span className="text-blue-600 font-medium">выберите на компьютере</span></p>
            <p className="text-xs text-gray-400 mt-1">Можно несколько файлов · PDF, DOC/DOCX, JPG, PNG, TIFF — до 10 МБ каждый</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SpisanieTab({ stages, setStages, docs, setDocs, isGP, vesStart, readOnly, onTransferVozvrat, onDownload }: {
  stages: WeighStage[];
  setStages: React.Dispatch<React.SetStateAction<WeighStage[]>>;
  docs: SpisanieDoc[];
  setDocs: React.Dispatch<React.SetStateAction<SpisanieDoc[]>>;
  onDownload: (d: SpisanieDoc) => void;
  isGP: boolean;
  vesStart: number;
  readOnly: boolean;
  onTransferVozvrat: (rows: LossRow[]) => void;
}) {
  const updStage = (id: string, patch: Partial<WeighStage>) => setStages(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));

  const total = sumLosses(stages);
  const bezv = sumLosses(stages, l => l.kind === "Безвозвратные");
  const vozv = total - bezv;
  const pendingVozv = stages.flatMap(s => s.losses).filter(l => l.kind === "Возвратные" && !l.toVozvrat && num(l.ves) > 0);
  const lastWeighed = [...stages].reverse().find(s => s.vesOut);
  const vesInWork = isGP && lastWeighed ? num(lastWeighed.vesOut) : vesStart - total;

  const transfer = () => {
    const ids = new Set(pendingVozv.map(l => l.id));
    onTransferVozvrat(pendingVozv);
    setStages(prev => prev.map(s => ({ ...s, losses: s.losses.map(l => (ids.has(l.id) ? { ...l, toVozvrat: true } : l)) })));
  };

  return (
    <>
      {/* Сводка */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Выдано в работу", value: vesStart },
          { label: "Списано всего", value: total },
          { label: "в т.ч. безвозвратные / возвратные", value: null, text: `${fmt(bezv)} / ${fmt(vozv)} г` },
          { label: isGP ? "Вес в работе (посл. взвешивание)" : "Остаток в работе", value: vesInWork },
        ].map(c => (
          <div key={c.label} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <div className="text-xs text-gray-500">{c.label}</div>
            <div className="text-base font-semibold text-gray-900">{c.text ?? `${fmt(c.value!)} г`}</div>
          </div>
        ))}
      </div>

      {!readOnly && pendingVozv.length > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4 text-sm">
          <span className="text-amber-800">Возвратные отходы ({fmt(pendingVozv.reduce((a, l) => a + num(l.ves), 0))} г) можно оприходовать на склад ДМ через вкладку «Возврат»</span>
          <Btn size="sm" variant="secondary" onClick={transfer}>Передать в возврат</Btn>
        </div>
      )}

      {!isGP ? (
        <LossTable losses={stages[0]?.losses ?? []} readOnly={readOnly} onChange={rows => stages[0] && updStage(stages[0].id, { losses: rows })} />
      ) : (
        <>
          <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4">
            Промежуточное взвешивание фиксирует вес и потери после этапа обработки <b>без сдачи на склад</b>: позиция остаётся в подотчёте и уходит на следующий этап.
            Вес на входе этапа = вес предыдущего взвешивания (для первого — вес выдачи).
          </div>
          <div className="space-y-4">
            {stages.map((st, i) => {
              const vesIn = i === 0 ? vesStart : num(stages[i - 1].vesOut);
              const hasOut = st.vesOut.trim() !== "";
              const ubyl = hasOut ? vesIn - num(st.vesOut) : null;
              const uchteno = st.losses.reduce((a, l) => a + num(l.ves), 0);
              const neuchteno = ubyl !== null ? ubyl - uchteno : null;
              const ok = neuchteno !== null && Math.abs(neuchteno) < 0.005;
              const isLast = i === stages.length - 1;
              return (
                <div key={st.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Взвешивание №{i + 1}{st.etap && <span className="normal-case font-medium text-gray-900">— {st.etap}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge label={isLast ? "В работе" : "Возвращено в обработку"} />
                      {!readOnly && stages.length > 1 && <DeleteIcon onClick={() => setStages(prev => prev.filter(s => s.id !== st.id))} />}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <Field label="Этап обработки"><Select value={st.etap} options={["", ...gpEtapy]} onChange={v => updStage(st.id, { etap: v })} disabled={readOnly} /></Field>
                      <Field label="Дата и время"><Input value={st.datetime} onChange={v => updStage(st.id, { datetime: v })} disabled={readOnly} /></Field>
                      <Field label="Вес на входе, г"><Input value={fmt(vesIn)} disabled /></Field>
                      <Field label="Вес при взвешивании, г"><Input value={st.vesOut} onChange={v => updStage(st.id, { vesOut: v })} placeholder="0.00" disabled={readOnly} /></Field>
                    </div>
                    <LossTable losses={st.losses} readOnly={readOnly} onChange={rows => updStage(st.id, { losses: rows })} />
                    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm border-t border-gray-100 pt-3">
                      <span className="text-gray-500">Убыль по весам: <b className="text-gray-900">{ubyl !== null ? `${fmt(ubyl)} г` : "—"}</b></span>
                      <span className="text-gray-500">Учтено потерь: <b className="text-gray-900">{fmt(uchteno)} г</b></span>
                      {neuchteno !== null && (
                        <span className={ok ? "text-green-700" : "text-yellow-700"}>
                          {ok ? "✓ Потери сходятся с весом" : `⚠ Неучтённая разница: ${neuchteno >= 0 ? "+" : "−"}${fmt(Math.abs(neuchteno))} г`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {!readOnly && (
            <div className="mt-4">
              <Btn size="sm" variant="secondary" onClick={() => setStages(prev => [...prev, newStage()])}>
                <Plus className="w-4 h-4" />Промежуточное взвешивание
              </Btn>
            </div>
          )}
        </>
      )}

      <SpisanieDocs docs={docs} setDocs={setDocs} readOnly={readOnly} onDownload={onDownload} />
    </>
  );
}

// ── Operation modal ───────────────────────────────────────────────────────────

type TabName = "Выдача" | "Возврат" | "Списание" | "Итого";

const vydachaPositions: OperPosition[] = [
  { n: 1, name: "Слиток золота ЗлА-1", nomenkl: "DM-001", klass: "Слиток", proba: 999, ves: 500.25, ag: "-", cu: "-", loc: "Сейф №1, Полка А", posType: "ДМ" },
  { n: 2, name: "Стружка золотая", nomenkl: "DM-003", klass: "Стружка", proba: 585, ves: 45.80, ag: "0.12", cu: "1.20", loc: "Сейф №2, Полка А", posType: "ДМ" },
];
const vozvratPositions: OperPosition[] = [
  { n: 1, name: "Подкат 30х20", nomenkl: "DM-R01", klass: "Подкат", proba: 999, ves: 480.10, ag: "-", cu: "-", loc: "Сейф №1, Полка Б", posType: "ДМ" },
  { n: 2, name: "Королёк №1", nomenkl: "DM-R02", klass: "Королёк", proba: 999, ves: 55.60, ag: "-", cu: "-", loc: "Сейф №2, Полка Б", posType: "ДМ" },
  { n: 3, name: "Шлак золотосодержащий", nomenkl: "DM-R03", klass: "Шлак", proba: 500, ves: 8.00, ag: "0.05", cu: "2.10", loc: "Сейф №3, Полка А", posType: "ДМ" },
];

function OperModal({ op, onClose, onSave, readOnly = false }: { op?: Operation | null; onClose: () => void; onSave: (o: Operation) => void; readOnly?: boolean }) {
  const [tab, setTab] = useState<TabName>("Выдача");
  const [vid, setVid] = useState<"Отбор пробы" | "Анализ в ЛКИ" | "Плавка" | "Гальванопокрытие" | "Производство ГП">(op?.vid || "Плавка");
  const [type, setType] = useState<"Выдача" | "Возврат" | "Выдача-Возврат">(op?.type || "Выдача");
  const [vydacha, setVydacha] = useState<OperPosition[]>(op ? vydachaPositions : []);
  const [vozvrat, setVozvrat] = useState<OperPosition[]>(op ? vozvratPositions : []);
  const [stages, setStages] = useState<WeighStage[]>(() => (op?.vid === "Производство ГП" ? seedGpStages : [newStage()]));
  const [spisanieDocs, setSpisanieDocs] = useState<SpisanieDoc[]>(() => (op?.vid === "Производство ГП" ? seedDocs : []));
  const [showSpisanie, setShowSpisanie] = useState(false);
  const [showAddDM, setShowAddDM] = useState(false);
  const [showVozvratPick, setShowVozvratPick] = useState(false);
  const [showShihtaPick, setShowShihtaPick] = useState(false);
  const [pickedShihtaId, setPickedShihtaId] = useState<string | null>(null);
  const { dmItems, setDmItems, setShihtovyeKarty } = useApp();
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
    posType: p => p.posType,
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
    posType: p => p.posType,
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

  const vesVydacha = vydacha.reduce((a, p) => a + p.ves, 0);
  const vesVozvrat = vozvrat.reduce((a, p) => a + p.ves, 0);
  // Возвратные отходы, уже переданные во вкладку «Возврат», учтены там — не считаем дважды.
  const vesSpisano = sumLosses(stages, l => !l.toVozvrat);
  const delta = +(vesVozvrat + vesSpisano - vesVydacha).toFixed(2);
  const deltaSign = delta >= 0 ? "+" : "−";
  const inNorm = Math.abs(delta) <= 5;

  // Дельта, на которую оформлен акт «Списать разницу». Действует, только пока дельта не изменилась.
  const [spisanaRaznica, setSpisanaRaznica] = useState<number | null>(() => (op?.statusClose === "Закрыто: списано" ? delta : null));
  const raznicaSpisana = spisanaRaznica !== null && spisanaRaznica === delta;

  const oformitBlock =
    vozvrat.length === 0 ? "Добавьте позиции во вкладке «Возврат»"
    : !inNorm && !raznicaSpisana ? `Дельта ${deltaSign}${fmt(Math.abs(delta))} г превышает допуск ±5 г — спишите разницу во вкладке «Итого»`
    : null;

  // Выданные позиции ДМ уходят в подотчёт. Если позиция была в резерве чужой шихтовой карты,
  // эта карта переходит «На редактировании» и пропадает из выбора ШК для плавки.
  const applyVydacha = () => {
    const vydanoNomenkl = new Set(vydacha.filter(p => p.posType === "ДМ").map(p => p.nomenkl));
    const izRezerva = dmItems.filter(i => i.status === "Резерв" && vydanoNomenkl.has(i.nomenkl));
    setDmItems(prev => prev.map(i => (vydanoNomenkl.has(i.nomenkl) && i.status !== "В подотчёте" ? { ...i, status: "В подотчёте" } : i)));
    if (izRezerva.length === 0) return;
    const rezNomenkl = new Set(izRezerva.map(i => i.nomenkl));
    const zatronuty: string[] = [];
    setShihtovyeKarty(prev => prev.map(k => {
      if (k.id === pickedShihtaId || k.status === "Выполнена") return k;
      const hit = k.materials.filter(m => rezNomenkl.has(m.nomenkl)).map(m => m.name);
      if (hit.length === 0) return k;
      zatronuty.push(k.name);
      return { ...k, status: "На редактировании", vydannyePozicii: [...new Set([...(k.vydannyePozicii ?? []), ...hit])] };
    }));
    if (zatronuty.length) show(`Шихтовая карта ${zatronuty.map(n => `«${n}»`).join(", ")} переведена «На редактировании»`);
  };

  const save = (oformit = false) => {
    applyVydacha();
    const o: Operation = {
      id: op?.id || `op-${Date.now()}`,
      date: head.date,
      type: type as any,
      vid: vid as any,
      positions: vydacha.length,
      document: head.document,
      responsible: head.responsible,
      statusVydacha: "Выдано",
      statusVozvrat: oformit ? "Полностью" : vozvrat.length > 0 ? "Частично" : "Не начат",
      statusClose: !oformit ? "Не закрыто" : !inNorm ? "Закрыто: списано" : "Закрыто",
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
          {oformitBlock && <span className="mr-auto self-center text-xs text-yellow-700">⚠ Оформление недоступно: {oformitBlock}</span>}
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn onClick={() => save(true)} disabled={!!oformitBlock}>Оформить</Btn>
          <Btn variant="secondary" onClick={() => save()}>Сохранить</Btn>
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
      <Tabs tabs={["Выдача", "Возврат", "Списание", "Итого"]} active={tab} onChange={t => setTab(t as TabName)} />

      {tab === "Выдача" && (
        <>
          {!readOnly && (
            <div className="flex gap-2 mb-3">
              {vid === "Плавка" ? (
                // Для плавки состав выдачи определяет только шихтовая карта.
                <Btn size="sm" onClick={() => setShowShihtaPick(true)}><Plus className="w-4 h-4" />Выдать по ШК</Btn>
              ) : (
                <Btn size="sm" onClick={() => setShowAddDM(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>
              )}
              <ExportBtn onToast={show} />
            </div>
          )}
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <th className="px-3 py-2 text-left">№</th>
              <SortTh sortKey="name" sort={vydachaSort} onSort={toggleVydachaSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="nomenkl" sort={vydachaSort} onSort={toggleVydachaSort} className="px-3 py-2">Номенкл.№</SortTh>
              <SortTh sortKey="posType" sort={vydachaSort} onSort={toggleVydachaSort} className="px-3 py-2">Позиция</SortTh>
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
                  <td className="px-3 py-2"><Badge label={p.posType} /></td>
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
              <Btn size="sm" onClick={() => setShowVozvratPick(true)}><Plus className="w-4 h-4" />Добавить позицию</Btn>
              <ExportBtn onToast={show} />
            </div>
          )}
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <th className="px-3 py-2 text-left">№</th>
              <SortTh sortKey="name" sort={vozvratSort} onSort={toggleVozvratSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="nomenkl" sort={vozvratSort} onSort={toggleVozvratSort} className="px-3 py-2">Номенкл.№</SortTh>
              <SortTh sortKey="posType" sort={vozvratSort} onSort={toggleVozvratSort} className="px-3 py-2">Позиция</SortTh>
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
                  <td className="px-3 py-2"><Badge label={p.posType} /></td>
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

      {tab === "Списание" && (
        <SpisanieTab
          stages={stages}
          setStages={setStages}
          docs={spisanieDocs}
          setDocs={setSpisanieDocs}
          onDownload={d => show(`Загрузка файла «${d.name}»...`)}
          isGP={vid === "Производство ГП"}
          vesStart={vesVydacha}
          readOnly={readOnly}
          onTransferVozvrat={rows => {
            appendPositions("vozvrat", rows.map(l => ({
              name: `${l.name || "Отходы"} (возвратные)`, nomenkl: "—", klass: "Отходы", proba: vydacha[0]?.proba ?? 0,
              ves: num(l.ves), ag: "-", cu: "-", loc: "—", posType: "ДМ" as const,
            })));
            show("Возвратные отходы добавлены во вкладку «Возврат»");
          }}
        />
      )}

      {tab === "Итого" && (
        <>
          <div className={`flex items-center justify-between rounded-lg px-4 py-3 mb-5 border ${inNorm ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            <div className="flex items-center gap-2">
              <span className={inNorm ? "text-green-600" : "text-yellow-600"}>{inNorm ? "✓" : "⚠"}</span>
              <span className={`font-medium text-sm ${inNorm ? "text-green-800" : "text-yellow-800"}`}>
                Дельта: {deltaSign}{fmt(Math.abs(delta))} г (допуск: ±5 г) {inNorm ? "— В норме!" : "— Превышение!"}
              </span>
            </div>
            {!inNorm && raznicaSpisana && <Badge label="Разница списана" />}
            {!inNorm && !raznicaSpisana && !readOnly && (
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
              {vesSpisano > 0 && <>
                <div className="text-xs font-semibold text-gray-500 uppercase mt-4 mb-2">Списание потерь</div>
                {stages.flatMap(st => st.losses.filter(l => !l.toVozvrat && num(l.ves) > 0).map(l => ({ st, l }))).map(({ st, l }) => (
                  <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <div className="text-sm text-gray-900">{l.name || "Без наименования"} <span className="text-gray-400 text-xs">{[isoToRu(l.date), st.etap].filter(Boolean).join(" · ")}</span></div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{l.ves} г</span>
                      <Badge label={l.kind} />
                    </div>
                  </div>
                ))}
              </>}
              <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-4 gap-3 text-sm">
                <div><span className="text-gray-500">Выдано:</span> <b>{fmt(vesVydacha)} г</b></div>
                <div><span className="text-gray-500">Возврат:</span> <b>{fmt(vesVozvrat)} г</b></div>
                <div><span className="text-gray-500">Списано:</span> <b>{fmt(vesSpisano)} г</b></div>
                <div><span className="text-gray-500">Дельта:</span> <b>{deltaSign}{fmt(Math.abs(delta))} г</b></div>
              </div>
            </div>
          </div>
        </>
      )}

      {showSpisanie && (
        <SpisanieModal
          delta={delta}
          onClose={() => setShowSpisanie(false)}
          onConfirm={() => { setShowSpisanie(false); setSpisanaRaznica(delta); show("Разница списана — операцию можно оформить"); }}
        />
      )}
      {showAddDM && (
        <AddDMPositionModal
          onClose={() => setShowAddDM(false)}
          onAdd={rows => { appendPositions("vydacha", rows); setShowAddDM(false); show("Позиции добавлены"); }}
        />
      )}
      {showVozvratPick && (
        <VozvratPickModal
          vydacha={vydacha}
          onClose={() => setShowVozvratPick(false)}
          onAdd={rows => { appendPositions("vozvrat", rows); setShowVozvratPick(false); show("Позиции возврата добавлены"); }}
        />
      )}
      {showShihtaPick && (
        <ShihtaPickModal
          onClose={() => setShowShihtaPick(false)}
          onPick={k => {
            appendPositions("vydacha", k.materials.map(m => ({ ...m, ag: "-", cu: "-", posType: "ДМ" as const })));
            setHead(h => ({ ...h, plavkaNo: k.plavkaNo }));
            setPickedShihtaId(k.id);
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
  const [selected, setSelected] = useState<string | null>(null);
  const perPage = 8;

  const toggleSelect = (id: string) => {
    setSelected(prev => (prev === id ? null : id));
  };

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
            <Btn variant="secondary" disabled={!selected} onClick={() => setShowNew(true)}>Оформить возврат</Btn>
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
              <th className="w-10 px-4 py-3"></th>
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
              <tr key={op.id} className={`hover:bg-gray-50 transition-colors ${selected === op.id ? "bg-blue-50/50" : ""}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected === op.id} onChange={() => toggleSelect(op.id)} className="w-4 h-4 accent-blue-600" />
                </td>
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
