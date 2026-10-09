import React, { useState } from "react";
import { useLocation } from "react-router";
import { useApp } from "../store/AppContext";
import { Badge, PageHeader, EyeIcon, Tabs, SortTh, useSort, KlassCode, useMaterialCodeLabel, SearchInput, Field, Select, KlassSelect } from "../components/ui";
import { Podotchetnik, PodotchetProcess, PodotchetPosition, spravValues } from "../data/mock";
import { ArrowLeft, Flame, FlaskConical, Microscope, Zap, Factory, LucideIcon } from "lucide-react";
import { matchPage, useTabParam } from "../router";

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

type ProcRow = PodotchetPosition & { key: string; procName?: string; procDate?: string; procDone?: string };

function PositionsTable({ rows, showProcess = false, showCompleted = false }: { rows: ProcRow[]; showProcess?: boolean; showCompleted?: boolean }) {
  const codeLabel = useMaterialCodeLabel();
  const { sorted, sort, toggleSort } = useSort(rows, {
    proc: r => r.procName ?? "",
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
          {showProcess && <SortTh sortKey="proc" sort={sort} onSort={toggleSort} className={th}>Операция</SortTh>}
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
              {showProcess && (
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-900">{r.procName}</div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    Начато: {r.procDate}
                    {showCompleted && r.procDone && <span className="text-green-600 font-medium"> · Завершено: {r.procDone}</span>}
                  </div>
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
            <tr><td colSpan={showProcess ? 11 : 10} className="px-3 py-4 text-center text-gray-400 text-xs">Позиции отсутствуют</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Блок вида операции: все позиции, выданные подотчётнику по этому виду ────────

function VidBlock({ vid, processes, rows, showCompleted }: { vid: string; processes: number; rows: ProcRow[]; showCompleted: boolean }) {
  const Icon = vidIcon[vid] ?? Flame;
  const totalNet = rows.reduce((s, r) => s + r.netWeight, 0);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <Icon className="w-5 h-5 text-gray-500 shrink-0" />
        <div className="flex-1 min-w-0 text-sm font-semibold text-gray-900">{vid}</div>
        <div className="text-xs text-gray-500 shrink-0">
          Операций: {processes} · Позиций: {rows.length} · Чистый вес: {totalNet.toFixed(2)} г
        </div>
      </div>
      <PositionsTable rows={rows} showProcess showCompleted={showCompleted} />
    </div>
  );
}

// ── Карточка подотчётного лица ────────────────────────────────────────────────

const procRows = (processes: PodotchetProcess[]): ProcRow[] =>
  processes.flatMap(p => p.positions.map((pos, i) => ({
    ...pos, key: `${p.id}-${i}`, procName: p.name, procDate: p.date, procDone: p.completedDate,
  })));

function PodotchetnikCard({ person, onBack }: { person: Podotchetnik; onBack: () => void }) {
  const [tab, setTab] = useTabParam<"Текущие процессы" | "Завершённые процессы">(
    { "Текущие процессы": "tekushie", "Завершённые процессы": "zavershennye" },
    "Текущие процессы",
  );
  const completed = tab === "Завершённые процессы";
  const processes = completed ? person.completedProcesses : person.currentProcesses;

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

  // Процессы: группы по видам операций из справочника «Виды операций»
  const rows = procRows(processes);
  const procF = usePositionFilters(rows);
  const vids = [...spravValues("Виды операций"), ...processes.map(p => p.vid)].filter((v, i, a) => a.indexOf(v) === i);
  const groups = vids
    .map(vid => {
      const procs = processes.filter(p => p.vid === vid);
      return { vid, processes: procs.length, rows: procRows(procs).filter(procF.match) };
    })
    .filter(g => g.processes > 0 && (g.rows.length > 0 || !procF.active));

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

      {/* Processes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <Tabs tabs={["Текущие процессы", "Завершённые процессы"]} active={tab} onChange={t => setTab(t as typeof tab)} />
        {rows.length > 0 && procF.bar}
        <div className="space-y-3">
          {groups.map(g => (
            <VidBlock key={g.vid} vid={g.vid} processes={g.processes} rows={g.rows} showCompleted={completed} />
          ))}
          {processes.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-4">Процессы не найдены</p>
          )}
          {processes.length > 0 && groups.length === 0 && (
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
