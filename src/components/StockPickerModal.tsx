import React, { useState } from "react";
import { Badge, Btn, Modal, Field, Select, KlassSelect, KlassCode, SearchInput, SortTh, useSort, useMaterialCodeLabel, probaText, NetAuAg, NET_AU_AG, usePaged, FillerRows,
  OborotValue, oborotRowCls, OBOROT_LABEL, DeleteIcon,
} from "./ui";
import { VydachaDocPosition } from "../data/mock";
import { useApp } from "../store/AppContext";
import { IssueLine } from "../data/stock";
import { nextNomenkl, NO_LOC, formatLoc, parseLoc, seyfsOf, polkasOf } from "./DMPositionFormModal";

// ── Подбор позиций со склада ──────────────────────────────────────────────────
// Общий для выдачи со склада, требования, возврата СГП №2, «Движения материала» (вкладка «Выдача») и шихтовых карт.
// Без параметра issue позиция берётся целиком (шихтовые карты). С issue — справа панель «К выдаче»: по каждой
// отмеченной позиции выдаётся всё или часть (количество и лиг. вес части; расчёт — IssueLine, data/stock.ts).
// При частичной выдаче части сразу резервируется новый номенкл. № (nextNomenkl).
// issue.toSklad (Требование, Возврат СГП №2) — в карточке ещё «Новое размещение» на складе-получателе: сейф и полка,
// по умолчанию — как текущее место позиции. issue.edit — редактирование одной позиции документа (карандаш): в таблице
// только она, отмеченная, без фильтров.

// Позиция склада в едином виде (из учёта ГП или ДМ)
export type StockRow = Omit<VydachaDocPosition, "issue" | "issueLig" | "partNomenkl"> & { status?: string };

// Выбранная позиция: количество; при частичной выдаче — лиг. вес части (строка поля) и номенкл. № части
export type PickedRow = { row: StockRow; qty: number; issueLig?: string; partNomenkl?: string; toLocation?: string };

// Начальные значения карточки «К выдаче» (редактирование позиции документа)
export type IssueDraft = { issue: number; issueLig?: string; partNomenkl?: string; toLocation?: string };

// Добавлять можно только позиции в этом статусе (остальные видны при смене фильтра, но не выбираются)
const STOCK_STATUS = "На складе";
const ALL_STATUSES = "Все статусы";

const ALL_KLASS = "Все классы";
const ALL_CODES = "Все коды";
const ALL_LOCS = "Все места хранения";

const round2 = (v: number) => Math.round(v * 100) / 100;
const fmtW = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(2));

// Карточка панели «К выдаче»: part — «Выдать часть»; qty / lig — строки полей; partNomenkl — номер части
// toLoc — новое размещение на складе-получателе (issue.toSklad)
type Card = { part: boolean; qty: string; lig: string; partNomenkl?: string; toLoc?: string };

