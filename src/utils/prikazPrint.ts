// ── Печатная форма приказа на плавку (Word .docx / PDF) ──────────────────────
// Текст приказа «О проведении плавки на установке …» по образцу КМД: для каждой шихтовой карты приказа
// (по номеру плавки) — позиции склада ДМ, которые выдаются на участок: наименование, количество (готовая продукция
// и позиции из нескольких изделий), лигатурная масса и масса основного металла в чистоте (г.ч.в.).
// Доп. материалы (лигатура, медь) выдаёт распределитель работ участка — в приказ не входят.
// Значения, которых нет в системе (установка, толщина, ФИО, срок выдачи), — пустые строки для заполнения вручную.
// Одна модель документа выводится в .docx (OOXML, текст копируется) и в HTML (просмотр и печать → «Сохранить как PDF»).

import { AlloyGrade, MaterialCode, PrikazPlavka, ShihtovayaKarta, SDM1, SDM2, baseMetal, isGPKlass } from "../data/mock";
import { isSkladMaterial } from "../data/shihta";
import { zip } from "./xlsx";

type Run = { t: string; b?: boolean };
interface Para { kind: "p"; runs: Run[]; align?: "left" | "both" | "right"; indent?: boolean; size?: number; before?: number }
interface Table { kind: "table"; widths: number[]; rows: Para[][] }
type Block = Para | Table;

const BLANK = "__________";
const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const METAL_GEN: Record<string, string> = { Ag: "серебра", Au: "золота", Pt: "платины", Pd: "палладия" };

const p = (runs: Run[] | string, o: Omit<Para, "kind" | "runs"> = {}): Para => ({ kind: "p", runs: typeof runs === "string" ? [{ t: runs }] : runs, ...o });
const fmt = (v: number, d: number) => v.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
const numOf = (v: string | number | undefined) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
// «Слиток серебра СрА-1» → «слиток серебра СрА-1» (аббревиатуры вида «СрМ …» не меняются)
const lowerFirst = (s: string) => (s.length > 1 && s[1] === s[1].toLowerCase() ? s[0].toLowerCase() + s.slice(1) : s);

