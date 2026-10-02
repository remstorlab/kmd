import React, { useMemo, useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, PageHeader,
  useToast, Toast, Field, Input, Select, KlassSelect, KlassCode, MaterialCodeSelect, MultiFileUpload, useConfirm, ConfirmDialog,
  SortTh, useSort, parseRuDate, formatDateTime,
} from "../components/ui";
import { ShihtovayaKarta, ShihtaMaterial, DMItem, isGPKlass } from "../data/mock";
import StockPickerModal, { StockRow } from "../components/StockPickerModal";
import { Plus, X, Calculator } from "lucide-react";
import { useScreen } from "../router";

// Строка шихтовых материалов в конструкторе
interface MatRow {
  key: string;
  mat: string;
  nomenkl: string;
  klass: string;
  proba: number;
  qty: number;
  loc: string;
  fe: string;
  sb: string;
  bi: string;
  pb: string;
  p: string;
  ves: number;
  // id позиции склада ДМ, выбранной в этой сессии — резервируется при сохранении карты
  srcId?: string;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
let rowSeq = 0;
const newKey = () => `mr-${Date.now()}-${rowSeq++}`;

const toRow = (m: ShihtaMaterial): MatRow => ({
  key: newKey(), mat: m.name, nomenkl: m.nomenkl, klass: m.klass, proba: m.proba, qty: m.qty ?? 1, loc: m.loc,
  fe: "—", sb: "—", bi: "—", pb: "—", p: "—", ves: m.ves,
});

// Резерв позиций ДМ под шихтовую карту: полностью взятая позиция переводится в «Резерв»,
// при частичном выборе зарезервированная часть выделяется в отдельную позицию.
// Позиции, убранные из карты (release), возвращаются в «На складе».
function reserveDm(items: DMItem[], reserve: Map<string, number>, release: Set<string>, stamp: number): DMItem[] {
  return items.flatMap(it => {
    if (it.status === "Резерв" && release.has(it.nomenkl)) return [{ ...it, status: "На складе" as const }];
    const q = reserve.get(it.id);
    if (!q) return [it];
    if (q >= it.qty) return [{ ...it, status: "Резерв" as const }];
    const k = q / it.qty;
    const lig = round2(it.ligWeight * k);
    const net = round2(it.netWeight * k);
    return [
      { ...it, qty: it.qty - q, ligWeight: round2(it.ligWeight - lig), netWeight: round2(it.netWeight - net) },
      { ...it, id: `${it.id}-r${stamp}`, qty: q, ligWeight: lig, netWeight: net, status: "Резерв" as const },
    ];
  });
}

function ShihtaConstructor({ karta, onClose, onSave, readOnly = false }: { karta?: ShihtovayaKarta | null; onClose: () => void; onSave: (k: ShihtovayaKarta) => void; readOnly?: boolean }) {
  const { currentUser, dmItems, setDmItems } = useApp();
  const [name, setName] = useState(karta?.name || "");
  const [plavkaNo, setPlavkaNo] = useState(karta?.plavkaNo || "");
  const [oborotNo, setOborotNo] = useState("О-2026-001");
  const [naznachenie, setNaznachenie] = useState("Слитки для реализации");
  const [osnovanie, setOsnovanie] = useState(`Приказ №234-П от ${new Date().toLocaleDateString("ru-RU")}`);
  const [files, setFiles] = useState<File[]>(() => karta?.files ?? []);
  const [materials, setMaterials] = useState<MatRow[]>(() => (karta?.materials ?? []).map(toRow));
  // Вложенные экраны: …/from-sklad, …/dop-material, …/raschet (результат расчёта)
  const screen = useScreen();
  const nested = (name: string) => [screen.has(name), (open: boolean) => (open ? screen.open(name) : screen.close(name))] as const;
  const [showFromSklad, setShowFromSklad] = nested("from-sklad");
  const [showAddDop, setShowAddDop] = nested("dop-material");
  const [dopForm, setDopForm] = useState({ name: "", code: "Au чистое", klass: "Комплектующие", proba: "", unit: "г", ves: "" });
  const showResult = screen.has("raschet");
  const setShowResult = (on: boolean) => screen.toggle("raschet", on);
  const { toast, show, clear } = useToast();
  const ro = readOnly;

  // Доступные позиции склада ДМ для шихты
  const skladRows = useMemo<StockRow[]>(() => dmItems
    .filter(i => i.status === "На складе" && i.qty > 0 && !isGPKlass(i.klass))
    .map(i => ({ id: i.id, src: "dm" as const, nomenkl: i.nomenkl, name: i.name, klass: i.klass, code: i.metal, qty: i.qty, unit: "шт", proba: i.proba, lig: i.ligWeight, net: i.netWeight, location: i.location })),
  [dmItems]);

  // Уже взято в карту из каждой позиции склада (в этой сессии)
  const already = materials.reduce<Record<string, number>>((acc, m) => {
    if (m.srcId) acc[m.srcId] = (acc[m.srcId] ?? 0) + m.qty;
    return acc;
  }, {});

  const addFromSklad = (picked: { row: StockRow; qty: number }[]) => {
    setMaterials(prev => {
      const next = [...prev];
      for (const { row, qty } of picked) {
        const vesOf = (q: number) => round2(((row.lig ?? 0) * q) / (row.qty || 1));
        const idx = next.findIndex(m => m.srcId === row.id);
        if (idx >= 0) {
          const q = Math.min(next[idx].qty + qty, row.qty);
          next[idx] = { ...next[idx], qty: q, ves: vesOf(q) };
        } else {
          next.push({
            key: newKey(), mat: row.name, nomenkl: row.nomenkl, klass: row.klass, proba: row.proba ?? 0, qty, loc: row.location,
            fe: "—", sb: "—", bi: "—", pb: "—", p: "—", ves: vesOf(qty), srcId: row.id,
          });
        }
      }
      return next;
    });
    setShowFromSklad(false);
    show(`Добавлено позиций: ${picked.length}. Резерв — при сохранении карты`);
  };

  const totalVes = materials.reduce((s, m) => s + m.ves, 0);
  const dola = (m: MatRow) => (totalVes > 0 ? round2((m.ves / totalVes) * 100) : 0);
  const num = (v: string) => parseFloat(v) || 0;

  const { sorted: sortedMaterials, sort: matSort, toggleSort: toggleMatSort } = useSort(materials, {
    mat: m => m.mat,
    klass: m => m.klass,
    qty: m => m.qty,
    fe: m => num(m.fe),
    sb: m => num(m.sb),
    bi: m => num(m.bi),
    pb: m => num(m.pb),
    p: m => num(m.p),
    ves: m => m.ves,
    dola: m => dola(m),
  });

  const gostResult = [
    { element: "Золото (Au)", pct: "99.85%", norm: "≥99.5%", ok: true },
    { element: "Серебро (Ag)", pct: "0.08%", norm: "≤0.10%", ok: true },
    { element: "Медь (Cu)", pct: "0.06%", norm: "≤0.10%", ok: true },
  ];

  const save = () => {
    // Выбранные позиции склада должны быть всё ещё доступны в нужном количестве
    const reserve = new Map<string, number>();
    materials.forEach(m => { if (m.srcId) reserve.set(m.srcId, (reserve.get(m.srcId) ?? 0) + m.qty); });
    const lacking = [...reserve].filter(([id, q]) => {
      const it = dmItems.find(i => i.id === id);
      return !it || it.status !== "На складе" || it.qty < q;
    });
    if (lacking.length) {
      show(`Позиции уже недоступны на складе: ${lacking.map(([id]) => materials.find(m => m.srcId === id)?.mat).join(", ")}`);
      return;
    }
    // Позиции, убранные из карты, снимаются с резерва
    const kept = new Set(materials.map(m => m.nomenkl));
    const release = new Set((karta?.materials ?? []).map(m => m.nomenkl).filter(n => n && !kept.has(n)));
    if (reserve.size || release.size) setDmItems(prev => reserveDm(prev, reserve, release, Date.now()));

    const mats: ShihtaMaterial[] = materials.map(m => ({ name: m.mat, nomenkl: m.nomenkl, klass: m.klass, proba: m.proba, ves: m.ves, loc: m.loc, qty: m.qty }));
    // Сохранение исправленной карты «На редактировании» возвращает её в «Новая» — снова доступна для плавки.
    const k: ShihtovayaKarta = karta ? {
      ...karta,
      name: name || karta.name,
      plavkaNo: plavkaNo || karta.plavkaNo,
      materials: mats,
      files,
      ...(karta.status === "На редактировании" ? { status: "Новая" as const, vydannyePozicii: undefined } : {}),
    } : {
      id: `sk-${Date.now()}`,
      date: new Date().toLocaleDateString("ru-RU"),
      name: name || "Новая шихтовая карта",
      plavkaNo: plavkaNo || `П-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: "Новая",
      materials: mats,
      files,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.name || "—",
    };
    onSave(k);
  };

  return (
    <Modal
      title="Конструктор шихтовой карты"
      onClose={onClose}
      extraWide
      footer={ro ? <Btn variant="secondary" onClick={onClose}>Закрыть</Btn> : (
        <><Btn variant="secondary" onClick={onClose}>Отмена</Btn><Btn onClick={save}>Сохранить карту</Btn></>
      )}
    >
      {karta?.status === "На редактировании" && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 mb-5 text-sm text-orange-800">
          <div className="font-medium mb-0.5">⚠ Карта на редактировании — недоступна для плавки</div>
          Зарезервированные позиции выданы в другой операции: {(karta.vydannyePozicii ?? []).join(", ") || "—"}.
          {!ro && " Замените их и сохраните карту — она вернётся в статус «Новая»."}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-5">
        <Field label="Наименование" full><Input value={name} onChange={setName} placeholder="Наименование шихты" disabled={ro} /></Field>
        <Field label="Номер плавки"><Input value={plavkaNo} onChange={setPlavkaNo} placeholder="П-2026-XXXX" disabled={ro} /></Field>
        <Field label="Номер оборота"><Input value={oborotNo} onChange={setOborotNo} disabled={ro} /></Field>
        <Field label="Назначение слитков"><Select value={naznachenie} options={["Слитки для реализации", "Производство ГП"]} onChange={setNaznachenie} disabled={ro} /></Field>
        <Field label="Основание" full><Input value={osnovanie} onChange={setOsnovanie} disabled={ro} /></Field>
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
              <Btn size="sm" onClick={() => setShowFromSklad(true)}><Plus className="w-4 h-4" />Добавить со склада</Btn>
              <Btn size="sm" variant="secondary" onClick={() => setShowAddDop(true)}><Plus className="w-4 h-4" />Добавить доп. материал</Btn>
            </div>
          )}
        </div>

        {materials.length === 0 ? (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 mb-4 text-center border border-dashed border-gray-200">
            Нет материалов. Нажмите «+ Добавить со склада»
          </div>
        ) : (
          <table className="w-full text-sm mb-4">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <SortTh sortKey="mat" sort={matSort} onSort={toggleMatSort} className="px-3 py-2">Материал</SortTh>
              <SortTh sortKey="klass" sort={matSort} onSort={toggleMatSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="qty" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Кол-во шт</SortTh>
              <SortTh sortKey="fe" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Fe г</SortTh>
              <SortTh sortKey="sb" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Sb г</SortTh>
              <SortTh sortKey="bi" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Bi г</SortTh>
              <SortTh sortKey="pb" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Pb г</SortTh>
              <SortTh sortKey="p" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">P г</SortTh>
              <SortTh sortKey="ves" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Вес г</SortTh>
              <SortTh sortKey="dola" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Доля %</SortTh>
              <th className="px-3 py-2 text-left">Статус</th>
              {!ro && <th className="w-10"></th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sortedMaterials.map(m => (
                <tr key={m.key} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium">{m.mat}</div>
                    {m.nomenkl && <div className="text-xs text-gray-400">{m.nomenkl}{m.loc ? ` · ${m.loc}` : ""}</div>}
                  </td>
                  <td className="px-3 py-2"><KlassCode value={m.klass} /></td>
                  <td className="px-3 py-2 text-right">{m.qty}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{m.fe}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{m.sb}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{m.bi}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{m.pb}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{m.p}</td>
                  <td className="px-3 py-2 text-right font-medium">{m.ves}</td>
                  <td className="px-3 py-2 text-right text-blue-600">{dola(m)}%</td>
                  <td className="px-3 py-2">{m.nomenkl ? <Badge label="Резерв" /> : <span className="text-xs text-gray-400">Доп. материал</span>}</td>
                  {!ro && <td className="px-3 py-2 text-center">
                    <button onClick={() => setMaterials(prev => prev.filter(x => x.key !== m.key))} className="text-gray-400 hover:text-red-500 transition-colors" title="Убрать из карты"><X className="w-3.5 h-3.5" /></button>
                  </td>}
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t border-gray-200 bg-gray-50 text-sm font-medium">
              <td className="px-3 py-2" colSpan={2}>Итого: {materials.length} поз.</td>
              <td className="px-3 py-2 text-right">{materials.reduce((s, m) => s + m.qty, 0)}</td>
              <td colSpan={5}></td>
              <td className="px-3 py-2 text-right">{round2(totalVes)}</td>
              <td className="px-3 py-2 text-right text-blue-600">100%</td>
              <td colSpan={ro ? 1 : 2}></td>
            </tr></tfoot>
          </table>
        )}

        {!ro && (
          <Btn size="sm" variant="secondary" onClick={() => setShowResult(true)}>
            <Calculator className="w-4 h-4" /> Рассчитать
          </Btn>
        )}

        {(showResult || ro) && (
          <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Результат: Соответствие ГОСТ
            </div>
            <div className="divide-y divide-gray-100">
              {gostResult.map(g => (
                <div key={g.element} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-gray-900">{g.element}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{g.pct}</span>
                    <span className="text-xs text-gray-400">норма {g.norm}</span>
                    <Badge label={g.ok ? "Соответствует" : "Не соответствует"} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showFromSklad && (
        <StockPickerModal
          title="Добавить материал со склада ДМ"
          rows={skladRows}
          already={already}
          showWeights
          qtyLabel="Кол-во, шт"
          emptyText="Нет доступных позиций на складе ДМ"
          addLabel="Добавить выбранные"
          onClose={() => setShowFromSklad(false)}
          onAdd={addFromSklad}
        />
      )}

      {/* Add dop material */}
      {showAddDop && (
        <Modal title="Добавить дополнительный материал" onClose={() => setShowAddDop(false)} footer={
          <><Btn variant="secondary" onClick={() => setShowAddDop(false)}>Отмена</Btn>
          <Btn onClick={() => {
            setMaterials(prev => [...prev, {
              key: newKey(), mat: dopForm.name || "Доп. материал", nomenkl: "", klass: dopForm.klass, proba: parseFloat(dopForm.proba) || 0, qty: 1, loc: "",
              fe: "0.01", sb: "0.001", bi: "0.001", pb: "0.001", p: "0.001", ves: parseFloat(dopForm.ves) || 0,
            }]);
            setShowAddDop(false);
            setDopForm({ name: "", code: "Au чистое", klass: "Комплектующие", proba: "", unit: "г", ves: "" });
            show("Материал добавлен");
          }}>Добавить</Btn></>
        }>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Наименование материала" full><Input value={dopForm.name} onChange={v => setDopForm(f => ({ ...f, name: v }))} placeholder="Название" /></Field>
            <Field label="Код материала"><MaterialCodeSelect value={dopForm.code} onChange={v => setDopForm(f => ({ ...f, code: v }))} /></Field>
            <Field label="Класс"><KlassSelect value={dopForm.klass} onChange={v => setDopForm(f => ({ ...f, klass: v }))} /></Field>
            <Field label="Проба"><Input value={dopForm.proba} onChange={v => setDopForm(f => ({ ...f, proba: v }))} placeholder="999" /></Field>
            <Field label="Ед. измерения"><Select value={dopForm.unit} options={["г", "кг", "шт"]} onChange={v => setDopForm(f => ({ ...f, unit: v }))} /></Field>
            <Field label="Вес г"><Input value={dopForm.ves} onChange={v => setDopForm(f => ({ ...f, ves: v }))} placeholder="0.00" /></Field>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}

export function ShihtovyeKarty() {
  const { shihtovyeKarty, setShihtovyeKarty, setDmItems } = useApp();
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
  const perPage = 8;

  // Удаление невыполненной карты снимает резерв с её позиций ДМ
  const removeKarta = (karta: ShihtovayaKarta) => {
    if (karta.status !== "Выполнена") {
      const release = new Set(karta.materials.map(m => m.nomenkl).filter(Boolean));
      setDmItems(prev => prev.map(it => it.status === "Резерв" && release.has(it.nomenkl) ? { ...it, status: "На складе" as const } : it));
    }
    setShihtovyeKarty(prev => prev.filter(s => s.id !== karta.id));
    show(`Шихтовая карта «${karta.name}» удалена`);
  };

  const { sorted, sort, toggleSort } = useSort(shihtovyeKarty, {
    date: k => parseRuDate(k.date),
    name: k => k.name,
    plavkaNo: k => k.plavkaNo,
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
              <SortTh sortKey="date" sort={sort} onSort={toggleSort}>Дата</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort}>Наименование</SortTh>
              <SortTh sortKey="plavkaNo" sort={sort} onSort={toggleSort}>№ плавки</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort}>Статус</SortTh>
              <SortTh sortKey="createdAt" sort={sort} onSort={toggleSort}>Дата создания - пользователь</SortTh>
              <th className="w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.slice((page - 1) * perPage, page * perPage).map(karta => (
              <tr key={karta.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{karta.date}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{karta.name}</td>
                <td className="px-4 py-3 text-blue-600">{karta.plavkaNo}</td>
                <td className="px-4 py-3"><Badge label={karta.status} /></td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(karta.createdAt)} - {karta.createdBy}</td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <EyeIcon onClick={() => setViewKarta(karta)} />
                  <EditIcon onClick={() => setEditKarta(karta)} />
                  <DeleteIcon onClick={() => confirm(`Удалить шихтовую карту «${karta.name}»?`, () => removeKarta(karta))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={shihtovyeKarty.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewKarta && <ShihtaConstructor key={viewKarta.id} karta={viewKarta} onClose={() => setViewKarta(null)} onSave={() => setViewKarta(null)} readOnly />}
      {editKarta && (
        <ShihtaConstructor
          key={editKarta.id}
          karta={editKarta}
          onClose={() => setEditKarta(null)}
          onSave={k => { setShihtovyeKarty(prev => prev.map(s => s.id === k.id ? k : s)); setEditKarta(null); show("Карта обновлена"); }}
        />
      )}
      {showNew && (
        <ShihtaConstructor
          onClose={() => setShowNew(false)}
          onSave={k => { setShihtovyeKarty(prev => [k, ...prev]); setShowNew(false); show("Шихтовая карта создана, позиции зарезервированы"); }}
        />
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
