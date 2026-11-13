import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useApp } from "../store/AppContext";
import { PosStatusBadge, PageHeader, EyeIcon, Tabs, SortTh, useSort, KlassCode, useMaterialCodeLabel, SearchInput, Select, KlassSelect, probaText, NetAuAg, NET_AU_AG, usePaged, FillerRows, parseRuDate,
} from "../components/ui";
import { Podotchetnik, PodotchetPosition, Operation, OperPosition, StatusDM, spravValues, opVydacha, opVozvrat } from "../data/mock";
import { ArrowLeft } from "lucide-react";
import { matchPage, useTabParam, PAGE_PATHS } from "../router";

// ── Фильтры позиций: компактная строка ──────────────────────────────────────

const ALL_KLASS = "Все классы";
const ALL_METALS = "Все коды материала";
const ALL_VIDS = "Все виды операций";

function usePositionFilters(rows: ProcRow[]) {
  const codeLabel = useMaterialCodeLabel();
  const [search, setSearch] = useState("");
  const [vid, setVid] = useState(ALL_VIDS);
  const [klass, setKlass] = useState(ALL_KLASS);
  const [metal, setMetal] = useState(ALL_METALS);

  const vids = [ALL_VIDS, ...Array.from(new Set(rows.map(r => r.vid))).sort((a, b) => vidOrder(a) - vidOrder(b))];
  const metals = [ALL_METALS, ...Array.from(new Set(rows.map(r => r.metal).filter(Boolean))).sort()];

  const q = search.trim().toLowerCase();
  const match = (r: ProcRow) =>
    (!q || r.name.toLowerCase().includes(q) || r.nomenkl.toLowerCase().includes(q))
    && (vid === ALL_VIDS || r.vid === vid)
    && (klass === ALL_KLASS || r.klass === klass)
    && (metal === ALL_METALS || r.metal === metal);
  const active = !!q || vid !== ALL_VIDS || klass !== ALL_KLASS || metal !== ALL_METALS;
  const reset = () => { setSearch(""); setVid(ALL_VIDS); setKlass(ALL_KLASS); setMetal(ALL_METALS); };

  // Подписи полей не выводятся — их роль видна по значению «Все …» и пояснению внутри поля поиска
  const bar = (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <div className="w-72"><SearchInput value={search} onChange={setSearch} placeholder="Поиск..." scope="Наим. · Номенкл. №" /></div>
      <div className="w-52"><Select value={vid} options={vids} onChange={setVid} /></div>
      <div className="w-44"><KlassSelect value={klass} onChange={setKlass} allLabel={ALL_KLASS} /></div>
      <div className="w-56"><Select value={metal} options={metals} onChange={setMetal} optionLabel={v => (v === ALL_METALS ? v : codeLabel(v))} /></div>
      {active && <button onClick={reset} className="px-2 text-sm text-blue-600 hover:text-blue-700">Сбросить</button>}
    </div>
  );
  return { match, bar };
}

// ── Единая таблица позиций подотчётника ──────────────────────────────────────
// Одна строка — одна позиция, в каждой ячейке одно значение. Слева — вид операции (подсказка: номер, дата
// и статус операции) и наименование изделия операции (подсказка: полные сведения, клик — открыть операцию).
// Одинакова для баланса и вкладок «Всего получено» / «Всего возвращено».

// opId / opNo / opDate / opStage — операция движения материала, в которой позиция получена или возвращена
// opTab — вкладка операции, открываемая по ссылке; vid / izdelie — вид операции и наименование изделия
type ProcRow = PodotchetPosition & {
  key: string; vid: string; izdelie?: string; date: string;
  opId?: string; opNo?: string; opDate?: string; opStage?: string; opTab?: "vydacha" | "vozvrat";
};

// Порядок по умолчанию: по справочнику «Виды операций», внутри вида — по дате (новые сверху)
const byVidDate = (a: ProcRow, b: ProcRow) => vidOrder(a.vid) - vidOrder(b.vid) || parseRuDate(b.date) - parseRuDate(a.date);

// Подсказки: у вида операции — номер, дата и статус; у наименования изделия — всё вместе
const opInfo = (r: ProcRow) =>
  r.opId
    ? [`Операция № ${r.opNo} от ${r.opDate}`, r.opStage && `Статус: ${r.opStage}`].filter(Boolean).join("\n")
    : r.date ? `Без операции движения материала\nДата: ${r.date}` : "Без операции движения материала";
