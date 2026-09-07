import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { Badge, PageHeader, useToast, Toast } from "../components/ui";
import { LogEntry } from "../data/mock";

export function Logirovanie() {
  const { logs } = useApp();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

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
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Дата и время</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Пользователь</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Раздел</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Тип события</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Описание</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <React.Fragment key={log.id}>
                <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{log.datetime}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{log.user}</td>
                  <td className="px-4 py-3 text-gray-600">{log.section}</td>
                  <td className="px-4 py-3"><Badge label={log.type} /></td>
                  <td className="px-4 py-3 text-gray-700">{log.description}</td>
                  <td className="px-4 py-3">
                    {log.type === "Изменение" ? (
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Показать сравнение"
                      >
                        <svg className={`w-4 h-4 transition-transform ${expanded.has(log.id) ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    ) : (
                      <button onClick={() => show(`Просмотр события: ${log.description}`)} className="text-blue-500 hover:text-blue-700 transition-colors p-0.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
                {expanded.has(log.id) && log.before && log.after && (
                  <tr className="border-t border-gray-100 bg-slate-50">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Сравнение изменений</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="text-xs font-semibold text-red-600 mb-2">Было:</div>
                          <code className="text-xs text-red-800 font-mono">{log.before}</code>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-semibold text-green-600 mb-2">Стало:</div>
                          <code className="text-xs text-green-800 font-mono">{log.after}</code>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
