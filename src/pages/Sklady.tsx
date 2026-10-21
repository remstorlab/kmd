import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, Pagination, PageHeader,
  ExportBtn, SearchInput, useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, KlassSelect, KlassCode, MaterialCodeSelect, useMaterialCodeLabel, FileChip, Toggle, SortTh, useSort,
} from "../components/ui";
import { GPItem, DMItem, MAIN_SKLAD } from "../data/mock";
import { Coins } from "lucide-react";
import PrihodDocModal from "../components/PrihodDocModal";
import VydachaDocModal from "../components/VydachaDocModal";
import DMPositionViewModal from "../components/DMPositionViewModal";
import { useNextNomenkl, seyfsOf, polkasOf, formatLoc, parseLoc } from "../components/DMPositionFormModal";
import { useScreen } from "../router";

// Позиции учёта ГП в виде позиций склада ДМ — склад один, показываются все классы.
const gpToDm = (i: GPItem): DMItem => ({ id: i.id, name: i.name, nomenkl: i.nomenkl, klass: i.klass, metal: i.code, qty: i.qty, proba: i.proba ?? 0, ligWeight: i.ligWeight ?? 0, netWeight: i.netWeight ?? 0, location: i.location, status: i.status });

// ── Склады ХАБ ───────────────────────────────────────────────────────────────

export function SkladyHub() {
  const { navigate } = useApp();

  return (
    <div>
      <PageHeader title="Склады" subtitle="Выберите раздел" breadcrumb={["Склады"]} />
      <div className="grid grid-cols-2 gap-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("ostatok-dm")}>
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
            <Coins className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Остатки материалов на складе ДМ</h3>
          <p className="text-sm text-gray-500">{MAIN_SKLAD} — все позиции, включая готовую продукцию</p>
        </div>
      </div>
    </div>
  );
}

// ── Смена места хранения позиции ──────────────────────────────────────────────


function MoveLocationModal({ item, onClose, onSave }: { item: DMItem; onClose: () => void; onSave: (location: string) => void }) {
  const { storageLocations: locs } = useApp();
  const codeLabel = useMaterialCodeLabel();
  const cur = parseLoc(item.location);
  // Ячейки склада системы из справочника «Места хранения» (только доступные)
  const seyfs = seyfsOf(locs, MAIN_SKLAD);
  const [seyf, setSeyf] = useState(seyfs.includes(cur.seyf) ? cur.seyf : seyfs[0] ?? "");
  const polkas = polkasOf(locs, MAIN_SKLAD, seyf);
  const [polka, setPolka] = useState(polkas.includes(cur.polka) ? cur.polka : polkas[0] ?? "");
  const changeSeyf = (s: string) => { setSeyf(s); setPolka(polkasOf(locs, MAIN_SKLAD, s)[0] ?? ""); };
  const next = formatLoc(seyf, polka);
  const same = !!cur.seyf && cur.seyf === seyf && cur.polka === polka;

  const attrs: [string, React.ReactNode][] = [
    ["Номенкл. №", item.nomenkl],
    ["Наименование", item.name],
    ["Класс", <KlassCode value={item.klass} />],
    ["Код материала", codeLabel(item.metal)],
    ["Проба", item.proba || "—"],
    ["Лигат. вес г", item.ligWeight],
  ];

  return (
    <Modal
      title="Изменение места хранения"
      onClose={onClose}
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={() => onSave(next)} disabled={!next || same}>Сохранить</Btn>
      </>}
    >
      {/* Позиция, у которой меняется место хранения */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
        {attrs.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="font-medium text-gray-900 truncate">{value}</div>
          </div>
        ))}
      </div>

      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Текущее место хранения</h4>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Field label="Склад"><Input value={MAIN_SKLAD} disabled /></Field>
        {cur.seyf ? <>
          <Field label="Сейф"><Input value={cur.seyf} disabled /></Field>
          <Field label="Полка"><Input value={cur.polka || "—"} disabled /></Field>
        </> : (
          <div className="col-span-2"><Field label="Место хранения"><Input value={item.location || "—"} disabled /></Field></div>
        )}
      </div>

      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Новое место хранения</h4>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Склад"><Input value={MAIN_SKLAD} disabled /></Field>
        <Field label="Сейф" required>
          {seyfs.length ? <Select value={seyf} options={seyfs} onChange={changeSeyf} /> : <Input value="Нет свободных мест" disabled />}
        </Field>
        <Field label="Полка">
          {polkas.length ? <Select value={polka} options={polkas} onChange={setPolka} /> : <Input value="—" disabled />}
        </Field>
      </div>
      {same && <div className="mt-3 text-xs text-gray-500">Выберите место хранения, отличное от текущего</div>}
    </Modal>
  );
}

// ── Merge DM modal ────────────────────────────────────────────────────────────

