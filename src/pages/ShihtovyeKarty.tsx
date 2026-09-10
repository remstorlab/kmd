import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, PageHeader,
  ExportBtn, useToast, Toast, Field, Input, Select, useConfirm, ConfirmDialog,
  SortTh, useSort, parseRuDate,
} from "../components/ui";
import { ShihtovayaKarta } from "../data/mock";
import { Plus, X, Calculator } from "lucide-react";

const shihtaMaterials = [
  { mat: "Слиток золота ЗлА-1", klass: "Слиток", fe: "0.001", sb: "0.001", bi: "0.0005", pb: "0.001", p: "0.0005", ves: 500.25, dola: 89.2 },
  { mat: "Стружка золотая", klass: "Стружка", fe: "0.002", sb: "0.001", bi: "0.001", pb: "0.001", p: "0.001", ves: 45.80, dola: 8.2 },
  { mat: "Лом золота 585", klass: "Лом", fe: "0.005", sb: "0.003", bi: "0.002", pb: "0.003", p: "0.001", ves: 14.20, dola: 2.6 },
];

function ShihtaConstructor({ karta, onClose, onSave, readOnly = false }: { karta?: ShihtovayaKarta | null; onClose: () => void; onSave: (k: ShihtovayaKarta) => void; readOnly?: boolean }) {
  const [name, setName] = useState(karta?.name || "");
  const [plavkaNo, setPlavkaNo] = useState(karta?.plavkaNo || "");
  const [oborotNo, setOborotNo] = useState("О-2026-001");
  const [naznachenie, setNaznachenie] = useState("Слитки для реализации");
  const [osnovanie, setOsnovanie] = useState(`Приказ №234-П от ${new Date().toLocaleDateString("ru-RU")}`);
  const [materials, setMaterials] = useState(shihtaMaterials);
  const [showFromSklad, setShowFromSklad] = useState(false);
  const [showAddDop, setShowAddDop] = useState(false);
  const [dopForm, setDopForm] = useState({ name: "", code: "", klass: "Лигатура", proba: "", unit: "г", ves: "" });
  const [showResult, setShowResult] = useState(false);
  const { toast, show, clear } = useToast();
  const ro = readOnly;

  const skladPickerItems = [
    { name: "Слиток золота ЗлА-1", nom: "DM-001", klass: "Слиток", lig: 500.25, net: 498.12, loc: "Сейф №1, Полка А" },
    { name: "Золотой порошок Au", nom: "DM-008", klass: "Порошок", lig: 25.00, net: 24.95, loc: "Сейф №3, Полка В" },
  ];
  const { sorted: sortedSkladPicker, sort: skladPickerSort, toggleSort: toggleSkladPickerSort } = useSort(skladPickerItems, {
    name: r => r.name,
    nom: r => r.nom,
    klass: r => r.klass,
    lig: r => r.lig,
    net: r => r.net,
    loc: r => r.loc,
  });

  const { sorted: sortedMaterials, sort: matSort, toggleSort: toggleMatSort } = useSort(materials, {
    mat: m => m.mat,
    klass: m => m.klass,
    fe: m => parseFloat(m.fe),
    sb: m => parseFloat(m.sb),
    bi: m => parseFloat(m.bi),
    pb: m => parseFloat(m.pb),
    p: m => parseFloat(m.p),
    ves: m => m.ves,
    dola: m => m.dola,
  });

  const gostResult = [
    { element: "Золото (Au)", pct: "99.85%", norm: "≥99.5%", ok: true },
    { element: "Серебро (Ag)", pct: "0.08%", norm: "≤0.10%", ok: true },
    { element: "Медь (Cu)", pct: "0.06%", norm: "≤0.10%", ok: true },
  ];

  const save = () => {
    const k: ShihtovayaKarta = karta ? {
      ...karta,
      name: name || karta.name,
      plavkaNo: plavkaNo || karta.plavkaNo,
    } : {
      id: `sk-${Date.now()}`,
      date: new Date().toLocaleDateString("ru-RU"),
      name: name || "Новая шихтовая карта",
      plavkaNo: plavkaNo || `П-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: "Новая",
      materials: [],
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
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Field label="Наименование" full><Input value={name} onChange={setName} placeholder="Наименование шихты" disabled={ro} /></Field>
        <Field label="Номер плавки"><Input value={plavkaNo} onChange={setPlavkaNo} placeholder="П-2026-XXXX" disabled={ro} /></Field>
        <Field label="Номер оборота"><Input value={oborotNo} onChange={setOborotNo} disabled={ro} /></Field>
        <Field label="Назначение слитков"><Select value={naznachenie} options={["Слитки для реализации", "Производство ГП"]} onChange={setNaznachenie} disabled={ro} /></Field>
        <Field label="Основание" full><Input value={osnovanie} onChange={setOsnovanie} disabled={ro} /></Field>
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

        <table className="w-full text-sm mb-4">
          <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
            <SortTh sortKey="mat" sort={matSort} onSort={toggleMatSort} className="px-3 py-2">Материал</SortTh>
            <SortTh sortKey="klass" sort={matSort} onSort={toggleMatSort} className="px-3 py-2">Класс</SortTh>
            <SortTh sortKey="fe" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Fe г</SortTh>
            <SortTh sortKey="sb" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Sb г</SortTh>
            <SortTh sortKey="bi" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Bi г</SortTh>
            <SortTh sortKey="pb" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Pb г</SortTh>
            <SortTh sortKey="p" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">P г</SortTh>
            <SortTh sortKey="ves" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Вес г</SortTh>
            <SortTh sortKey="dola" sort={matSort} onSort={toggleMatSort} align="right" className="px-3 py-2">Доля %</SortTh>
            {!ro && <th className="w-16"></th>}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {sortedMaterials.map((m, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{m.mat}</td>
                <td className="px-3 py-2">{m.klass}</td>
                <td className="px-3 py-2 text-right text-gray-600">{m.fe}</td>
                <td className="px-3 py-2 text-right text-gray-600">{m.sb}</td>
                <td className="px-3 py-2 text-right text-gray-600">{m.bi}</td>
                <td className="px-3 py-2 text-right text-gray-600">{m.pb}</td>
                <td className="px-3 py-2 text-right text-gray-600">{m.p}</td>
                <td className="px-3 py-2 text-right font-medium">{m.ves}</td>
                <td className="px-3 py-2 text-right text-blue-600">{m.dola}%</td>
                {!ro && <td className="px-3 py-2 text-center">
                  <button onClick={() => setMaterials(prev => prev.filter(x => x !== m))} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>

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

      {/* From sklad modal */}
      {showFromSklad && (
        <Modal title="Добавить материал со склада" onClose={() => setShowFromSklad(false)} wide footer={
          <><Btn variant="secondary" onClick={() => setShowFromSklad(false)}>Отмена</Btn>
          <Btn onClick={() => {
            setMaterials(prev => [...prev, { mat: "Золотой порошок Au", klass: "Порошок", fe: "0.001", sb: "0.0005", bi: "0.0003", pb: "0.001", p: "0.0002", ves: 25.00, dola: 0 }]);
            setShowFromSklad(false);
            show("Материал добавлен");
          }}>Добавить выбранные</Btn></>
        }>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <th className="w-8 px-3 py-2"></th>
              <SortTh sortKey="name" sort={skladPickerSort} onSort={toggleSkladPickerSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="nom" sort={skladPickerSort} onSort={toggleSkladPickerSort} className="px-3 py-2">Номенкл.№</SortTh>
              <SortTh sortKey="klass" sort={skladPickerSort} onSort={toggleSkladPickerSort} className="px-3 py-2">Класс</SortTh>
              <SortTh sortKey="lig" sort={skladPickerSort} onSort={toggleSkladPickerSort} align="right" className="px-3 py-2">Лигат.вес г</SortTh>
              <SortTh sortKey="net" sort={skladPickerSort} onSort={toggleSkladPickerSort} align="right" className="px-3 py-2">Чист.вес г</SortTh>
              <SortTh sortKey="loc" sort={skladPickerSort} onSort={toggleSkladPickerSort} className="px-3 py-2">Место</SortTh>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sortedSkladPicker.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50"><td className="px-3 py-2"><input type="checkbox" /></td>
                  <td className="px-3 py-2 font-medium">{r.name}</td><td className="px-3 py-2 text-gray-500">{r.nom}</td>
                  <td className="px-3 py-2">{r.klass}</td><td className="px-3 py-2 text-right">{r.lig}</td>
                  <td className="px-3 py-2 text-right">{r.net}</td><td className="px-3 py-2 text-gray-500">{r.loc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}

      {/* Add dop material */}
      {showAddDop && (
        <Modal title="Добавить дополнительный материал" onClose={() => setShowAddDop(false)} footer={
          <><Btn variant="secondary" onClick={() => setShowAddDop(false)}>Отмена</Btn>
          <Btn onClick={() => {
            setMaterials(prev => [...prev, { mat: dopForm.name || "Доп. материал", klass: dopForm.klass, fe: "0.01", sb: "0.001", bi: "0.001", pb: "0.001", p: "0.001", ves: parseFloat(dopForm.ves) || 0, dola: 0 }]);
            setShowAddDop(false);
            setDopForm({ name: "", code: "", klass: "Лигатура", proba: "", unit: "г", ves: "" });
            show("Материал добавлен");
          }}>Добавить</Btn></>
        }>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Наименование материала" full><Input value={dopForm.name} onChange={v => setDopForm(f => ({ ...f, name: v }))} placeholder="Название" /></Field>
            <Field label="Код материала"><Input value={dopForm.code} onChange={v => setDopForm(f => ({ ...f, code: v }))} placeholder="AU, AG..." /></Field>
            <Field label="Класс"><Select value={dopForm.klass} options={["Лигатура", "Флюс", "Добавка"]} onChange={v => setDopForm(f => ({ ...f, klass: v }))} /></Field>
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
  const { shihtovyeKarty, setShihtovyeKarty } = useApp();
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [page, setPage] = useState(1);
  const [viewKarta, setViewKarta] = useState<ShihtovayaKarta | null>(null);
  const [editKarta, setEditKarta] = useState<ShihtovayaKarta | null>(null);
  const [showNew, setShowNew] = useState(false);
  const perPage = 8;

  const { sorted, sort, toggleSort } = useSort(shihtovyeKarty, {
    date: k => parseRuDate(k.date),
    name: k => k.name,
    plavkaNo: k => k.plavkaNo,
    status: k => k.status,
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
                <td className="px-4 py-3 flex items-center gap-1">
                  <EyeIcon onClick={() => setViewKarta(karta)} />
                  <EditIcon onClick={() => setEditKarta(karta)} />
                  <DeleteIcon onClick={() => confirm(`Удалить шихтовую карту «${karta.name}»?`, () => setShihtovyeKarty(prev => prev.filter(s => s.id !== karta.id)))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={shihtovyeKarty.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewKarta && <ShihtaConstructor karta={viewKarta} onClose={() => setViewKarta(null)} onSave={() => setViewKarta(null)} readOnly />}
      {editKarta && (
        <ShihtaConstructor
          karta={editKarta}
          onClose={() => setEditKarta(null)}
          onSave={k => { setShihtovyeKarty(prev => prev.map(s => s.id === k.id ? k : s)); setEditKarta(null); show("Карта обновлена"); }}
        />
      )}
      {showNew && (
        <ShihtaConstructor
          onClose={() => setShowNew(false)}
          onSave={k => { setShihtovyeKarty(prev => [k, ...prev]); setShowNew(false); show("Шихтовая карта создана"); }}
        />
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