const izdelieInfo = (r: ProcRow) =>
  [r.izdelie?.trim() && `Наименование изделия: ${r.izdelie.trim()}`, `Вид операции: ${r.vid}`, opInfo(r), r.opId && "Нажмите, чтобы открыть операцию"]
    .filter(Boolean).join("\n");

function PositionsTable({ rows, pageKey, onOpenOperation }: { rows: ProcRow[]; pageKey: string; onOpenOperation: (r: ProcRow) => void }) {
  const codeLabel = useMaterialCodeLabel();
  // Химический состав для подсказки у пробы — из позиции склада ДМ
  const { dmItems } = useApp();
  const { sorted, sort, toggleSort } = useSort(rows, {
    vid: r => vidOrder(r.vid),
    izdelie: r => r.izdelie ?? "",
    nomenkl: r => r.nomenkl,
    name: r => r.name,
    qty: r => r.qty,
    klass: r => r.klass,
    metal: r => codeLabel(r.metal),
    proba: r => r.proba,
    lig: r => r.ligWeight,
    net: r => r.netWeight,
    loc: r => r.location,
    status: r => r.status,
  });
  const ordered = sort ? sorted : [...rows].sort(byVidDate);
  const th = "px-3 py-2";
  const pg = usePaged(ordered, pageKey);
  const cols = 12;
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200 whitespace-nowrap">
            <SortTh sortKey="vid" sort={sort} onSort={toggleSort} className={th}>Вид операции</SortTh>
            <SortTh sortKey="izdelie" sort={sort} onSort={toggleSort} className={th}>Наименование изделия</SortTh>
            <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className={th}>Номенкл. №</SortTh>
            <SortTh sortKey="name" sort={sort} onSort={toggleSort} className={th}>Наименование</SortTh>
            <SortTh sortKey="qty" sort={sort} onSort={toggleSort} className={th}>Количество</SortTh>
            <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className={th}>Класс</SortTh>
            <SortTh sortKey="metal" sort={sort} onSort={toggleSort} className={th}>Код материала</SortTh>
            <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className={th}>Проба</SortTh>
            <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className={th}>Вес лигат.</SortTh>
            <SortTh sortKey="net" sort={sort} onSort={toggleSort} className={th}>{NET_AU_AG}</SortTh>
            <SortTh sortKey="loc" sort={sort} onSort={toggleSort} className={th}>Место хранения</SortTh>
            <SortTh sortKey="status" sort={sort} onSort={toggleSort} className={th}>Статус</SortTh>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {pg.pageItems.map(r => {
              const izdelie = r.izdelie?.trim() || "—";
              return (
                <tr key={r.key} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                    <span className="cursor-help border-b border-dotted border-gray-400" title={opInfo(r)}>{r.vid}</span>
                  </td>
                  <td className="px-3 py-2 max-w-[16rem]">
                    {r.opId
                      ? <button onClick={() => onOpenOperation(r)} className="block max-w-full truncate text-left text-blue-600 hover:underline" title={izdelieInfo(r)}>{izdelie}</button>
                      : <span className="block truncate text-gray-700 cursor-help" title={izdelieInfo(r)}>{izdelie}</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.nomenkl}</td>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{r.qty}</td>
                  <td className="px-3 py-2"><KlassCode value={r.klass} /></td>
                  <td className="px-3 py-2 text-blue-600 font-medium whitespace-nowrap">{r.metal ? codeLabel(r.metal) : "—"}</td>
                  <td className="px-3 py-2">{probaText(r.proba)}</td>
                  <td className="px-3 py-2 tabular-nums">{r.ligWeight.toFixed(2)}</td>
                  <td className="px-3 py-2"><NetAuAg chem={dmItems.find(d => d.nomenkl === r.nomenkl)?.chem} /></td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.location}</td>
                  <td className="px-3 py-2"><PosStatusBadge status={r.status} nomenkl={r.nomenkl} /></td>
                </tr>
              );
            })}
            {ordered.length === 0 && (
              <tr><td colSpan={cols} className="px-3 py-6 text-center text-gray-400 text-sm">Позиции отсутствуют</td></tr>
            )}
            <FillerRows count={pg.fill} cols={cols} />
          </tbody>
        </table>
      </div>
      {pg.pager}
    </div>
  );
}

