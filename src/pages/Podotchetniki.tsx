import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useApp } from "../store/AppContext";
import { Badge, PageHeader, EyeIcon, Tabs, SortTh, useSort, KlassCode, useMaterialCodeLabel, SearchInput, Field, Select, KlassSelect } from "../components/ui";
import { Podotchetnik, PodotchetPosition, Operation, OperPosition, StatusDM, spravValues, opVydacha, opVozvrat } from "../data/mock";
import { ArrowLeft, Flame, FlaskConical, Microscope, Zap, Factory, LucideIcon } from "lucide-react";
import { matchPage, useTabParam, PAGE_PATHS } from "../router";

const vidIcon: Record<string, LucideIcon> = {
  "Плавка": Flame,
  "Анализ в ЛКИ": FlaskConical,
  "Отбор пробы": Microscope,
  "Гальванопокрытие": Zap,
  "Производство ГП": Factory,
};

// ── Фильтры позиций (как в подборе позиций ДМ) ────────────────────────────────

const ALL_KLASS = "Все классы";
const ALL_METALS = "Все металлы";
const ALL_LOCS = "Все места хранения";
const ALL_STATUSES = "Все статусы";

function usePositionFilters<T extends PodotchetPosition>(rows: T[]) {
  const codeLabel = useMaterialCodeLabel();
  const [search, setSearch] = useState("");
  const [klass, setKlass] = useState(ALL_KLASS);
  const [metal, setMetal] = useState(ALL_METALS);
  const [loc, setLoc] = useState(ALL_LOCS);
  const [status, setStatus] = useState(ALL_STATUSES);

  const metals = [ALL_METALS, ...Array.from(new Set(rows.map(r => r.metal).filter(Boolean))).sort()];
  const locations = [ALL_LOCS, ...Array.from(new Set(rows.map(r => r.location).filter(Boolean))).sort()];
  const statuses = [ALL_STATUSES, ...Array.from(new Set(rows.map(r => r.status).filter(Boolean)))];

  const q = search.trim().toLowerCase();
  const match = (r: T) =>
    (!q || r.name.toLowerCase().includes(q) || r.nomenkl.toLowerCase().includes(q))
    && (klass === ALL_KLASS || r.klass === klass)
    && (metal === ALL_METALS || r.metal === metal)
    && (loc === ALL_LOCS || r.location === loc)
    && (status === ALL_STATUSES || r.status === status);
  const active = !!q || klass !== ALL_KLASS || metal !== ALL_METALS || loc !== ALL_LOCS || status !== ALL_STATUSES;
  const reset = () => { setSearch(""); setKlass(ALL_KLASS); setMetal(ALL_METALS); setLoc(ALL_LOCS); setStatus(ALL_STATUSES); };

  const bar = (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 grid grid-cols-4 gap-3 items-end">
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-500 mb-1">Наименование / Номенкл. №</label>
        <SearchInput value={search} onChange={setSearch} placeholder="Поиск..." />
      </div>
      <Field label="Класс материала"><KlassSelect value={klass} onChange={setKlass} allLabel={ALL_KLASS} /></Field>
      <Field label="Код материала"><Select value={metal} options={metals} onChange={setMetal} optionLabel={v => (v === ALL_METALS ? v : codeLabel(v))} /></Field>
      <Field label="Место хранения"><Select value={loc} options={locations} onChange={setLoc} /></Field>
      <Field label="Статус"><Select value={status} options={statuses} onChange={setStatus} /></Field>
      <div className="col-start-4">
        <button onClick={reset} className="w-full h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Сбросить фильтры</button>
      </div>
    </div>
  );
  return { match, active, bar };
}

// ── Таблица позиций: те же столбцы, что у позиции ДМ ──────────────────────────

// opId / opNo / opDate / opStage — операция движения материала, в которой позиция получена или возвращена
type ProcRow = PodotchetPosition & { key: string; opId?: string; opNo?: string; opDate?: string; opStage?: string };

