import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { Badge, PageHeader, Modal, useToast, Toast, SortTh, useSort, parseRuDate } from "../components/ui";
import { LogEntry, LogSnapshotItem } from "../data/mock";
import { Eye } from "lucide-react";

export function Logirovanie() {
  const { logs } = useApp();
  const [detailLog, setDetailLog] = useState<LogEntry | null>(null);
  const [filterType, setFilterType] = useState("Все типы");
  const [filterSection, setFilterSection] = useState("Все разделы");
  const [filterUser, setFilterUser] = useState("Все пользователи");
  const { toast, show, clear } = useToast();

  const filtered = logs.filter(l => {
    const matchType = filterType === "Все типы" || l.type === filterType;
    const matchSection = filterSection === "Все разделов" || filterSection === "Все разделы" || l.section === filterSection;
    const matchUser = filterUser === "Все пользователи" || l.user.includes(filterUser.split(" ")[0]);
    return matchType && matchSection && matchUser;
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    datetime: l => parseRuDate(l.datetime),
    user: l => l.user,
    section: l => l.section,
    type: l => l.type,
    description: l => l.description,
  });

  const sections = ["Все разделы", "Склады", "Складские операции", "Движение материала", "Шихтовые карты", "Администрирование"];
  const users = ["Все пользователи", "Ковалева Е.", "Нурланов А.Б.", "Петров С.В.", "Иванова М.С.", "Ким А.Ю."];

  return (
    <div>
      <PageHeader
        title="Логирование"
        subtitle="Журнал событий системы"
        breadcrumb={["Логирование"]}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-end gap-3 flex-wrap">
        <div className="min-w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Тип события</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {["Все типы", "Создание", "Изменение", "Удаление", "Закрытие"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="min-w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Раздел</label>
          <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {sections.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="min-w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Пользователь</label>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {users.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <button onClick={() => { setFilterType("Все типы"); setFilterSection("Все разделы"); setFilterUser("Все пользователи"); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Сбросить фильтры
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortTh sortKey="datetime" sort={sort} onSort={toggleSort}>Дата и время</SortTh>
              <SortTh sortKey="user" sort={sort} onSort={toggleSort}>Пользователь</SortTh>
              <SortTh sortKey="section" sort={sort} onSort={toggleSort}>Раздел</SortTh>
              <SortTh sortKey="type" sort={sort} onSort={toggleSort}>Статус действия</SortTh>
              <SortTh sortKey="description" sort={sort} onSort={toggleSort}>Описание</SortTh>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(log => {
              const hasDetails = (log.before && log.before.length > 0) || (log.after && log.after.length > 0);
              return (
                <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{log.datetime}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{log.user}</td>
                  <td className="px-4 py-3 text-gray-600">{log.section}</td>
                  <td className="px-4 py-3"><Badge label={log.type} /></td>
                  <td className="px-4 py-3 text-gray-700">{log.description}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => hasDetails ? setDetailLog(log) : show(`Просмотр события: ${log.description}`)}
                      className="text-blue-500 hover:text-blue-700 transition-colors p-0.5"
                      title="Просмотр"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {detailLog && <LogDetailModal log={detailLog} onClose={() => setDetailLog(null)} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

// ── Log detail modal (Было / Стало) ─────────────────────────────────────────

function LogDetailModal({ log, onClose }: { log: LogEntry; onClose: () => void }) {
  const before = log.before ?? [];
  const after = log.after ?? [];

  return (
    <Modal title={log.description} onClose={onClose} extraWide>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Было</div>
          <div className="space-y-3">
            {before.length === 0 && (
              <div className="text-sm text-gray-400 italic bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">Позиция отсутствовала</div>
            )}
            {before.map((item, i) => <SnapshotCard key={i} item={item} counterpart={after.length === 1 ? after[0] : undefined} />)}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Стало</div>
          <div className="space-y-3">
            {after.length === 0 && (
              <div className="text-sm text-gray-400 italic bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">Позиция отсутствует</div>
            )}
            {after.map((item, i) => <SnapshotCard key={i} item={item} counterpart={before.length === 1 ? before[0] : undefined} />)}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SnapshotCard({ item, counterpart }: { item: LogSnapshotItem; counterpart?: LogSnapshotItem }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="font-medium text-gray-900 text-sm">{item.title}</span>
        <Badge label={item.status} />
      </div>
      <div className="space-y-1">
        {item.attrs.map(a => {
          const other = counterpart?.attrs.find(x => x.label === a.label);
          const changed = counterpart !== undefined && other !== undefined && other.value !== a.value;
          return (
            <div key={a.label} className={`text-xs flex items-center justify-between gap-2 py-1 px-1.5 rounded ${changed ? "bg-amber-100" : ""}`}>
              <span className="text-gray-500">{a.label}</span>
              <span className={`font-medium text-right ${changed ? "text-amber-800" : "text-gray-800"}`}>{a.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
