import React, { useState } from "react";
import { PageHeader, Btn, Modal, useToast, Toast } from "../components/ui";

const reports = [
  {
    title: "Акт по итогам инвентаризации НЗП",
    desc: "Унифицированная форма ИНВ-3 — инвентаризационная опись незавершённого производства",
    icon: "📋",
    data: [
      { nom: "DM-001", name: "Слиток золота ЗлА-1", kol: "1 ед.", ves: "500.25 г", status: "В норме" },
      { nom: "DM-003", name: "Стружка золотая", kol: "1 ед.", ves: "45.80 г", status: "В норме" },
      { nom: "DM-005", name: "Раствор AgNO3", kol: "1 ед.", ves: "250.00 г", status: "Расхождение" },
    ],
  },
  {
    title: "Инвентаризационная опись ДМ",
    desc: "Опись фактических остатков драгоценных металлов на всех складах",
    icon: "🔶",
    data: [
      { nom: "DM-001", name: "Слиток золота ЗлА-1", kol: "500.25 г", ves: "Сейф №1 А", status: "Соответствует" },
      { nom: "DM-002", name: "Слиток серебра СрА-2", kol: "1000.50 г", ves: "Сейф №1 Б", status: "Соответствует" },
      { nom: "DM-006", name: "Слиток платины", kol: "300.00 г", ves: "Сейф №1 В", status: "Соответствует" },
    ],
  },
  {
    title: "Опись хранения драгоценных камней",
    desc: "Инвентаризация драгоценных камней в производстве и на хранении",
    icon: "💎",
    data: [
      { nom: "DK-001", name: "Бриллиант 0.5ct", kol: "8 шт", ves: "Сейф №2", status: "Соответствует" },
      { nom: "DK-002", name: "Изумруд 1ct", kol: "3 шт", ves: "Сейф №2", status: "Соответствует" },
    ],
  },
  {
    title: "Накладные",
    desc: "Сводный журнал приходных и расходных документов за период",
    icon: "📄",
    data: [
      { nom: "ПО-0342", name: "Приходный ордер", kol: "19.08.2026", ves: "Выполнено", status: "Завершён" },
      { nom: "НО-0205", name: "Накладная на отгрузку ГП", kol: "19.08.2026", ves: "В работе", status: "Открыт" },
      { nom: "ПО-0341", name: "Приходный ордер", kol: "17.08.2026", ves: "В работе", status: "Открыт" },
    ],
  },
];

export function Otchetnost() {
  const { toast, show, clear } = useToast();
  const [viewReport, setViewReport] = useState<typeof reports[0] | null>(null);

  return (
    <div>
      <PageHeader
        title="Отчётность"
        subtitle="Регламентные отчётные формы и описи"
        breadcrumb={["Отчётность"]}
      />

      <div className="grid grid-cols-2 gap-6">
        {reports.map((r, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl">{r.icon}</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{r.title}</h3>
                <p className="text-sm text-gray-500">{r.desc}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Btn onClick={() => setViewReport(r)}>Просмотр</Btn>
              <Btn variant="secondary" onClick={() => show(`Отчёт «${r.title}» экспортирован`)}>Экспорт</Btn>
            </div>
          </div>
        ))}
      </div>

      {viewReport && (
        <Modal
          title={viewReport.title}
          onClose={() => setViewReport(null)}
          wide
          footer={
            <>
              <Btn variant="secondary" onClick={() => show(`Отчёт экспортирован`)}>Экспорт</Btn>
              <Btn variant="secondary" onClick={() => setViewReport(null)}>Закрыть</Btn>
            </>
          }
        >
          <p className="text-sm text-gray-500 mb-4">{viewReport.desc}</p>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <th className="px-3 py-2 text-left">Номер/Код</th>
              <th className="px-3 py-2 text-left">Наименование</th>
              <th className="px-3 py-2 text-left">Кол-во / Дата</th>
              <th className="px-3 py-2 text-left">Место / Статус</th>
              <th className="px-3 py-2 text-left">Результат</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {viewReport.data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-blue-600 font-medium">{row.nom}</td>
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 text-gray-600">{row.kol}</td>
                  <td className="px-3 py-2 text-gray-600">{row.ves}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      row.status === "Соответствует" || row.status === "Завершён" || row.status === "В норме"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : row.status === "Открыт"
                          ? "bg-blue-100 text-blue-700 border-blue-200"
                          : "bg-yellow-100 text-yellow-700 border-yellow-200"
                    }`}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
