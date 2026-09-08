import React, { useState, useEffect } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, PageHeader,
  ExportBtn, useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, Tabs, Textarea, FileChip,
} from "../components/ui";
import { Operation } from "../data/mock";
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
  const [vydacha, setVydacha] = useState(vydachaPositions);
  const [vozvrat, setVozvrat] = useState(vozvratPositions);
  const [showSpisanie, setShowSpisanie] = useState(false);
  const { toast, show, clear } = useToast();

  const [head, setHead] = useState(() => ({
    docType: "Приказ",
    document: op?.document || "ДВ-001234",
    date: op?.date || new Date().toLocaleDateString("ru-RU"),
    zakazchik: "Монетный двор",
    responsible: op?.responsible || "Нурланов Асхат Бекович",
    material: "Золото (Au)",
    plavkaNo: "П-2026-0089",
    vydal: "Ким Александр Юрьевич",
    poluchil: op?.responsible || "Нурланов Асхат Бекович",
  }));

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
        <Field label="Тип документа"><Select value={head.docType} options={["Приказ", "Заказ-наряд"]} onChange={v => setHead(h => ({ ...h, docType: v }))} disabled={readOnly} /></Field>
        <Field label="Номер документа"><Input value={head.document} onChange={v => setHead(h => ({ ...h, document: v }))} disabled={readOnly || !!op} /></Field>
        <Field label="Дата операции"><Input value={head.date} onChange={v => setHead(h => ({ ...h, date: v }))} disabled={readOnly} /></Field>
        <Field label="Заказчик"><Select value={head.zakazchik} options={["Монетный двор"]} onChange={v => setHead(h => ({ ...h, zakazchik: v }))} disabled={readOnly} /></Field>
        <Field label="Подотчётное лицо" full><Select value={head.responsible} options={["Нурланов Асхат Бекович", "Петров Сергей Владимирович", "Иванова Мария Сергеевна"]} onChange={v => setHead(h => ({ ...h, responsible: v }))} disabled={readOnly} /></Field>
        {vid === "Плавка" && <>
          <Field label="Материал"><Select value={head.material} options={["Золото (Au)", "Серебро (Ag)", "Платина (Pt)"]} onChange={v => setHead(h => ({ ...h, material: v }))} disabled={readOnly} /></Field>
          <Field label="Номер плавки"><Input value={head.plavkaNo} onChange={v => setHead(h => ({ ...h, plavkaNo: v }))} disabled={readOnly} /></Field>
        </>}
        <Field label="Выдал"><Select value={head.vydal} options={["Ким Александр Юрьевич", "Жумабаев Даурен"]} onChange={v => setHead(h => ({ ...h, vydal: v }))} disabled={readOnly} /></Field>
        <Field label="Получил"><Select value={head.poluchil} options={["Нурланов Асхат Бекович", "Петров Сергей Владимирович"]} onChange={v => setHead(h => ({ ...h, poluchil: v }))} disabled={readOnly} /></Field>
      </div>

      {/* Tabs */}
      <Tabs tabs={["Выдача", "Возврат", "Итого"]} active={tab} onChange={t => setTab(t as TabName)} />

      {tab === "Выдача" && (
        <>
          {!readOnly && (
            <div className="flex gap-2 mb-3">
              {vid === "Плавка" ? (
                <>
                  <Btn size="sm" onClick={() => show("Шихтовая карта добавлена")}><Plus className="w-4 h-4" />Выдать по ШК</Btn>
                  <Btn size="sm" variant="secondary" onClick={() => show("Позиция добавлена")}><Plus className="w-4 h-4" />Добавить</Btn>
                </>
              ) : (
                <Btn size="sm" onClick={() => show("Позиция добавлена")}><Plus className="w-4 h-4" />Добавить позицию</Btn>
              )}
              <ExportBtn onToast={show} />
            </div>
          )}
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <th className="px-3 py-2 text-left">№</th>
              <th className="px-3 py-2 text-left">Наименование</th>
              <th className="px-3 py-2 text-left">Номенкл.№</th>
              <th className="px-3 py-2 text-left">Класс</th>
              <th className="px-3 py-2 text-left">Проба</th>
              <th className="px-3 py-2 text-left">Вес г</th>
              <th className="px-3 py-2 text-left">Ag</th>
              <th className="px-3 py-2 text-left">Cu</th>
              <th className="px-3 py-2 text-left">Размещение</th>
              {!readOnly && <th className="w-16"></th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {vydacha.map(p => (
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
              <Btn size="sm" onClick={() => show("Позиция добавлена")}><Plus className="w-4 h-4" />Добавить позицию</Btn>
              <ExportBtn onToast={show} />
            </div>
          )}
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <th className="px-3 py-2 text-left">№</th>
              <th className="px-3 py-2 text-left">Наименование</th>
              <th className="px-3 py-2 text-left">Номенкл.№</th>
              <th className="px-3 py-2 text-left">Класс</th>
              <th className="px-3 py-2 text-left">Проба</th>
              <th className="px-3 py-2 text-left">Вес г</th>
              <th className="px-3 py-2 text-left">Ag</th>
              <th className="px-3 py-2 text-left">Cu</th>
              {!readOnly && <th className="w-16"></th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {vozvrat.map(p => (
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
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Дата</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Тип</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Вид операции</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Позиции</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Документ</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Подотчётник</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Статус выдачи</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.slice((page - 1) * perPage, page * perPage).map(op => (
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