function MergeModal({ items, onClose, onConfirm }: { items: DMItem[]; onClose: () => void; onConfirm: () => void }) {
  const totalLig = items.reduce((s, i) => s + i.ligWeight, 0);
  const avgProba = Math.round(items.reduce((s, i) => s + i.proba * i.ligWeight, 0) / totalLig);
  const totalNet = items.reduce((s, i) => s + i.netWeight, 0);

  return (
    <Modal
      title="Объединение позиций"
      onClose={onClose}
      wide
      footer={<><Btn variant="secondary" onClick={onClose}>Отмена</Btn><Btn onClick={onConfirm}>Подтвердить объединение</Btn></>}
    >
      <div className="mb-4 space-y-2">
        {items.map(it => (
          <div key={it.id} className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg text-sm">
            <div>
              <span className="font-medium text-gray-900">{it.name}</span>
              <span className="text-gray-400 ml-2">{it.nomenkl}</span>
            </div>
            <span className="text-gray-600">{it.ligWeight} г</span>
          </div>
        ))}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Итоговая позиция</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Класс:</span> <span className="font-medium">Слиток</span></div>
          <div><span className="text-gray-500">Средняя проба:</span> <span className="font-medium">{avgProba}</span></div>
          <div><span className="text-gray-500">Лигатурный вес:</span> <span className="font-medium">{totalLig.toFixed(2)} г</span></div>
          <div><span className="text-gray-500">Чистый вес:</span> <span className="font-medium">{totalNet.toFixed(2)} г</span></div>
        </div>
      </div>
    </Modal>
  );
}

// ── Остатки на складе ДМ ──────────────────────────────────────────────────────