export default function StockPickerModal({
  title,
  rows,
  already = {},
  showWeights = false,
  probaPct = false,
  withStatus = false,
  selectableStatuses = [STOCK_STATUS],
  defaultStatus = STOCK_STATUS,
  statusNote,
  excludeKlass,
  emptyText = "Нет доступных позиций на складе",
  addLabel = "Добавить",
  toolbar,
  skladFilter,
  showSklad = false,
  issue,
  notice,
  onClose,
  onAdd,
}: {
  title: string;
  rows: StockRow[];
  // Уже взятые позиции (id → кол-во) — повторно не предлагаются
  already?: Record<string, number>;
  // Показывать пробу и массы (для ДМ)
  showWeights?: boolean;
  // Проба — фактическая, в % с 2 знаками; чистый вес — по ней (r.net); для шихтовых карт
  probaPct?: boolean;
  // Классы, которые не предлагаются в фильтре (позиции этих классов не передаются в rows)
  excludeKlass?: string[];
  // Столбец и фильтр «Статус» (значения — справочник «Статусы позиций»)
  withStatus?: boolean;
  // Статусы, в которых позицию можно отметить (при withStatus), и статус фильтра по умолчанию
  selectableStatuses?: string[];
  defaultStatus?: string;
  // Подпись под статусом позиции (например, шихтовая карта резерва)
  statusNote?: (r: StockRow) => string | undefined;
  emptyText?: string;
  addLabel?: string;
  // Дополнительные поля над фильтрами (например, выбор склада)
  toolbar?: React.ReactNode;
  // Показывать только позиции этого склада; отмеченные позиции других складов сохраняются и тоже добавляются
  skladFilter?: string;
  // Столбец «Склад» (подбор с нескольких складов)
  showSklad?: boolean;
  // Частичная выдача: панель «К выдаче». usedNomenkl — занятые номенкл. № (склад, документы, операции,
  // позиции текущего документа кроме редактируемой); initial — предвыбранные позиции с заполненными полями
  // toSklad — склад-получатель: в карточке поля «Новое размещение»; edit — редактирование одной позиции
  // (в таблице только позиции initial, без фильтров); noPart — только целиком (позиции по шихте)
  issue?: { usedNomenkl: Iterable<string>; initial?: Record<string, IssueDraft>; toSklad?: string; edit?: boolean; noPart?: boolean };
  // Предупреждение под таблицей по отмеченным позициям (например, позиции из резерва)
  notice?: (picked: StockRow[]) => React.ReactNode;
  onClose: () => void;
  onAdd: (picked: PickedRow[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [klass, setKlass] = useState(ALL_KLASS);
  const [code, setCode] = useState(ALL_CODES);
  const [loc, setLoc] = useState(ALL_LOCS);
  const [onlySelected, setOnlySelected] = useState(false);
  const { statusDicts, storageLocations: locs } = useApp();
  const toSklad = issue?.toSklad;
  const editMode = !!issue?.edit;
  const statusOptions = [ALL_STATUSES, ...(statusDicts.find(d => d.group === "pozicii")?.items.map(i => i.name).filter(n => n !== "Закрыта") ?? [STOCK_STATUS])];
  const [status, setStatus] = useState(defaultStatus);
  // Выбрать можно только позицию в разрешённом статусе
  const selectable = (r: StockRow) => !withStatus || !r.status || selectableStatuses.includes(r.status);

  // Карточки «К выдаче» по отмеченным позициям (без issue — только отметка)
  const [cards, setCards] = useState<Record<string, Card>>(() => {
    const out: Record<string, Card> = {};
    for (const [id, d] of Object.entries(issue?.initial ?? {})) {
      const r = rows.find(x => x.id === id);
      if (!r) continue;
      const part = r.qty > 1 && d.issue < r.qty;
      out[id] = { part, qty: String(part ? d.issue : r.qty), lig: d.issueLig ?? "", partNomenkl: d.partNomenkl, toLoc: d.toLocation ?? r.location };
    }
    return out;
  });

  // Без количества изделий позиция берётся целиком; уже взятые не предлагаются
  const available = rows.filter(r => !(r.id in already) && (!editMode || r.id in (issue?.initial ?? {})));
  const codeLabel = useMaterialCodeLabel();
  const codes = [ALL_CODES, ...Array.from(new Set(available.map(r => r.code))).sort()];
  const locations = [ALL_LOCS, ...Array.from(new Set(available.map(r => r.location))).sort()];

  const filtered = available.filter(r => {
    const q = search.trim().toLowerCase();
    return (!q || r.name.toLowerCase().includes(q) || r.nomenkl.toLowerCase().includes(q))
      && (klass === ALL_KLASS || r.klass === klass)
      && (code === ALL_CODES || r.code === code)
      && (loc === ALL_LOCS || r.location === loc)
      && (!skladFilter || onlySelected || r.sklad === skladFilter)
      && (!onlySelected || r.id in cards)
      && (!withStatus || onlySelected || status === ALL_STATUSES || r.status === status);
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    nomenkl: r => r.nomenkl,
    name: r => r.name,
    klass: r => r.klass,
    code: r => codeLabel(r.code),
    proba: r => r.proba ?? 0,
    lig: r => r.lig ?? 0,
    net: r => r.net ?? 0,
    oborot: r => r.oborot ?? 0,
    location: r => r.location,
    sklad: r => r.sklad ?? "",
    qty: r => r.qty,
  });

  // Отмеченные позиции в порядке списка
  const pickedRows = available.filter(r => r.id in cards);
  const selectedCount = pickedRows.length;
  const allChecked = filtered.some(selectable) && filtered.filter(selectable).every(r => r.id in cards);

  // При отметке — «Выдать всё»
  // Новое размещение по умолчанию — текущее место позиции (на складе-получателе)
  const newCard = (r: StockRow): Card => ({ part: false, qty: String(r.qty), lig: "", toLoc: r.location });
  const toggle = (r: StockRow) => setCards(prev => {
    const next = { ...prev };
    if (r.id in next) delete next[r.id]; else next[r.id] = newCard(r);
    return next;
  });
  const toggleAll = () => setCards(prev => {
    const next = { ...prev };
    if (allChecked) filtered.forEach(r => delete next[r.id]);
    else filtered.filter(selectable).forEach(r => { if (!(r.id in next)) next[r.id] = newCard(r); });
    return next;
  });

  // ── Расчёт карточки ──
  const issueOf = (r: StockRow, c: Card) => {
    if (!c.part) return r.qty;
    const n = parseInt(c.qty, 10);
    return Number.isFinite(n) ? n : 0;
  };
  const lineOf = (r: StockRow, c: Card) => IssueLine.of({ qty: r.qty, issue: issueOf(r, c), lig: r.lig, issueLig: c.lig, klass: r.klass });
  // Номер части — следующий свободный среди занятых и уже выданных другим карточкам
  const reserveNomenkl = (all: Record<string, Card>, id: string) =>
    nextNomenkl([...(issue?.usedNomenkl ?? []), ...Object.entries(all).filter(([k]) => k !== id).map(([, c]) => c.partNomenkl ?? "")]);
  const update = (id: string, patch: (c: Card) => Card) => setCards(prev => (id in prev ? { ...prev, [id]: patch(prev[id]) } : prev));
  // Пропорциональный вес части по количеству
  const propLig = (r: StockRow, q: number) => (r.lig != null && r.qty > 0 && q > 0 ? round2(r.lig * q / r.qty).toFixed(2) : "");
  const setPart = (r: StockRow, part: boolean) => setCards(prev => {
    const c = prev[r.id];
    if (!c) return prev;
    if (!part) return { ...prev, [r.id]: { ...c, part: false } };
    const q = Math.max(1, Math.min(r.qty - 1, Math.ceil(r.qty / 2)));
    return { ...prev, [r.id]: { ...c, part: true, qty: String(q), lig: propLig(r, q), partNomenkl: c.partNomenkl ?? reserveNomenkl(prev, r.id) } };
  });
  // Количество части: всё доступное — карточка переходит в «Выдать всё»; вес — пропорционально количеству
  const setPartQty = (r: StockRow, v: string) => {
    const s = v.replace(/[^\d]/g, "");
    const n = parseInt(s, 10);
    update(r.id, c => ({ ...c, qty: s, lig: Number.isFinite(n) ? propLig(r, n) : c.lig }));
  };
  const setPartLig = (r: StockRow, v: string) => update(r.id, c => ({ ...c, lig: v.replace(/[^\d.,]/g, "") }));

  // Часть — строго меньше количества позиции (всё количество — «Выдать всё»); поле подсвечивается, режим не меняется
  const partQtyBad = (r: StockRow, c: Card) => c.part && (!lineOf(r, c).qtyOk || issueOf(r, c) >= r.qty);
  const hasErrors = !!issue && pickedRows.some(r => !lineOf(r, cards[r.id]).ok || partQtyBad(r, cards[r.id]));

  const reset = () => { setSearch(""); setKlass(ALL_KLASS); setCode(ALL_CODES); setLoc(ALL_LOCS); setOnlySelected(false); setStatus(defaultStatus); };

  const add = () => {
    if (hasErrors) return;
    const picked: PickedRow[] = pickedRows.map(r => {
      const c = cards[r.id];
      if (!issue) return { row: r, qty: r.qty };
      const line = lineOf(r, c);
      const loc = toSklad ? { toLocation: c.toLoc ?? r.location } : {};
      return line.partial
        ? { row: r, qty: line.issue, issueLig: line.needsLig ? c.lig : undefined, partNomenkl: c.partNomenkl ?? reserveNomenkl(cards, r.id), ...loc }
        : { row: r, qty: r.qty, ...loc };
    });
    if (picked.length) onAdd(picked);
  };

  // ── Карточка панели «К выдаче» ──
  const qtyText = (n: number) => (n > 0 ? `${n} шт` : "—");
  const amount = (r: StockRow, n: number, lig: number | null, stone: boolean) =>
    stone || r.lig == null ? qtyText(n) : `${qtyText(n)} / ${fmtW(lig)} г`;
  const inputCls = (invalid: boolean) =>
    `w-full px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${invalid ? "border-red-400 ring-1 ring-red-400" : "border-gray-200"}`;
  const issueCard = (r: StockRow) => {
    const c = cards[r.id];
    const line = lineOf(r, c);
    const stone = line.stone;
    // Штучная позиция (и без количества изделий) — только целиком
    const whole = r.qty <= 1 || !!issue?.noPart;
    const qtyBad = partQtyBad(r, c);
    const ligBad = c.part && line.qtyOk && !line.ligOk;
    const partLig = line.partial ? (stone ? null : line.issuedLig) : r.lig;
    return (
      <div key={r.id} className={`border rounded-lg p-3 text-sm ${line.ok && !qtyBad ? "border-gray-200 bg-white" : "border-red-300 bg-red-50/40"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium truncate min-w-0" title={r.name}>{r.name}</div>
          {!editMode && <DeleteIcon onClick={() => toggle(r)} />}
        </div>
        {whole ? (
          <div className="mt-2 text-xs text-gray-400">целиком</div>
        ) : (
          <div className="mt-2 inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {([false, true] as const).map(part => (
              <button
                key={String(part)}
                type="button"
                onClick={() => setPart(r, part)}
                className={`px-3 py-1.5 ${c.part === part ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                {part ? "Выдать часть" : "Выдать всё"}
              </button>
            ))}
          </div>
        )}
        {c.part && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Количество, шт</label>
              <input value={c.qty} onChange={e => setPartQty(r, e.target.value)} inputMode="numeric" placeholder={`1 … ${r.qty - 1}`} className={inputCls(qtyBad)} />
              {qtyBad && <div className="text-xs text-red-600 mt-1">{!line.qtyOk ? `Количество от 1 до ${r.qty - 1}` : `Всю позицию — «Выдать всё» (часть: до ${r.qty - 1})`}</div>}
            </div>
            {!stone && r.lig != null && r.lig > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Вес лигат. части, г</label>
                <input value={c.lig} onChange={e => setPartLig(r, e.target.value)} inputMode="decimal" placeholder={`< ${fmtW(r.lig)}`} className={inputCls(ligBad)} />
                {ligBad && <div className="text-xs text-red-600 mt-1">{line.error}</div>}
              </div>
            )}
            {!stone && r.lig != null && r.lig > 0 && (
              <div className="col-span-2 text-[11px] text-gray-500">Вес рассчитан пропорционально — уточните по факту взвешивания</div>
            )}
          </div>
        )}
        {/* Итог частичной выдачи (данные позиции целиком — в таблице) */}
        {line.ok && !qtyBad && line.partial && (
          <div className="mt-2 space-y-0.5 text-xs">
            <div className="text-gray-800">Выдаётся: {amount(r, line.issue, partLig, stone)} · новый № {c.partNomenkl ?? "—"}</div>
            <div className="text-gray-500">Остаётся на складе: {amount(r, line.restQty, line.restLig, stone)} · № {r.nomenkl}</div>
          </div>
        )}
        {toSklad && newLocation(r, c)}
      </div>
    );
  };

  // «Новое размещение» на складе-получателе: сейф и полка (доступные ячейки справочника «Места хранения»);
  // значение не из справочника (по умолчанию — место на складе-отправителе) остаётся в списке
  const selCls = "w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50";
  const newLocation = (r: StockRow, c: Card) => {
    const sk = toSklad!;
    const seyfs = seyfsOf(locs, sk);
    if (seyfs.length === 0) return <div className="mt-2 text-xs text-gray-500">Новое размещение: {sk} · без места</div>;
    const cur = parseLoc(c.toLoc ?? r.location ?? "");
    const seyfOpts = [NO_LOC, ...(cur.seyf !== NO_LOC && !seyfs.includes(cur.seyf) ? [cur.seyf] : []), ...seyfs];
    const pl = cur.seyf !== NO_LOC ? polkasOf(locs, sk, cur.seyf) : [];
    const polkaOpts = [NO_LOC, ...(cur.polka !== NO_LOC && !pl.includes(cur.polka) ? [cur.polka] : []), ...pl];
    const unknown = cur.seyf !== NO_LOC && (!seyfs.includes(cur.seyf) || (cur.polka !== NO_LOC && !pl.includes(cur.polka)));
    const set = (loc: string) => update(r.id, x => ({ ...x, toLoc: loc }));
    return (
      <div className="mt-3 pt-2 border-t border-gray-100">
        <div className="text-xs font-medium text-gray-500 mb-1">Новое размещение · {sk}</div>
        <div className="grid grid-cols-2 gap-2">
          <select value={cur.seyf} onChange={e => set(formatLoc(e.target.value, polkasOf(locs, sk, e.target.value)[0] ?? NO_LOC))} className={selCls} title="Сейф">
            {seyfOpts.map(v => <option key={v} value={v}>{v === NO_LOC ? "Сейф —" : `Сейф №${v}`}</option>)}
          </select>
          <select value={cur.polka} onChange={e => set(formatLoc(cur.seyf, e.target.value))} className={selCls} disabled={cur.seyf === NO_LOC} title="Полка">
            {polkaOpts.map(v => <option key={v} value={v}>{v === NO_LOC ? "Полка —" : `Полка ${v}`}</option>)}
          </select>
        </div>
        {unknown && <div className="text-[11px] text-orange-600 mt-1">Такого места нет на складе «{sk}» — выберите сейф и полку</div>}
      </div>
    );
  };

  const pg11 = usePaged(sorted, "stock-picker");
  const table = filtered.length === 0 ? (
    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
      {available.length === 0 ? emptyText : "Нет позиций по заданным фильтрам"}
    </div>
  ) : (
    <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10"><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
          <th className="w-10 px-3 py-2"><input type="checkbox" checked={allChecked} onChange={toggleAll} disabled={editMode} className="w-4 h-4 accent-blue-600" title="Выбрать все найденные" /></th>
          <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className="px-3 py-2">Номенкл. №</SortTh>
          <SortTh sortKey="name" sort={sort} onSort={toggleSort} className="px-3 py-2">Наименование</SortTh>
          <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className="px-3 py-2">Класс</SortTh>
          <SortTh sortKey="code" sort={sort} onSort={toggleSort} className="px-3 py-2">Код</SortTh>
          {showWeights && <>
            <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className="px-3 py-2">{probaPct ? "Проба, %" : "Проба"}</SortTh>
            <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className="px-3 py-2">Вес лигат.</SortTh>
            <SortTh sortKey="net" sort={sort} onSort={toggleSort} className="px-3 py-2">{probaPct ? "Чистый вес, г" : NET_AU_AG}</SortTh>
            <SortTh sortKey="oborot" sort={sort} onSort={toggleSort} className="px-3 py-2">{OBOROT_LABEL}</SortTh>
          </>}
          {showSklad && <SortTh sortKey="sklad" sort={sort} onSort={toggleSort} className="px-3 py-2">Склад</SortTh>}
          <SortTh sortKey="location" sort={sort} onSort={toggleSort} className="px-3 py-2">Место хранения</SortTh>
          {withStatus && <th className="px-3 py-2 text-left">Статус</th>}
          <SortTh sortKey="qty" sort={sort} onSort={toggleSort} className="px-3 py-2">Количество</SortTh>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {pg11.pageItems.map(r => {
            const checked = r.id in cards;
            const note = statusNote?.(r);
            return (
              <tr key={r.id} className={`hover:bg-gray-50 ${checked ? "bg-blue-50/50" : oborotRowCls(r.oborot, r.code)}`}>
                <td className="px-3 py-2"><input type="checkbox" checked={checked} onChange={() => toggle(r)} disabled={!selectable(r) || editMode} title={selectable(r) ? undefined : `Позиция в статусе «${r.status}» — добавить нельзя`} className="w-4 h-4 accent-blue-600 disabled:opacity-30" /></td>
                <td className="px-3 py-2 text-gray-500">{r.nomenkl}</td>
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2"><KlassCode value={r.klass} /></td>
                <td className="px-3 py-2 text-blue-600">{codeLabel(r.code)}</td>
                {showWeights && <>
                  <td className="px-3 py-2">{probaPct && r.proba ? (r.proba / 10).toFixed(2).replace(".", ",") : probaText(r.proba)}</td>
                  <td className="px-3 py-2">{r.lig}</td>
                  <td className="px-3 py-2">{probaPct ? (r.net != null ? r.net.toFixed(2).replace(".", ",") : "—") : <NetAuAg chem={r.chem} />}</td>
                  <td className="px-3 py-2"><OborotValue value={r.oborot} code={r.code} /></td>
                </>}
                {showSklad && <td className="px-3 py-2 whitespace-nowrap">{r.sklad ?? "—"}</td>}
                <td className="px-3 py-2 text-gray-500">{r.location}</td>
                {withStatus && <td className="px-3 py-2">
                  {r.status ? <Badge label={r.status} group="pozicii" /> : "—"}
                  {note && <div className="text-xs text-gray-400 mt-0.5">{note}</div>}
                </td>}
                <td className="px-3 py-2 text-gray-500">{r.qty || "—"}</td>
              </tr>
            );
          })}
          <FillerRows count={pg11.fill} cols={12} />
        </tbody>
      </table>
      {pg11.pager}
    </div>
  );

  const noticeNode = notice?.(pickedRows);
  return (
    <Modal
      title={title}
      onClose={onClose}
      largeWide={!issue}
      fullWide={!!issue}
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
        <Btn onClick={add} disabled={selectedCount === 0 || hasErrors}>{editMode ? "Сохранить" : `${addLabel}${selectedCount > 0 ? ` (${selectedCount})` : ""}`}</Btn>
      </>}
    >
      <div className={issue ? "flex flex-col lg:flex-row gap-4" : ""}>
        <div className="flex-1 min-w-0">
          {toolbar && <div className="mb-3">{toolbar}</div>}
          {!editMode && <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Наименование / Номенкл. №</label>
              <SearchInput value={search} onChange={setSearch} placeholder="Поиск..." />
            </div>
            <Field label="Класс материала"><KlassSelect value={klass} onChange={setKlass} allLabel={ALL_KLASS} exclude={excludeKlass} /></Field>
            <Field label="Код материала"><Select value={code} options={codes} onChange={setCode} optionLabel={v => (v === ALL_CODES ? v : codeLabel(v))} /></Field>
            <div className={withStatus ? "" : "col-span-2"}>
              <Field label="Место хранения"><Select value={loc} options={locations} onChange={setLoc} /></Field>
            </div>
            {withStatus && <Field label="Статус"><Select value={status} options={statusOptions} onChange={setStatus} /></Field>}
            <label className="flex items-center gap-2 text-sm text-gray-700 h-9 cursor-pointer">
              <input type="checkbox" checked={onlySelected} onChange={e => setOnlySelected(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              Только выбранные
            </label>
            <button onClick={reset} className="h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Сбросить фильтры</button>
          </div>}

          {!editMode && <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Найдено: {filtered.length} из {skladFilter && !onlySelected ? available.filter(r => r.sklad === skladFilter).length : available.length}</span>
            <span>Выбрано: {selectedCount}</span>
          </div>}
          {table}
          {noticeNode && <div className="mt-3">{noticeNode}</div>}
        </div>

        {issue && (
          <aside className="lg:w-96 shrink-0">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{editMode ? "Изменение позиции" : `К выдаче (${selectedCount})`}</h4>
            {selectedCount === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">Отметьте позиции в таблице</div>
            ) : (
              <div className="space-y-2 lg:max-h-[60vh] lg:overflow-y-auto lg:pr-1">{pickedRows.map(issueCard)}</div>
            )}
          </aside>
        )}
      </div>
    </Modal>
  );
}
