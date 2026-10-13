import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { Btn, Modal, Field, Input, Select, KlassSelect, MaterialCodeSelect, useMaterialCodeLabel, useToast, Toast } from "./ui";
import { ChemComposition, baseMetal, isGPKlass, isStoneKlass } from "../data/mock";
import { useScreen } from "../router";

// ── Опись хранения драгоценных материалов (металлы и камни) ───────────────────
// Форма по шаблону «Опись хранения драгоценных металлов»: по сейфам и полкам,
// масса металлов в чистоте — по справочнику «Химический состав» (признак «Отображать в ДМ»),
// для драгоценных камней — количество и масса в каратах.

const ALL = "Все";
const ALL_KLASS = "Все классы";
const ALL_CODES = "Все коды";
const TYPE_ALL = "Металлы и камни";
const TYPE_METALS = "Драгоценные металлы";
const TYPE_STONES = "Драгоценные камни";
const ST_STORAGE = "На хранении (на складе и в резерве)";
const ALL_STATUSES = "Все статусы";
const NO_PLACE = "Без места хранения";

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const CARAT_G = 0.2;

// «Сейф №1, Полка 2» / «Сейф 1/Полка 2» → номера сейфа и полки
const parsePlace = (loc: string) => ({
  seyf: /Сейф\s*№?\s*([\wА-Яа-я-]+)/i.exec(loc)?.[1] ?? "",
  polka: /Полка\s*№?\s*([\wА-Яа-я-]+)/i.exec(loc)?.[1] ?? "",
});
const placeLabel = (seyf: string, polka: string) =>
  seyf ? `Сейф № ${seyf}${polka ? `, полка № ${polka}` : ""}` : NO_PLACE;

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nowHour = () => String(new Date().getHours()).padStart(2, "0");
const dateCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const num = (v: string | undefined) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (v: number, d = 2) => (v ? v.toFixed(d) : "-");
// «Золото» → «золота», «Платина» → «платины», «Палладий» → «палладия» (подзаголовки столбцов массы металлов)
const genitive = (name: string) => {
  const w = name.toLowerCase();
  if (w.endsWith("ий")) return w.slice(0, -2) + "ия";
  if (w.endsWith("о")) return w.slice(0, -1) + "а";
  if (w.endsWith("а")) return w.slice(0, -1) + "ы";
  if (w.endsWith("ь")) return w.slice(0, -1) + "и";
  return w;
};

interface OpisRow {
  name: string;
  nomenkl: string;
  klass: string;
  code: string;
  proba: number;
  qty: number;
  unit: string;
  ligWeight: number;
  netWeight: number;
  chem?: ChemComposition;
  status: string;
  seyf: string;
  polka: string;
  stone: boolean;
}