export function OstatokDM() {
  const { dmItems, setDmItems, gpItems, setGpItems, setSkladDocs, setVydachaDocs } = useApp();
  // Все позиции склада, любого класса (в том числе «Готовая продукция»), из учётов ДМ и ГП.
  const skladItems = [...dmItems, ...gpItems.map(gpToDm)];
  const codeLabel = useMaterialCodeLabel();
  const { toast, show, clear } = useToast();
  const [search, setSearch] = useState("");
  const [filterKlass, setFilterKlass] = useState("Все классы");
  const [filterStatus, setFilterStatus] = useState("Все статусы");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Экраны: /sklady/dm/view/:id, /sklady/dm/merge, /sklady/dm/prihod, /sklady/dm/vydacha
  const screen = useScreen();
  const viewItem = skladItems.find(it => it.id === screen.after("view")) ?? null;
  const showMerge = screen.has("merge");
  const showPrihod = screen.has("prihod");
  const showVydacha = screen.has("vydacha");
  // Смена места хранения: …/mesto/:id
  const moveItem = skladItems.find(it => it.id === screen.after("mesto")) ?? null;
  // Позиция физически на складе — место хранения можно изменить
  const canMove = (it: DMItem) => it.status === "На складе" || it.status === "Резерв";
  const saveLocation = (it: DMItem, location: string) => {
    // Позиция хранится в учёте ДМ или ГП — меняем там, где она есть
    if (dmItems.some(d => d.id === it.id)) setDmItems(prev => prev.map(d => (d.id === it.id ? { ...d, location } : d)));
    else setGpItems(prev => prev.map(g => (g.id === it.id ? { ...g, location } : g)));
    screen.close("mesto");
    show(`Место хранения изменено: ${location}`);
  };

  const perPage = 8;
  const filtered = skladItems.filter(it => {
    const matchSearch = !search || it.name.toLowerCase().includes(search.toLowerCase());
    const matchKlass = filterKlass === "Все классы" || it.klass === filterKlass;
    const matchStatus = filterStatus === "Все статусы" || it.status === filterStatus;
    return matchSearch && matchKlass && matchStatus;
  });
  const { sorted, sort, toggleSort } = useSort(filtered, {
    name: it => it.name,
    nomenkl: it => it.nomenkl,
    klass: it => it.klass,
    metal: it => codeLabel(it.metal),
    qty: it => it.qty,
    proba: it => it.proba,
    ligWeight: it => it.ligWeight,
    netWeight: it => it.netWeight,
    location: it => it.location,
    status: it => it.status,
  });
  const pageItems = sorted.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const genNomenkl = useNextNomenkl();
  // Закрытые (выданные) позиции в объединении не участвуют
  const selectedItems = skladItems.filter(it => selected.has(it.id) && it.status !== "Закрыта");
  // Экран объединения, открытый по прямой ссылке без выбора, показывает первые две доступные позиции
  const mergeItems = selectedItems.length >= 2 ? selectedItems : skladItems.filter(it => it.status !== "Закрыта").slice(0, 2);

  const doMerge = () => {
    const ids = new Set(mergeItems.map(it => it.id));
    const selectedItems = mergeItems;
    const totalLig = selectedItems.reduce((s, i) => s + i.ligWeight, 0);
    const avgProba = Math.round(selectedItems.reduce((s, i) => s + i.proba * i.ligWeight, 0) / totalLig);
    const totalNet = selectedItems.reduce((s, i) => s + i.netWeight, 0);
    const totalQty = selectedItems.reduce((s, i) => s + i.qty, 0);
    const merged: DMItem = {
      id: `dm-merged-${Date.now()}`,
      name: `Объединённая позиция (${selectedItems.length} ед.)`,
      nomenkl: genNomenkl(),
      metal: selectedItems[0].metal,
      klass: "Слиток",
      qty: totalQty,
      proba: avgProba,
      ligWeight: totalLig,
      netWeight: totalNet,
      location: selectedItems[0].location,
      status: "На складе",
    };
    setDmItems(prev => [...prev.filter(it => !ids.has(it.id)), merged]);
    setGpItems(prev => prev.filter(it => !ids.has(it.id)));
    setSelected(new Set());
    screen.close("merge");
    show("Позиции объединены");
  };

  return (
    <div>
      <PageHeader
        title="Остатки материалов на складе ДМ"
        subtitle={`${MAIN_SKLAD}: актуальные позиции по сейфам и полкам`}
        breadcrumb={["Склады", "Остатки на складе ДМ"]}
        actions={
          <>
            <Btn onClick={() => screen.openTop("prihod")}>Принять на склад</Btn>
            <Btn variant="secondary" onClick={() => screen.openTop("vydacha")}>Выдать со склада</Btn>
            <Btn variant="secondary" disabled={selectedItems.length < 2} onClick={() => screen.openTop("merge")}>Объединить позиции</Btn>
            <ExportBtn onToast={show} />
          </>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Наименование</label>
          <SearchInput value={search} onChange={setSearch} placeholder="Поиск..." />
        </div>
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Класс материала</label>
          <KlassSelect value={filterKlass} onChange={setFilterKlass} allLabel="Все классы" />
        </div>
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {["Все статусы", "На складе", "Резерв", "В подотчёте", "Закрыта"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <button onClick={() => { setSearch(""); setFilterKlass("Все классы"); setFilterStatus("Все статусы"); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Сбросить фильтры
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-10 px-4 py-3"><input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(filtered.filter(i => i.status !== "Закрыта").map(i => i.id)) : new Set())} /></th>
              <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort}>Номенкл. №</SortTh>
              <SortTh sortKey="name" sort={sort} onSort={toggleSort}>Наименование</SortTh>
              <SortTh sortKey="qty" sort={sort} onSort={toggleSort}>Количество изделий</SortTh>
              <SortTh sortKey="klass" sort={sort} onSort={toggleSort}>Класс</SortTh>
              <SortTh sortKey="metal" sort={sort} onSort={toggleSort}>Код материала</SortTh>
              <SortTh sortKey="proba" sort={sort} onSort={toggleSort}>Проба</SortTh>
              <SortTh sortKey="ligWeight" sort={sort} onSort={toggleSort}>Лигат. вес г</SortTh>
              <SortTh sortKey="netWeight" sort={sort} onSort={toggleSort}>Чистый вес г</SortTh>
              <SortTh sortKey="location" sort={sort} onSort={toggleSort}>Место хранения</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort}>Статус</SortTh>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} disabled={item.status === "Закрыта"} title={item.status === "Закрыта" ? "Позиция закрыта — объединение недоступно" : undefined} /></td>
                <td className="px-4 py-3 text-gray-500">{item.nomenkl}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-3">{item.qty}</td>
                <td className="px-4 py-3"><KlassCode value={item.klass} /></td>
                <td className="px-4 py-3 text-blue-600 font-medium">{codeLabel(item.metal)}</td>
                <td className="px-4 py-3">{item.proba}</td>
                <td className="px-4 py-3">{item.ligWeight}</td>
                <td className="px-4 py-3">{item.netWeight}</td>
                <td className="px-4 py-3 text-gray-500">{item.location}</td>
                <td className="px-4 py-3"><Badge label={item.status} group="pozicii" /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <EyeIcon onClick={() => screen.openTop("view", item.id)} />
                    <EditIcon
                      onClick={() => screen.openTop("mesto", item.id)}
                      disabled={!canMove(item)}
                      title={canMove(item) ? "Изменить место хранения" : "Позиция не на складе — место хранения не меняется"}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} perPage={perPage} onPage={setPage} />
      </div>

      {viewItem && (
        <DMPositionViewModal item={viewItem} onClose={() => screen.close("view")} />
      )}
      {moveItem && (
        <MoveLocationModal key={moveItem.id} item={moveItem} onClose={() => screen.close("mesto")} onSave={loc => saveLocation(moveItem, loc)} />
      )}
      {showMerge && mergeItems.length >= 2 && <MergeModal items={mergeItems} onClose={() => screen.close("merge")} onConfirm={doMerge} />}
      {showPrihod && (
        <PrihodDocModal
          onClose={() => screen.close("prihod")}
          onSave={d => { setSkladDocs(prev => [d, ...prev]); screen.close("prihod"); show(`Документ ${d.number} сохранён`); }}
        />
      )}
      {showVydacha && (
        <VydachaDocModal
          onClose={() => screen.close("vydacha")}
          onSave={d => { setVydachaDocs(prev => [d, ...prev]); screen.close("vydacha"); show(`Накладная ${d.number} сохранена`); }}
        />
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