export const prikazFileName = (pr: PrikazPlavka) => `Приказ на плавку № ${pr.number} от ${pr.date}`.replace(/[\\/:*?"<>|]/g, "_");

// Модель документа
function prikazBlocks(pr: PrikazPlavka, karty: ShihtovayaKarta[], grades: AlloyGrade[], codes: MaterialCode[]): Block[] {
  const [, mm, yyyy] = pr.date.split(".");
  const year = yyyy || String(new Date().getFullYear());
  const month = MONTHS[(parseInt(mm, 10) || 1) - 1];
  const grade = grades.find(g => g.id === pr.alloyId);
  const nums = karty.map(k => parseInt(k.plavkaNo, 10)).filter(n => Number.isFinite(n));
  const lo = Math.min(...nums), hi = Math.max(...nums);
  const range = nums.length === 0 ? `№ ${BLANK}` : lo === hi ? `№ ${lo}` : `№ ${lo} – ${hi}`;
  const alloy = grade ? `${METAL_GEN[grade.base] ?? ""} марки ${grade.name}`.trim() : BLANK;
  // Кладовая — склад позиций карт (СДМ №1 / №2)
  const sklady = [...new Set(karty.flatMap(k => k.materials.filter(isSkladMaterial).map(m => m.sklad)))]
    .map(s => (s === SDM1 ? "№ 1" : s === SDM2 ? "№ 2" : "")).filter(Boolean);
  const kladovaya = sklady.length ? sklady.join(", ") : "№ ____";

  const out: Block[] = [
    p(`№ ${pr.number} от ${pr.date} г.`, { size: 12 }),
    p([{ t: "О проведении плавки на установке\n«__________»", b: true }], { before: 12 }),
    p([
      { t: `Согласно плану производства на ${month} ${year} года по проведению плавки ${alloy} (${range}) толщиной ____ мм на установке «__________», ` },
      { t: "ПРИКАЗЫВАЮ", b: true }, { t: ":" },
    ], { indent: true, align: "both", before: 24 }),
    p(`1. Заместителю Генерального директора по производству ${BLANK} выдать на участок ИДМ из кладовой ${kladovaya} склада драгоценных металлов на лицевой счет ${BLANK} в срок до ${BLANK} года:`, { indent: true, align: "both" }),
  ];

  karty.forEach((k, i) => {
    out.push(p(`${i + 1}) для проведения плавки № ${k.plavkaNo}:`, { indent: true, align: "both" }));
    const mats = k.materials.filter(isSkladMaterial);
    if (mats.length === 0) out.push(p(`– ${BLANK}.`, { indent: true, align: "both" }));
    mats.forEach((m, j) => {
      const metal = m.code ? baseMetal(m.code, codes) : grade?.base ?? "Ag";
      const net = numOf(m.chem?.[metal.toLowerCase()]);
      const qty = m.qty && (isGPKlass(m.klass) || m.qty > 1) ? ` в количестве ${fmt(m.qty, 0)} шт.` : "";
      const end = j === mats.length - 1 ? "." : ";";
      out.push(p(`– ${lowerFirst(m.name)}${qty} лигатурной массой ${fmt(m.ves, 1)} грамм (${fmt(net, 2)} г.ч.в.)${end}`, { indent: true, align: "both" }));
    });
  });

  // Подписи
  out.push({
    kind: "table", widths: [6000, 3355],
    rows: [[
      p([{ t: "Заместитель Генерального директора –\nглавный инженер", b: true }], { before: 36 }),
      p([{ t: "М. Ежембаев", b: true }], { align: "right", before: 36 }),
    ]],
  });
  out.push(p("Согласовано:", { before: 24 }));
  const sign = (role: string): Para[] => [
    p(role, { before: 12 }), p("______________", { before: 12 }), p(`«___»_______ ${year} г.`, { align: "right", before: 12 }),
  ];
  out.push({
    kind: "table", widths: [3900, 2400, 3055],
    rows: [sign("Заместитель Генерального\nдиректора по производству"), sign("Главный бухгалтер"), sign("Главный юрисконсульт"), sign("Переводчик ОДОК")],
  });
  out.push(p(`Ознакомить: ${BLANK}.`, { size: 10, before: 36 }));
  out.push(p("Разослать : 1 экз. – ОБУ, 2 экз. – ПТО, 3 экз. – СДМ.", { size: 10, before: 12 }));
  return out;
}

// ── .docx ──
const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function runXml(r: Run, size?: number) {
  const rPr = `${r.b ? "<w:b/>" : ""}${size ? `<w:sz w:val="${size * 2}"/><w:szCs w:val="${size * 2}"/>` : ""}`;
  return r.t.split("\n")
    .map((t, i) => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r>`)
    .join("");
}
function paraXml(x: Para) {
  const spacing = x.before ? `<w:spacing w:before="${x.before * 20}"/>` : "";
  const ind = x.indent ? `<w:ind w:firstLine="709"/>` : "";
  const jc = x.align && x.align !== "left" ? `<w:jc w:val="${x.align}"/>` : "";
  return `<w:p><w:pPr>${spacing}${ind}${jc}</w:pPr>${x.runs.map(r => runXml(r, x.size)).join("")}</w:p>`;
}
function tableXml(t: Table) {
  const none = ["top", "left", "bottom", "right", "insideH", "insideV"].map(s => `<w:${s} w:val="nil"/>`).join("");
  const total = t.widths.reduce((a, w) => a + w, 0);
  return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblBorders>${none}</w:tblBorders><w:tblLayout w:type="fixed"/>`
    + `<w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>`
    + `<w:tblGrid>${t.widths.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`
    + t.rows.map(r => `<w:tr>${r.map((c, i) => `<w:tc><w:tcPr><w:tcW w:w="${t.widths[i]}" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr>${paraXml(c)}</w:tc>`).join("")}</w:tr>`).join("")
    + "</w:tbl>";
}

const XML_HEAD = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;
const W_NS = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"`;
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const OD_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export function downloadPrikazDocx(pr: PrikazPlavka, karty: ShihtovayaKarta[], grades: AlloyGrade[], codes: MaterialCode[]) {
  const body = prikazBlocks(pr, karty, grades, codes).map(b => (b.kind === "p" ? paraXml(b) : tableXml(b))).join("");
  const files: Record<string, string> = {
    "[Content_Types].xml": `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`
      + `<Default Extension="xml" ContentType="application/xml"/>`
      + `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>`
      + `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    "_rels/.rels": `${XML_HEAD}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${OD_REL}/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/_rels/document.xml.rels": `${XML_HEAD}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${OD_REL}/styles" Target="styles.xml"/></Relationships>`,
    // Шрифт по умолчанию — Times New Roman 14, без интервалов между абзацами
    "word/styles.xml": `${XML_HEAD}<w:styles ${W_NS}><w:docDefaults><w:rPrDefault><w:rPr>`
      + `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>`
      + `<w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:val="ru-RU"/></w:rPr></w:rPrDefault>`
      + `<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`,
    // A4, поля: верх / низ 2 см, левое 3 см, правое 1,5 см
    "word/document.xml": `${XML_HEAD}<w:document ${W_NS}><w:body>${body}`
      + `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`
      + `</w:body></w:document>`,
  };
  const blob = new Blob([zip(files) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${prikazFileName(pr)}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── HTML: просмотр и печать (PDF) ──
const htmlEsc = (s: string) => xmlEsc(s).replace(/\n/g, "<br>");
function paraHtml(x: Para) {
  const st = [
    `text-align:${x.align === "both" ? "justify" : x.align ?? "left"}`,
    x.indent ? "text-indent:1.25cm" : "",
    x.size ? `font-size:${x.size}pt` : "",
    x.before ? `margin-top:${x.before}pt` : "",
  ].filter(Boolean).join(";");
  return `<p style="${st}">${x.runs.map(r => (r.b ? `<b>${htmlEsc(r.t)}</b>` : htmlEsc(r.t))).join("")}</p>`;
}
function tableHtml(t: Table) {
  const total = t.widths.reduce((a, w) => a + w, 0);
  return `<table>${t.rows.map(r => `<tr>${r.map((c, i) => `<td style="width:${(t.widths[i] * 100) / total}%">${paraHtml(c)}</td>`).join("")}</tr>`).join("")}</table>`;
}

export function prikazHtml(pr: PrikazPlavka, karty: ShihtovayaKarta[], grades: AlloyGrade[], codes: MaterialCode[]) {
  const body = prikazBlocks(pr, karty, grades, codes).map(b => (b.kind === "p" ? paraHtml(b) : tableHtml(b))).join("");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${xmlEsc(prikazFileName(pr))}</title><style>
@page { size: A4; margin: 2cm 1.5cm 2cm 3cm; }
html { background: #fff; }
body { margin: 0; font-family: "Times New Roman", Times, serif; font-size: 14pt; line-height: 1.15; color: #000; }
.page { max-width: 16.5cm; margin: 0 auto; }
@media screen { body { padding: 1.5cm 1cm; } }
p { margin: 0; }
table { width: 100%; border-collapse: collapse; }
td { padding: 0; vertical-align: bottom; }
</style></head><body><div class="page">${body}</div></body></html>`;
}

// Печать через скрытый iframe — в диалоге печати выбрать «Сохранить как PDF»
export function printPrikazPdf(html: string) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  const win = frame.contentWindow!;
  win.addEventListener("afterprint", () => frame.remove());
  setTimeout(() => { win.focus(); win.print(); }, 100);
}
