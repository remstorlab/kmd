import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { PageHeader, Btn, Modal, Field, Input, Select, useToast, Toast, SortTh, useSort } from "../components/ui";
import { Metal } from "../data/mock";
import { ClipboardCheck, Coins, Gem, FileText, LucideIcon } from "lucide-react";

const METAL_CODE: Record<Metal, string> = { Au: "1", Ag: "2", Pt: "3", Pd: "4" };

// ── Инвентаризационная опись ДМ ────────────────────────────────────────────────

function InventarizationOpisModal({ onClose }: { onClose: () => void }) {
  const { dmItems } = useApp();
  const { toast, show, clear } = useToast();
  const [onDate, setOnDate] = useState(() => new Date().toLocaleDateString("ru-RU"));
  const [sklad, setSklad] = useState("Склад ДМ №1");
  const [generated, setGenerated] = useState(false);

  const rows = dmItems.map(it => ({
    kodDm: METAL_CODE[it.metal] || "-",
    kodLig: String(it.proba),
    name: it.name,
    nomenkl: it.nomenkl,
    ligWeight: it.ligWeight,
    au: it.metal === "Au" ? it.netWeight : 0,
    ag: it.metal === "Ag" ? it.netWeight : 0,
    pd: it.metal === "Pd" ? it.netWeight : 0,
    rh: 0,
    pt: it.metal === "Pt" ? it.netWeight : 0,
  }));

  const totals = rows.reduce((acc, r) => ({
    ligWeight: acc.ligWeight + r.ligWeight,
    au: acc.au + r.au,
    ag: acc.ag + r.ag,
    pd: acc.pd + r.pd,
    rh: acc.rh + r.rh,
    pt: acc.pt + r.pt,
  }), { ligWeight: 0, au: 0, ag: 0, pd: 0, rh: 0, pt: 0 });

  const SignRow = () => (
    <div className="grid grid-cols-3 gap-8 text-xs text-center mb-2">
      <div><div className="border-b border-black h-6"></div><span>(подпись)</span></div>
      <div><div className="border-b border-black h-6"></div><span>(дата)</span></div>
      <div><div className="border-b border-black h-6"></div><span>(Ф.И.О.)</span></div>
    </div>
  );

  return (
    <Modal
      title="Инвентаризационная опись ДМ"
      onClose={onClose}
      extraWide
      footer={
        <>
          <Btn variant="secondary" onClick={() => show("Отчёт экспортирован")}>Экспорт</Btn>
          <Btn variant="secondary" onClick={onClose}>Закрыть</Btn>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-4 mb-5 items-end">
        <Field label="На дату"><Input value={onDate} onChange={setOnDate} placeholder="ДД.ММ.ГГГГ" /></Field>
        <Field label="Склад"><Select value={sklad} options={["Склад ДМ №1", "Склад ДМ №2"]} onChange={setSklad} /></Field>
        <Btn onClick={() => setGenerated(true)}>Сформировать</Btn>
      </div>

      {!generated ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-200">
          Задайте параметры и нажмите «Сформировать» для формирования описи
        </div>
      ) : (
        <div className="border border-gray-300 bg-white p-6 text-black text-xs">
          <div className="text-center leading-snug mb-4">
            <p className="font-bold uppercase">Республиканское государственное предприятие</p>
            <p className="font-bold uppercase">Казахстанский монетный двор</p>
            <p className="font-bold uppercase">Национального банка Республики Казахстан</p>
          </div>

          <h2 className="text-center font-bold text-sm tracking-wide mb-4 uppercase">Инвентаризационная опись</h2>

          <div className="text-center mb-4 leading-relaxed">
            <p>Драгоценных металлов и изделий из них,</p>
            <p>находящихся в <span className="border-b border-black px-6">{sklad}</span></p>
            <p>по состоянию на <span className="border-b border-black px-6">{onDate}</span></p>
          </div>

          <h3 className="text-center font-bold tracking-widest mb-3">Р А С П И С К А</h3>

          <p className="mb-3 text-justify">
            Я, <span className="border-b border-black px-10">&nbsp;</span> даю настоящую расписку в том, что к началу проведения
            инвентаризации все расходные и приходные документы на драгоценные металлы и изделия из них сданы в бухгалтерию и все
            драгоценные металлы и изделия из них, поступившие на мою ответственность, оприходованы, а выбывшие списаны в расход.
          </p>
          <div className="space-y-1.5 mb-4">
            <p>Материально-ответственное лицо: <span className="border-b border-black px-16">&nbsp;</span></p>
            <p>Комиссия в составе:</p>
            <p>Председателя <span className="border-b border-black px-16">&nbsp;</span></p>
            <p>Членов комиссии <span className="border-b border-black px-16">&nbsp;</span></p>
            <p>Действующая на основании приказа № <span className="border-b border-black px-16">&nbsp;</span></p>
            <p>Произвела снятие остатков у материально ответственного лица <span className="border-b border-black px-8">&nbsp;</span></p>
            <p>При проверке фактического наличия оказалось:</p>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse border border-black text-center" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th rowSpan={3} className="border border-black px-1 py-1 align-middle">Код ДМ</th>
                  <th rowSpan={3} className="border border-black px-1 py-1 align-middle">Код Лиг.</th>
                  <th rowSpan={3} className="border border-black px-1 py-1 align-middle">Наименование изделия, лигатуры, полуфабриката и т.д.</th>
                  <th rowSpan={3} className="border border-black px-1 py-1 align-middle">Номенкл. номер</th>
                  <th colSpan={6} className="border border-black px-1 py-1">Числится на складе</th>
                </tr>
                <tr>
                  <th rowSpan={2} className="border border-black px-1 py-1 align-middle">Вес лигатурный (г)</th>
                  <th colSpan={5} className="border border-black px-1 py-1">В составе лигатуры чистых драгоценных металлов (г)</th>
                </tr>
                <tr>
                  <th className="border border-black px-1 py-1">Золота</th>
                  <th className="border border-black px-1 py-1">Серебра</th>
                  <th className="border border-black px-1 py-1">Палладия</th>
                  <th className="border border-black px-1 py-1">Родия</th>
                  <th className="border border-black px-1 py-1">Платины</th>
                </tr>
                <tr>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <th key={i} className="border border-black px-1 py-0.5 font-normal">{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="border border-black px-1 py-1">{r.kodDm}</td>
                    <td className="border border-black px-1 py-1">{r.kodLig}</td>
                    <td className="border border-black px-2 py-1 text-left">{r.name}</td>
                    <td className="border border-black px-1 py-1">{r.nomenkl}</td>
                    <td className="border border-black px-1 py-1 text-right">{r.ligWeight.toFixed(2)}</td>
                    <td className="border border-black px-1 py-1 text-right">{r.au ? r.au.toFixed(2) : "-"}</td>
                    <td className="border border-black px-1 py-1 text-right">{r.ag ? r.ag.toFixed(2) : "-"}</td>
                    <td className="border border-black px-1 py-1 text-right">{r.pd ? r.pd.toFixed(2) : "-"}</td>
                    <td className="border border-black px-1 py-1 text-right">{r.rh ? r.rh.toFixed(2) : "-"}</td>
                    <td className="border border-black px-1 py-1 text-right">{r.pt ? r.pt.toFixed(2) : "-"}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td colSpan={4} className="border border-black px-2 py-1 text-right">ИТОГО:</td>
                  <td className="border border-black px-1 py-1 text-right">{totals.ligWeight.toFixed(2)}</td>
                  <td className="border border-black px-1 py-1 text-right">{totals.au.toFixed(2)}</td>
                  <td className="border border-black px-1 py-1 text-right">{totals.ag.toFixed(2)}</td>
                  <td className="border border-black px-1 py-1 text-right">{totals.pd.toFixed(2)}</td>
                  <td className="border border-black px-1 py-1 text-right">{totals.rh.toFixed(2)}</td>
                  <td className="border border-black px-1 py-1 text-right">{totals.pt.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mb-3">
            <p className="mb-1">Председатель комиссии</p>
            <SignRow />
          </div>
          <div>
            <p className="mb-1">Члены комиссии:</p>
            <SignRow />
            <SignRow />
          </div>
        </div>
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}

const reports: { title: string; desc: string; icon: LucideIcon; data: { nom: string; name: string; kol: string; ves: string; status: string }[] }[] = [
  {
    title: "Акт по итогам инвентаризации НЗП",
    desc: "Унифицированная форма ИНВ-3 — инвентаризационная опись незавершённого производства",
    icon: ClipboardCheck,
    data: [
      { nom: "DM-001", name: "Слиток золота ЗлА-1", kol: "1 ед.", ves: "500.25 г", status: "В норме" },
      { nom: "DM-003", name: "Стружка золотая", kol: "1 ед.", ves: "45.80 г", status: "В норме" },
      { nom: "DM-005", name: "Раствор AgNO3", kol: "1 ед.", ves: "250.00 г", status: "Расхождение" },
    ],
  },
  {
    title: "Инвентаризационная опись ДМ",
    desc: "Опись фактических остатков драгоценных металлов на всех складах",
    icon: Coins,
    data: [
      { nom: "DM-001", name: "Слиток золота ЗлА-1", kol: "500.25 г", ves: "Сейф №1 А", status: "Соответствует" },
      { nom: "DM-002", name: "Слиток серебра СрА-2", kol: "1000.50 г", ves: "Сейф №1 Б", status: "Соответствует" },
      { nom: "DM-006", name: "Слиток платины", kol: "300.00 г", ves: "Сейф №1 В", status: "Соответствует" },
    ],
  },
  {
    title: "Опись хранения драгоценных камней",
    desc: "Инвентаризация драгоценных камней в производстве и на хранении",
    icon: Gem,
    data: [
      { nom: "DK-001", name: "Бриллиант 0.5ct", kol: "8 шт", ves: "Сейф №2", status: "Соответствует" },
      { nom: "DK-002", name: "Изумруд 1ct", kol: "3 шт", ves: "Сейф №2", status: "Соответствует" },
    ],
  },
  {
    title: "Накладные",
    desc: "Сводный журнал приходных и расходных документов за период",
    icon: FileText,
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
  const [showInvOpis, setShowInvOpis] = useState(false);

  const { sorted: sortedReportRows, sort: reportSort, toggleSort: toggleReportSort } = useSort(viewReport?.data ?? [], {
    nom: r => r.nom,
    name: r => r.name,
    kol: r => r.kol,
    ves: r => r.ves,
    status: r => r.status,
  });

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
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <r.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{r.title}</h3>
                <p className="text-sm text-gray-500">{r.desc}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Btn onClick={() => r.title === "Инвентаризационная опись ДМ" ? setShowInvOpis(true) : setViewReport(r)}>Просмотр</Btn>
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
              <SortTh sortKey="nom" sort={reportSort} onSort={toggleReportSort} className="px-3 py-2">Номер/Код</SortTh>
              <SortTh sortKey="name" sort={reportSort} onSort={toggleReportSort} className="px-3 py-2">Наименование</SortTh>
              <SortTh sortKey="kol" sort={reportSort} onSort={toggleReportSort} className="px-3 py-2">Кол-во / Дата</SortTh>
              <SortTh sortKey="ves" sort={reportSort} onSort={toggleReportSort} className="px-3 py-2">Место / Статус</SortTh>
              <SortTh sortKey="status" sort={reportSort} onSort={toggleReportSort} className="px-3 py-2">Результат</SortTh>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sortedReportRows.map((row, i) => (
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
      {showInvOpis && <InventarizationOpisModal onClose={() => setShowInvOpis(false)} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