// Итог по позициям под заголовком таблицы
const summaryText = (rows: ProcRow[]) =>
  `позиций: ${rows.length} · вес лигат.: ${rows.reduce((s, r) => s + r.ligWeight, 0).toFixed(2)} г`;

// ── Сводка баланса по коду материала: вес лигатурный и чистый ─────────────────

// Граммы элемента из хим. состава позиции (как в столбце «Вес чист. Au/Ag» таблицы); нет значения — null
const chemG = (v: string | undefined) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};
type CodeSum = { n: number; lig: number; au: number | null; ag: number | null };
// Сумма с учётом «нет значения»: если ни у одной позиции элемента нет — «—»
const addG = (a: number | null, b: number | null) => (a === null && b === null ? null : (a ?? 0) + (b ?? 0));

function BalanceByCode({ rows }: { rows: ProcRow[] }) {
  const codeLabel = useMaterialCodeLabel();
  const { dmItems } = useApp();
  const map = new Map<string, CodeSum>();
  for (const r of rows) {
    const k = r.metal || "";
    const chem = dmItems.find(d => d.nomenkl === r.nomenkl)?.chem;
    const s = map.get(k) ?? { n: 0, lig: 0, au: null, ag: null };
    s.n += 1; s.lig += r.ligWeight;
    s.au = addG(s.au, chemG(chem?.au));
    s.ag = addG(s.ag, chemG(chem?.ag));
    map.set(k, s);
  }
  const groups = [...map.entries()].sort(([a], [b]) => (a || "~").localeCompare(b || "~"));
  if (groups.length === 0) return null;
  const total = groups.reduce<CodeSum>((t, [, s]) => ({ n: t.n + s.n, lig: t.lig + s.lig, au: addG(t.au, s.au), ag: addG(t.ag, s.ag) }), { n: 0, lig: 0, au: null, ag: null });
  const g2 = (v: number) => v.toFixed(2);
  const auAg = (s: CodeSum) => `${s.au === null ? "—" : g2(s.au)} / ${s.ag === null ? "—" : g2(s.ag)}`;
  const td = "px-3 py-1.5 text-right tabular-nums";
  return (
    <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200 whitespace-nowrap">
          <th className="px-3 py-1.5 text-left font-medium">Код материала</th>
          <th className="px-3 py-1.5 text-right font-medium">Позиций</th>
          <th className="px-3 py-1.5 text-right font-medium">Вес лигат., г</th>
          <th className="px-3 py-1.5 text-right font-medium">{NET_AU_AG}, г</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {groups.map(([code, s]) => (
            <tr key={code || "-"}>
              <td className="px-3 py-1.5 text-blue-600 font-medium">{code ? codeLabel(code) : "Без кода"}</td>
              <td className={td}>{s.n}</td>
              <td className={td}>{g2(s.lig)}</td>
              <td className={td}>{auAg(s)}</td>
            </tr>
          ))}
          <tr className="bg-gray-50 font-semibold text-gray-900">
            <td className="px-3 py-1.5">Итого</td>
            <td className={td}>{total.n}</td>
            <td className={td}>{g2(total.lig)}</td>
            <td className={td}>{auAg(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Порядок видов операций — как в справочнике «Виды операций»
const vidOrder = (vid: string) => {
  const i = spravValues("Виды операций").indexOf(vid);
  return i < 0 ? 999 : i;
};

// Подотчётное лицо в операции записано полным ФИО или как «Фамилия И.О.»
const shortFio = (full: string) => {
  const [last, ...rest] = full.trim().split(/\s+/);
  return [last, rest.map(n => `${n[0]}.`).join("")].filter(Boolean).join(" ");
};
const isPersonOp = (o: Operation, person: Podotchetnik) =>
  [o.responsible, o.poluchil].some(r => !!r && (r === person.name || r === shortFio(person.name)));

// Позиции считаются полученными с сохранения операции («В работе»), возвращёнными — после её завершения
const isIssued = (_o: Operation) => true;
const isReturned = (o: Operation) => o.stage === "Завершено";

// ── Карточка подотчётного лица ────────────────────────────────────────────────

function PodotchetnikCard({ person, onBack }: { person: Podotchetnik; onBack: () => void }) {
  const { operations, dmItems } = useApp();
  const routerNavigate = useNavigate();
  const [tab, setTab] = useTabParam<"Всего получено" | "Всего возвращено">(
    { "Всего получено": "polucheno", "Всего возвращено": "vozvrashcheno" },
    "Всего получено",
  );
  const received = tab === "Всего получено";
  const openOperation = (r: ProcRow) => {
    if (r.opId) routerNavigate(`${PAGE_PATHS["dvizhenie-mat"]}/view/${r.opId}?tab=${r.opTab ?? "vydacha"}`);
  };

  // Баланс: позиции в подотчёте; атрибуты позиции ДМ берутся из процессов, где она была выдана.
  // Вид операции — по операции движения материала, в которой позиция выдана (не завершённая — приоритетно),
  // иначе по процессу подотчётника, где позиция числится
  const processes = [...person.currentProcesses, ...person.completedProcesses];
  const allPositions = processes.flatMap(p => p.positions);
  const allPersonOps = operations.filter(o => isPersonOp(o, person));
  const sourceOf = (nomenkl: string): Pick<ProcRow, "vid" | "izdelie" | "date" | "opId" | "opNo" | "opDate" | "opStage" | "opTab"> => {
    const withPos = allPersonOps.filter(o => opVydacha(o).some(p => p.nomenkl === nomenkl));
    const op = withPos.find(o => !isReturned(o)) ?? withPos[0];
    if (op) return { vid: op.vid, izdelie: op.description, date: op.date, opId: op.id, opNo: op.document, opDate: op.date, opStage: op.stage, opTab: "vydacha" };
    const pr = processes.find(p => p.positions.some(x => x.nomenkl === nomenkl));
    return pr ? { vid: pr.vid, izdelie: pr.name, date: pr.date } : { vid: "Без операции", date: "" };
  };
  const balance: ProcRow[] = person.materials.map((m, i) => {
    const pos = allPositions.find(p => p.nomenkl === m.nomenkl);
    const base: PodotchetPosition = pos ?? { name: m.name, nomenkl: m.nomenkl, klass: "", metal: "", qty: 1, proba: 0, ligWeight: m.weight, netWeight: m.weight, location: "—", status: "В подотчёте" };
    return { ...base, ...sourceOf(m.nomenkl), key: `b-${i}` };
  });
  const balanceF = usePositionFilters(balance);
  const balanceRows = balance.filter(balanceF.match);

  // Операции движения материала по подотчётнику: полученные (вкладка «Выдача») / возвращённые (вкладка «Возврат») позиции
  const personOps = allPersonOps.filter(o => (received ? isIssued(o) : isReturned(o)));
  const toRow = (o: Operation, p: OperPosition, i: number): ProcRow => {
    const dm = dmItems.find(d => d.nomenkl === p.nomenkl);
    // Текущий статус — со склада ДМ; иначе: полученная в открытой операции — в подотчёте, возвращённая — на складе
    const status: StatusDM = dm?.status ?? (received ? (isReturned(o) ? "Закрыта" : "В подотчёте") : "На складе");
    return {
      key: `${o.id}-${i}`, name: p.name, nomenkl: p.nomenkl, klass: p.klass, metal: p.metal ?? dm?.metal ?? "",
      qty: p.qty ?? 1, proba: p.proba, ligWeight: p.lig ?? p.ves, netWeight: p.net ?? p.ves, location: p.loc, status,
      vid: o.vid, izdelie: o.description, date: o.date,
      opId: o.id, opNo: o.document, opDate: o.date, opStage: o.stage, opTab: received ? "vydacha" : "vozvrat",
    };
  };
  const rows = personOps.flatMap(o => (received ? opVydacha(o) : opVozvrat(o)).map((p, i) => toRow(o, p, i)));
  const opF = usePositionFilters(rows);
  const opRows = rows.filter(opF.match);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Назад к реестру
        </button>
      </div>

      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-gray-500">Подотчётные лица / Карточка подотчётного лица</div>
      </div>

      {/* Dark header card */}
      <div className="bg-slate-900 rounded-xl p-6 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{person.name}</h1>
          <p className="text-slate-400 text-sm">{person.position}</p>
        </div>
        <div className="text-right">
          <div className="text-slate-400 text-xs mb-1">Табельный номер</div>
          <div className="text-white font-semibold text-lg">{person.tabelNo}</div>
        </div>
      </div>

      {/* Баланс: позиции, которые сейчас у подотчётника */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-1">В балансе у подотчётника</h3>
        <div className="text-xs text-gray-500 mb-3">
          Позиции, которые сейчас находятся у подотчётника · {summaryText(balanceRows)}
          {balanceRows.length !== balance.length && ` (из ${balance.length})`}
        </div>
        {balanceF.bar}
        {/* Сводка по коду материала — по отфильтрованным позициям */}
        <BalanceByCode rows={balanceRows} />
        <PositionsTable rows={balanceRows} pageKey="podotchet-balance" onOpenOperation={openOperation} />
      </div>

      {/* Операции движения материала */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <Tabs tabs={["Всего получено", "Всего возвращено"]} active={tab} onChange={t => setTab(t as typeof tab)} />
        <div className="text-xs text-gray-500 mb-3">
          {received ? "Позиции, выданные подотчётнику" : "Позиции, возвращённые подотчётником"} в операциях движения материала ·
          операций: {personOps.length} · {summaryText(opRows)}
          {opRows.length !== rows.length && ` (из ${rows.length})`}
        </div>
        {opF.bar}
        <PositionsTable key={tab} rows={opRows} pageKey="podotchet-positions" onOpenOperation={openOperation} />
      </div>
    </div>
  );
}

// ── Реестр подотчётников ──────────────────────────────────────────────────────

export function Podotchetniki() {
  const { podotchetniki, navigate } = useApp();
  // Карточка — /podotchetniki/:id
  const { pathname } = useLocation();
  const { page, segs } = matchPage(pathname);
  const selected = page === "podotchetnik-card" ? podotchetniki.find(p => p.id === segs[1]) ?? null : null;
  const setSelected = (p: Podotchetnik | null) => (p ? navigate("podotchetnik-card", { id: p.id }) : navigate("podotchetniki"));

  const [fio, setFio] = useState("");
  const [tabel, setTabel] = useState("");
  const filtered = podotchetniki.filter(p =>
    (!fio.trim() || p.name.toLowerCase().includes(fio.trim().toLowerCase()))
    && (!tabel.trim() || p.tabelNo.toLowerCase().includes(tabel.trim().toLowerCase())));

  const { sorted, sort, toggleSort } = useSort(filtered, {
    name: p => p.name,
    tabelNo: p => p.tabelNo,
    balance: p => p.materials.length,
  });
  const pg4 = usePaged(sorted, "podotchetniki");

  if (selected) {
    return <PodotchetnikCard person={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <PageHeader
        title="Подотчётные лица"
        subtitle="Реестр сотрудников, у которых находятся материалы на балансе"
        breadcrumb={["Подотчётные лица"]}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-4 gap-3 items-end">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">ФИО</label>
          <SearchInput value={fio} onChange={setFio} placeholder="Поиск по ФИО..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Табельный №</label>
          <SearchInput value={tabel} onChange={setTabel} placeholder="ТН-..." />
        </div>
        <button onClick={() => { setFio(""); setTabel(""); }} className="h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Сбросить фильтры</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortTh sortKey="name" sort={sort} onSort={toggleSort}>ФИО</SortTh>
              <SortTh sortKey="tabelNo" sort={sort} onSort={toggleSort}>Табельный №</SortTh>
              <SortTh sortKey="balance" sort={sort} onSort={toggleSort}>В балансе, позиций</SortTh>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pg4.pageItems.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-blue-600">{p.tabelNo}</td>
                {/* Количество позиций, которые сейчас у подотчётника */}
                <td className={`px-4 py-3 tabular-nums ${p.materials.length > 0 ? "font-medium text-gray-900" : "text-gray-400"}`}>
                  {p.materials.length}
                </td>
                <td className="px-4 py-3"><EyeIcon onClick={() => setSelected(p)} /></td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">Подотчётное лицо не найдено</td></tr>
            )}
            <FillerRows count={pg4.fill} cols={4} />
          </tbody>
        </table>
        {pg4.pager}
      </div>
    </div>
  );
}