function PositionsTable({ rows, showOperation = false, onOpenOperation }: { rows: ProcRow[]; showOperation?: boolean; onOpenOperation?: (r: ProcRow) => void }) {
  const codeLabel = useMaterialCodeLabel();
  const { sorted, sort, toggleSort } = useSort(rows, {
    op: r => parseInt(r.opNo ?? "", 10) || 0,
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
  const th = "px-3 py-2";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200 whitespace-nowrap">
          {showOperation && <SortTh sortKey="op" sort={sort} onSort={toggleSort} className={th}>Операция</SortTh>}
          <SortTh sortKey="nomenkl" sort={sort} onSort={toggleSort} className={th}>Номенкл. №</SortTh>
          <SortTh sortKey="name" sort={sort} onSort={toggleSort} className={th}>Наименование</SortTh>
          <SortTh sortKey="qty" sort={sort} onSort={toggleSort} className={th}>Количество</SortTh>
          <SortTh sortKey="klass" sort={sort} onSort={toggleSort} className={th}>Класс</SortTh>
          <SortTh sortKey="metal" sort={sort} onSort={toggleSort} className={th}>Код материала</SortTh>
          <SortTh sortKey="proba" sort={sort} onSort={toggleSort} className={th}>Проба</SortTh>
          <SortTh sortKey="lig" sort={sort} onSort={toggleSort} className={th}>Лигат. вес г</SortTh>
          <SortTh sortKey="net" sort={sort} onSort={toggleSort} className={th}>Чистый вес г</SortTh>
          <SortTh sortKey="loc" sort={sort} onSort={toggleSort} className={th}>Место хранения</SortTh>
          <SortTh sortKey="status" sort={sort} onSort={toggleSort} className={th}>Статус</SortTh>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map(r => (
            <tr key={r.key} className="hover:bg-gray-50">
              {showOperation && (
                <td className="px-3 py-2 whitespace-nowrap">
                  <button onClick={() => onOpenOperation?.(r)} className="font-medium text-blue-600 hover:underline" title="Открыть операцию">№ {r.opNo}</button>
                  <div className="text-xs text-gray-400">от {r.opDate}</div>
                  {r.opStage && <div className="mt-0.5"><Badge label={r.opStage} group="operacii" /></div>}
                </td>
              )}
              <td className="px-3 py-2 text-gray-500">{r.nomenkl}</td>
              <td className="px-3 py-2 font-medium">{r.name}</td>
              <td className="px-3 py-2">{r.qty}</td>
              <td className="px-3 py-2"><KlassCode value={r.klass} /></td>
              <td className="px-3 py-2 text-blue-600 font-medium">{r.metal ? codeLabel(r.metal) : "—"}</td>
              <td className="px-3 py-2">{r.proba}</td>
              <td className="px-3 py-2">{r.ligWeight.toFixed(2)}</td>
              <td className="px-3 py-2">{r.netWeight.toFixed(2)}</td>
              <td className="px-3 py-2 text-gray-500">{r.location}</td>
              <td className="px-3 py-2"><Badge label={r.status} group="pozicii" /></td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={showOperation ? 11 : 10} className="px-3 py-4 text-center text-gray-400 text-xs">Позиции отсутствуют</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Блок вида операции: позиции, полученные / возвращённые подотчётником по этому виду ──

function VidBlock({ vid, operations, rows, onOpenOperation }: { vid: string; operations: number; rows: ProcRow[]; onOpenOperation: (r: ProcRow) => void }) {
  const Icon = vidIcon[vid] ?? Flame;
  const totalNet = rows.reduce((s, r) => s + r.netWeight, 0);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <Icon className="w-5 h-5 text-gray-500 shrink-0" />
        <div className="flex-1 min-w-0 text-sm font-semibold text-gray-900">{vid}</div>
        <div className="text-xs text-gray-500 shrink-0">
          Операций: {operations} · Позиций: {rows.length} · Чистый вес: {totalNet.toFixed(2)} г
        </div>
      </div>
      <PositionsTable rows={rows} showOperation onOpenOperation={onOpenOperation} />
    </div>
  );
}

// Подотчётное лицо в операции записано полным ФИО или как «Фамилия И.О.»
const shortFio = (full: string) => {
  const [last, ...rest] = full.trim().split(/\s+/);
  return [last, rest.map(n => `${n[0]}.`).join("")].filter(Boolean).join(" ");
};
const isPersonOp = (o: Operation, person: Podotchetnik) =>
  [o.responsible, o.poluchil].some(r => !!r && (r === person.name || r === shortFio(person.name)));

// Позиции считаются полученными после проведения выдачи, возвращёнными — после завершения операции
const isIssued = (o: Operation) => o.stage !== "Выдача: На редактировании";
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

  // Баланс: позиции в подотчёте; атрибуты позиции ДМ берутся из процессов, где она была выдана
  const allPositions = [...person.currentProcesses, ...person.completedProcesses].flatMap(p => p.positions);
  const balance: ProcRow[] = person.materials.map((m, i) => {
    const pos = allPositions.find(p => p.nomenkl === m.nomenkl);
    return pos
      ? { ...pos, key: `b-${i}` }
      : { key: `b-${i}`, name: m.name, nomenkl: m.nomenkl, klass: "", metal: "", qty: 1, proba: 0, ligWeight: m.weight, netWeight: m.weight, location: "—", status: "В подотчёте" };
  });
  const balanceF = usePositionFilters(balance);
  const balanceRows = balance.filter(balanceF.match);

  // Операции движения материала по подотчётнику: полученные (вкладка «Выдача») / возвращённые (вкладка «Возврат») позиции
  const personOps = operations.filter(o => isPersonOp(o, person) && (received ? isIssued(o) : isReturned(o)));
  const toRow = (o: Operation, p: OperPosition, i: number): ProcRow => {
    const dm = dmItems.find(d => d.nomenkl === p.nomenkl);
    // Текущий статус — со склада ДМ; иначе: полученная в открытой операции — в подотчёте, возвращённая — на складе
    const status: StatusDM = dm?.status ?? (received ? (isReturned(o) ? "Закрыта" : "В подотчёте") : "На складе");
    return {
      key: `${o.id}-${i}`, name: p.name, nomenkl: p.nomenkl, klass: p.klass, metal: p.metal ?? dm?.metal ?? "",
      qty: p.qty ?? 1, proba: p.proba, ligWeight: p.lig ?? p.ves, netWeight: p.net ?? p.ves, location: p.loc, status,
      opId: o.id, opNo: o.document, opDate: o.date, opStage: o.stage,
    };
  };
  const opRows = (ops: Operation[]) => ops.flatMap(o => (received ? opVydacha(o) : opVozvrat(o)).map((p, i) => toRow(o, p, i)));
  const rows = opRows(personOps);
  const opF = usePositionFilters(rows);
  // Блоки по видам операций в порядке справочника «Виды операций»
  const vids = [...spravValues("Виды операций"), ...personOps.map(o => o.vid)].filter((v, i, a) => a.indexOf(v) === i);
  const groups = vids
    .map(vid => {
      const ops = personOps.filter(o => o.vid === vid);
      return { vid, operations: ops.length, rows: opRows(ops).filter(opF.match) };
    })
    .filter(g => g.operations > 0 && g.rows.length > 0);
  const openOperation = (r: ProcRow) => {
    if (r.opId) routerNavigate(`${PAGE_PATHS["dvizhenie-mat"]}/view/${r.opId}?tab=${received ? "vydacha" : "vozvrat"}`);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Назад к реестру
        </button>
      </div>

      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-gray-500">Подотчётники / Карточка подотчётного лица</div>
        <span className="text-xs text-gray-400">Обновлено: {new Date().toLocaleDateString("ru-RU")}</span>
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

      {/* Balance */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-3">В балансе у подотчётника</h3>
        {balance.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Материалы в балансе отсутствуют</p>
        ) : (
          <>
            {balanceF.bar}
            <div className="text-xs text-gray-500 mb-2">Найдено: {balanceRows.length} из {balance.length}</div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <PositionsTable rows={balanceRows} />
            </div>
          </>
        )}
      </div>

      {/* Операции движения материала */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <Tabs tabs={["Всего получено", "Всего возвращено"]} active={tab} onChange={t => setTab(t as typeof tab)} />
        <div className="text-xs text-gray-500 mb-3">
          {received ? "Позиции, выданные подотчётнику" : "Позиции, возвращённые подотчётником"} в операциях движения материала ·
          операций: {personOps.length} · позиций: {rows.length} · чистый вес: {rows.reduce((s, r) => s + r.netWeight, 0).toFixed(2)} г
        </div>
        {rows.length > 0 && opF.bar}
        <div className="space-y-3">
          {groups.map(g => (
            <VidBlock key={g.vid} vid={g.vid} operations={g.operations} rows={g.rows} onOpenOperation={openOperation} />
          ))}
          {rows.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-4">{received ? "Полученных позиций нет" : "Возвращённых позиций нет"}</p>
          )}
          {rows.length > 0 && groups.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-4">Нет позиций по заданным фильтрам</p>
          )}
        </div>
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
    balance: p => (p.materials.length > 0 ? 1 : 0),
  });

  if (selected) {
    return <PodotchetnikCard person={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <PageHeader
        title="Подотчётники"
        subtitle="Реестр сотрудников, у которых находятся материалы на балансе"
        breadcrumb={["Подотчётники"]}
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
              <SortTh sortKey="balance" sort={sort} onSort={toggleSort}>В балансе</SortTh>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-blue-600">{p.tabelNo}</td>
                <td className="px-4 py-3">
                  {p.materials.length > 0
                    ? <Badge label="В работе" group="podotchet" />
                    : <span className="text-gray-400 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3"><EyeIcon onClick={() => setSelected(p)} /></td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">Подотчётники не найдены</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
