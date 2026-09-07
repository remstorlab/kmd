import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { Badge, Btn, Modal, EyeIcon, PageHeader, useToast, Toast, Tabs } from "../components/ui";
import { Podotchetnik } from "../data/mock";

const currentProcesses = [
  { icon: "🔥", name: "Плавка золотых слитков", date: "19.08.2026, 09:00", vid: "Плавка" },
  { icon: "🧪", name: "Анализ пробы Au-999", date: "18.08.2026, 14:30", vid: "Анализ в ЛКИ" },
];
const completedProcesses = [
  { icon: "🔬", name: "Отбор пробы Ag-925", date: "15.08.2026, 11:00", vid: "Отбор пробы" },
  { icon: "✅", name: "Гальванопокрытие кольца", date: "10.08.2026, 09:45", vid: "Гальванопокрытие" },
];

function PodotchetnikCard({ person, onBack }: { person: Podotchetnik; onBack: () => void }) {
  const [tab, setTab] = useState("Текущие процессы");
  const { toast, show, clear } = useToast();

  const processes = tab === "Текущие процессы" ? currentProcesses : completedProcesses;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
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
          <p className="text-slate-400 text-sm">{person.position} · {person.department}</p>
        </div>
        <div className="text-right">
          <div className="text-slate-400 text-xs mb-1">Табельный номер</div>
          <div className="text-white font-semibold text-lg">{person.tabelNo}</div>
        </div>
      </div>

      {/* Balance */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-3">В балансе у подотчётника</h3>
        {person.materials.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Материалы в балансе отсутствуют</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 text-xs border-b border-gray-200">
              <th className="pb-2 text-left">Материал</th>
              <th className="pb-2 text-left">Номенкл.№</th>
              <th className="pb-2 text-right">Вес в подотчёте</th>
              <th className="pb-2 text-left">Статус</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {person.materials.map((m, i) => (
                <tr key={i}>
                  <td className="py-2 font-medium">{m.name}</td>
                  <td className="py-2 text-gray-500">{m.nomenkl}</td>
                  <td className="py-2 text-right font-medium">{m.weight} г</td>
                  <td className="py-2"><Badge label="В работе" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Processes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <Tabs tabs={["Текущие процессы", "Завершённые процессы"]} active={tab} onChange={setTab} />
        <div className="space-y-2">
          {processes.map((p, i) => (
            <button
              key={i}
              onClick={() => show(`Открытие операции: ${p.name}`)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
            >
              <span className="text-xl">{p.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{p.name}</div>
                <div className="text-xs text-gray-400">{p.vid}</div>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{p.date}</span>
              {tab === "Завершённые процессы" && <Badge label="Закрыто" />}
            </button>
          ))}
          {processes.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-4">Процессы не найдены</p>
          )}
        </div>
      </div>
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

export function Podotchetniki() {
  const { podotchetniki } = useApp();
  const [selected, setSelected] = useState<Podotchetnik | null>(null);

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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">ФИО</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Табельный №</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Подразделение</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">В балансе</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {podotchetniki.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-blue-600">{p.tabelNo}</td>
                <td className="px-4 py-3 text-gray-600">{p.department}</td>
                <td className="px-4 py-3">
                  {p.materials.length > 0
                    ? <Badge label="В работе" />
                    : <span className="text-gray-400 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3"><EyeIcon onClick={() => setSelected(p)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