export default function OpisHraneniyaModal({ onClose }: { onClose: () => void }) {
  const { dmItems, gpItems, materialCodes, chemElements } = useApp();
  const codeLabel = useMaterialCodeLabel();
  const { toast, show, clear } = useToast();
  // Сформированная опись — …/opis-hraneniya/sformirovana
  const screen = useScreen();
  const generated = screen.has("sformirovana");
  const setGenerated = (on: boolean) => screen.toggle("sformirovana", on);

  // Все позиции учёта: склад ДМ и склад ГП
  const all: OpisRow[] = [
    ...dmItems.map(i => ({
      name: i.name, nomenkl: i.nomenkl, klass: i.klass, code: i.metal, proba: i.proba, qty: i.qty, unit: "шт",
      ligWeight: i.ligWeight, netWeight: i.netWeight, chem: i.chem, status: i.status, ...parsePlace(i.location), stone: isStoneKlass(i.klass),
    })),
    ...gpItems.map(i => ({
      name: i.name, nomenkl: i.nomenkl, klass: i.klass, code: i.code, proba: i.proba ?? 0, qty: i.qty, unit: i.unit,
      ligWeight: i.ligWeight ?? 0, netWeight: i.netWeight ?? 0, chem: undefined, status: i.status, ...parsePlace(i.location), stone: isStoneKlass(i.klass),
    })),
  ];

  // ── Параметры формирования ──
  const [onDate, setOnDate] = useState(todayIso);
  const [onHour, setOnHour] = useState(nowHour);
  const [seyf, setSeyf] = useState(ALL);
  const [polka, setPolka] = useState(ALL);
  const [type, setType] = useState(TYPE_ALL);
  const [klass, setKlass] = useState(ALL_KLASS);
  const [code, setCode] = useState(ALL_CODES);
  const [status, setStatus] = useState(ST_STORAGE);
  const [withGp, setWithGp] = useState(true);
  const [search, setSearch] = useState("");

  const seyfs = [ALL, ...Array.from(new Set(all.map(r => r.seyf).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru", { numeric: true }))];
  const polkas = [ALL, ...Array.from(new Set(all.filter(r => seyf === ALL || r.seyf === seyf).map(r => r.polka).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru", { numeric: true }))];
  const statuses = [ST_STORAGE, ALL_STATUSES, ...Array.from(new Set(all.map(r => r.status)))];

  const reset = () => {
    setOnDate(todayIso()); setOnHour(nowHour()); setSeyf(ALL); setPolka(ALL); setType(TYPE_ALL);
    setKlass(ALL_KLASS); setCode(ALL_CODES); setStatus(ST_STORAGE); setWithGp(true); setSearch("");
  };

  const q = search.trim().toLowerCase();
  const rows = all.filter(r =>
    (seyf === ALL || r.seyf === seyf)
    && (polka === ALL || r.polka === polka)
    && (type === TYPE_ALL || (type === TYPE_STONES ? r.stone : !r.stone))
    && (klass === ALL_KLASS || r.klass === klass)
    && (code === ALL_CODES || r.code === code)
    && (status === ALL_STATUSES || (status === ST_STORAGE ? r.status === "На складе" || r.status === "Резерв" : r.status === status))
    && (withGp || !isGPKlass(r.klass))
    && (!q || r.name.toLowerCase().includes(q) || r.nomenkl.toLowerCase().includes(q)),
  );

  // Столбцы «Масса металлов в чистоте» — элементы справочника с признаком «Отображать в ДМ»
  const metals = chemElements.filter(e => e.showDm);
  const metalMass = (r: OpisRow, id: string) => {
    if (r.stone) return 0;
    if (r.chem && Object.keys(r.chem).length > 0) return num(r.chem[id]);
    // Нет химсостава — чистый вес относится к основному металлу кода материала
    return baseMetal(r.code, materialCodes).toLowerCase() === id ? r.netWeight : 0;
  };
  const showStones = type !== TYPE_METALS;
  const showMetals = type !== TYPE_STONES;

  // Группы по сейфам и полкам
  const groups = Array.from(new Set(rows.map(r => `${r.seyf}|${r.polka}`)))
    .map(key => {
      const [s, p] = key.split("|");
      return { key, label: placeLabel(s, p), rows: rows.filter(r => `${r.seyf}|${r.polka}` === key) };
    })
    .sort((a, b) => a.key.localeCompare(b.key, "ru", { numeric: true }));

  const sum = (list: OpisRow[]) => ({
    qty: list.reduce((s, r) => s + r.qty, 0),
    lig: list.filter(r => !r.stone).reduce((s, r) => s + r.ligWeight, 0),
    stoneQty: list.filter(r => r.stone).reduce((s, r) => s + r.qty, 0),
    carat: list.filter(r => r.stone).reduce((s, r) => s + r.ligWeight / CARAT_G, 0),
    metals: Object.fromEntries(metals.map(m => [m.id, list.reduce((s, r) => s + metalMass(r, m.id), 0)])),
  });

  const [y, mo, d] = onDate.split("-");
  const dateText = onDate ? `«${d}» ${MONTHS[Number(mo) - 1]} ${y} г.` : "«____» ____________ 20___ г.";
  const headSeyf = seyf === ALL ? "все" : seyf;
  const headPolka = polka === ALL ? "все" : polka;

  // Нумерация столбцов шаблона
  const cols = [
    "№ п/п", "Код ДМ", "Код Лиг.", "Наименование изделия, лигатуры, полуфабриката, камней и т.д.", "Номенкл. номер", "Кол-во",
    ...(showMetals ? ["Лигатурный вес (г)"] : []),
    ...(showStones ? ["Камни, шт", "Масса камней (кар)"] : []),
    ...(showMetals ? metals.map(m => m.name) : []),
  ];
  const fixedCols = cols.length - (showMetals ? metals.length : 0);
  const cell = "border border-black px-1 py-1";

  const totalRow = (label: string, list: OpisRow[], bold = false) => {
    const t = sum(list);
    return (
      <tr className={bold ? "font-bold" : "font-semibold bg-gray-50"}>
        <td colSpan={5} className={`${cell} text-right px-2`}>{label}</td>
        <td className={`${cell} text-right`}>{t.qty}</td>
        {showMetals && <td className={`${cell} text-right`}>{fmt(t.lig)}</td>}
        {showStones && <>
          <td className={`${cell} text-right`}>{t.stoneQty || "-"}</td>
          <td className={`${cell} text-right`}>{fmt(t.carat)}</td>
        </>}
        {showMetals && metals.map(m => <td key={m.id} className={`${cell} text-right`}>{fmt(t.metals[m.id])}</td>)}
      </tr>
    );
  };

  let n = 0;

  return (
    <Modal
      title="Опись хранения драгоценных материалов"
      onClose={onClose}
      extraWide
      footer={<>
        {generated && <Btn variant="secondary" onClick={() => show("Опись отправлена на печать")}>Печать</Btn>}
        <Btn variant="secondary" onClick={() => show("Отчёт экспортирован")}>Экспорт</Btn>
        <Btn variant="secondary" onClick={onClose}>Закрыть</Btn>
      </>}
    >
      {/* Параметры формирования */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-5 grid grid-cols-6 gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">По состоянию на<span className="text-red-500 ml-0.5">*</span></label>
          <input type="date" value={onDate} onChange={e => setOnDate(e.target.value)} className={dateCls} />
        </div>
        <Field label="Час" required><Select value={onHour} options={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))} onChange={setOnHour} /></Field>
        <Field label="Сейф"><Select value={seyf} options={seyfs} onChange={v => { setSeyf(v); setPolka(ALL); }} optionLabel={v => (v === ALL ? "Все сейфы" : `Сейф № ${v}`)} /></Field>
        <Field label="Полка"><Select value={polka} options={polkas} onChange={setPolka} optionLabel={v => (v === ALL ? "Все полки" : `Полка № ${v}`)} /></Field>
        <Field label="Тип материала"><Select value={type} options={[TYPE_ALL, TYPE_METALS, TYPE_STONES]} onChange={setType} /></Field>
        <Field label="Статус позиций"><Select value={status} options={statuses} onChange={setStatus} /></Field>
        <Field label="Класс материала"><KlassSelect value={klass} onChange={setKlass} allLabel={ALL_KLASS} /></Field>
        <Field label="Код материала"><MaterialCodeSelect value={code} onChange={setCode} allLabel={ALL_CODES} /></Field>
        <div className="col-span-2">
          <Field label="Наименование / Номенкл. №"><Input value={search} onChange={setSearch} placeholder="Поиск..." /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 h-9 cursor-pointer">
          <input type="checkbox" checked={withGp} onChange={e => setWithGp(e.target.checked)} className="w-4 h-4 accent-blue-600" />
          Включать ГП
        </label>
        <div className="flex gap-2">
          <button onClick={reset} className="flex-1 h-9 px-3 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Сбросить</button>
          <Btn onClick={() => setGenerated(true)} disabled={!onDate}>Сформировать</Btn>
        </div>
      </div>

      {!generated ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-200">
          Задайте параметры и нажмите «Сформировать» для формирования описи
        </div>
      ) : (
        <div className="border border-gray-300 bg-white p-6 text-black text-xs">
          <div className="text-center leading-relaxed mb-4">
            <p className="text-sm">
              <span className="font-bold uppercase">Опись хранения драгоценных материалов</span>
              {" "}Сейф № <span className="border-b border-black px-4">{headSeyf}</span>
              {" "}полка № <span className="border-b border-black px-4">{headPolka}</span>
            </p>
            <p className="text-sm">
              По состоянию на <span className="border-b border-black px-4">{onHour}</span> час. {dateText}
            </p>
            <p className="text-gray-500 mt-1">
              {type}{klass !== ALL_KLASS ? ` · класс: ${klass}` : ""}{code !== ALL_CODES ? ` · код: ${codeLabel(code)}` : ""}
              {status !== ALL_STATUSES ? ` · ${status === ST_STORAGE ? "на хранении" : status}` : ""}
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="text-center text-gray-500 py-6">Нет позиций по заданным параметрам</div>
          ) : (
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse border border-black text-center">
                <thead>
                  <tr>
                    {cols.slice(0, fixedCols).map(c => (
                      <th key={c} rowSpan={showMetals ? 2 : 1} className={`${cell} align-middle font-semibold`}>{c}</th>
                    ))}
                    {showMetals && <th colSpan={metals.length} className={`${cell} font-semibold`}>Масса металлов в чистоте (г)</th>}
                  </tr>
                  {showMetals && (
                    <tr>{metals.map(m => <th key={m.id} className={`${cell} font-semibold`}>{genitive(m.name)}</th>)}</tr>
                  )}
                  <tr>{cols.map((_, i) => <th key={i} className={`${cell} font-normal py-0.5`}>{i + 1}</th>)}</tr>
                </thead>
                <tbody>
                  {groups.map(g => (
                    <React.Fragment key={g.key}>
                      {groups.length > 1 && (
                        <tr><td colSpan={cols.length} className={`${cell} text-left font-semibold bg-gray-100 px-2`}>{g.label}</td></tr>
                      )}
                      {g.rows.map(r => {
                        n += 1;
                        return (
                          <tr key={`${g.key}-${r.nomenkl}-${n}`}>
                            <td className={cell}>{n}</td>
                            <td className={cell}>{r.code}</td>
                            <td className={cell}>{r.stone || !r.proba ? "-" : r.proba}</td>
                            <td className={`${cell} text-left px-2`}>{r.name}</td>
                            <td className={cell}>{r.nomenkl}</td>
                            <td className={`${cell} text-right`}>{r.qty} {r.unit}</td>
                            {showMetals && <td className={`${cell} text-right`}>{r.stone ? "-" : fmt(r.ligWeight)}</td>}
                            {showStones && <>
                              <td className={`${cell} text-right`}>{r.stone ? r.qty : "-"}</td>
                              <td className={`${cell} text-right`}>{r.stone ? fmt(r.ligWeight / CARAT_G) : "-"}</td>
                            </>}
                            {showMetals && metals.map(m => <td key={m.id} className={`${cell} text-right`}>{fmt(metalMass(r, m.id))}</td>)}
                          </tr>
                        );
                      })}
                      {groups.length > 1 && totalRow(`Итого по: ${g.label}`, g.rows)}
                    </React.Fragment>
                  ))}
                  {totalRow("ВСЕГО:", rows, true)}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-10 mt-4">
            <div>
              <p className="mb-1">Материально-ответственное лицо</p>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div><div className="border-b border-black h-6"></div><span>(подпись)</span></div>
                <div><div className="border-b border-black h-6"></div><span>(Ф.И.О.)</span></div>
              </div>
            </div>
            <div>
              <p className="mb-1">Проверил</p>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div><div className="border-b border-black h-6"></div><span>(подпись)</span></div>
                <div><div className="border-b border-black h-6"></div><span>(Ф.И.О.)</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast} onDone={clear} />}
    </Modal>
  );
}
