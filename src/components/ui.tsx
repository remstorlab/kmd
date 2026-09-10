import React, { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Pencil, Trash2, Printer, Search, X, FileDown, Paperclip, Download, Check, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

// ── Badge ────────────────────────────────────────────────────────────────────

const badgePalette: Record<string, string> = {
  "На складе": "bg-green-100 text-green-700 border-green-200",
  "Выполнено": "bg-green-100 text-green-700 border-green-200",
  "Выполнена": "bg-green-100 text-green-700 border-green-200",
  "Соответствует": "bg-green-100 text-green-700 border-green-200",
  "Без изменений": "bg-green-100 text-green-700 border-green-200",
  "Активен": "bg-green-100 text-green-700 border-green-200",
  "Активно": "bg-green-100 text-green-700 border-green-200",
  "Выдано": "bg-green-100 text-green-700 border-green-200",
  "Создание": "bg-green-100 text-green-700 border-green-200",

  "Резерв": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "В работе": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Частично": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Превышение": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Подготовлена к плавке": "bg-yellow-100 text-yellow-700 border-yellow-200",

  "В обработке": "bg-blue-100 text-blue-700 border-blue-200",
  "В подотчёте": "bg-blue-100 text-blue-700 border-blue-200",
  "Зарезервировано": "bg-blue-100 text-blue-700 border-blue-200",
  "Изменена": "bg-blue-100 text-blue-700 border-blue-200",
  "Новая": "bg-blue-100 text-blue-700 border-blue-200",
  "Изменение": "bg-blue-100 text-blue-700 border-blue-200",
  "В норме": "bg-blue-100 text-blue-700 border-blue-200",

  "Заблокирован": "bg-red-100 text-red-700 border-red-200",
  "Утрачена": "bg-red-100 text-red-700 border-red-200",
  "Удаление": "bg-red-100 text-red-700 border-red-200",

  "Закрыт": "bg-gray-100 text-gray-600 border-gray-200",
  "Закрыто": "bg-gray-100 text-gray-600 border-gray-200",
  "Закрыто: списано": "bg-gray-100 text-gray-600 border-gray-200",
  "Не начат": "bg-gray-100 text-gray-600 border-gray-200",
  "Не выдано": "bg-gray-100 text-gray-600 border-gray-200",
  "Не закрыто": "bg-gray-100 text-gray-600 border-gray-200",
  "Закрытие": "bg-gray-100 text-gray-600 border-gray-200",

  "Преобразован": "bg-purple-100 text-purple-700 border-purple-200",
};

export function Badge({ label }: { label: string }) {
  const cls = badgePalette[label] ?? "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
  extraWide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  extraWide?: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const maxW = extraWide ? "max-w-5xl" : wide ? "max-w-3xl" : "max-w-xl";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${maxW} flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────

export function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base = "inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50",
    danger: "border border-red-500 text-red-600 hover:bg-red-50 disabled:opacity-50",
    ghost: "text-blue-600 hover:bg-blue-50 disabled:opacity-50",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]}`}>
      {children}
    </button>
  );
}

// ── Table action icons ───────────────────────────────────────────────────────

export function EyeIcon({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-blue-500 hover:text-blue-700 transition-colors p-1" title="Просмотр">
      <Eye className="w-4 h-4" />
    </button>
  );
}

export function EditIcon({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-gray-400 hover:text-gray-600 transition-colors p-1" title="Редактировать">
      <Pencil className="w-4 h-4" />
    </button>
  );
}

export function DeleteIcon({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Удалить">
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

export function PrintIcon({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-gray-400 hover:text-gray-600 transition-colors p-1" title="Печать">
      <Printer className="w-4 h-4" />
    </button>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="font-semibold text-gray-900 mb-2">Подтверждение</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <Btn variant="secondary" onClick={onCancel}>Отмена</Btn>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────────

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 right-6 z-[70] bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-fade-in">
      <Check className="w-4 h-4 text-green-400" />
      {message}
    </div>
  );
}

// ── Breadcrumb ───────────────────────────────────────────────────────────────

export function Breadcrumb({ parts }: { parts: string[] }) {
  return (
    <div className="flex items-center gap-1 text-sm text-gray-500">
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-gray-300">/</span>}
          <span className={i === parts.length - 1 ? "text-gray-800 font-medium" : ""}>{p}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Pagination ───────────────────────────────────────────────────────────────

export function Pagination({
  page,
  total,
  perPage,
  onPage,
}: {
  page: number;
  total: number;
  perPage: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.ceil(total / perPage);
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <span className="text-sm text-gray-500">Показано {from}–{to} из {total} позиций</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
        {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onPage(p)} className={`w-8 h-8 flex items-center justify-center rounded border text-sm font-medium transition-colors ${p === page ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-600 hover:border-blue-400"}`}>{p}</button>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page === pages} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

// ── Table sorting ────────────────────────────────────────────────────────────

export type SortDir = "asc" | "desc";
export type SortState = { key: string; dir: SortDir } | null;

// Parses "ДД.ММ.ГГГГ" or "ДД.ММ.ГГГГ, ЧЧ:ММ" into a sortable number.
export function parseRuDate(s: string): number {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})(?:,\s*(\d{2}):(\d{2}))?/.exec(s);
  if (!m) return 0;
  const [, d, mo, y, h = "0", mi = "0"] = m;
  return Number(y) * 100000000 + Number(mo) * 1000000 + Number(d) * 10000 + Number(h) * 100 + Number(mi);
}

export function useSort<T>(rows: T[], accessors: Record<string, (row: T) => string | number>) {
  const [sort, setSort] = useState<SortState>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const acc = accessors[sort.key];
    if (!acc) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = acc(a), vb = acc(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "ru");
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, accessors]);
  const toggleSort = (key: string) => setSort(prev => (prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  return { sorted, sort, toggleSort };
}

export function SortTh({
  children,
  sortKey,
  sort,
  onSort,
  align = "left",
  className = "px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide",
}: {
  children: React.ReactNode;
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const active = sort?.key === sortKey;
  const Icon = active ? (sort!.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const justifyCls = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  return (
    <th className={`${className} ${alignCls}`}>
      <button type="button" onClick={() => onSort(sortKey)} className={`inline-flex w-full items-center gap-1 ${justifyCls} hover:text-gray-700 transition-colors ${active ? "text-gray-700" : ""}`}>
        {children}
        <Icon className={`w-3 h-3 shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} />
      </button>
    </th>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────

export function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export function Input({ value, onChange, placeholder = "", disabled = false }: { value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <input
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
    />
  );
}

export function Select({ value, onChange, options, disabled = false }: { value: string; onChange?: (v: string) => void; options: string[]; disabled?: boolean }) {
  return (
    <select
      value={value}
      onChange={e => onChange?.(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 bg-white"
    >
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

export function Textarea({ value, onChange, placeholder = "", rows = 3, disabled = false }: { value: string; onChange?: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 resize-none"
    />
  );
}

// ── SearchInput ───────────────────────────────────────────────────────────────

export function SearchInput({ value, onChange, placeholder = "Поиск..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumb?: string[];
}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        {breadcrumb && <Breadcrumb parts={breadcrumb} />}
        <span className="text-xs text-gray-400 ml-auto">Обновлено: {dateStr}, {timeStr}</span>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

// ── ExportBtn ─────────────────────────────────────────────────────────────────

export function ExportBtn({ onToast }: { onToast: (msg: string) => void }) {
  return (
    <Btn variant="secondary" onClick={() => onToast("Файл экспортирован в Excel")}>
      <FileDown className="w-4 h-4" />
      Экспорт в Excel
    </Btn>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

export function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-gray-300"}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

// ── FileChip ──────────────────────────────────────────────────────────────────

export function FileChip({ name, onDownload }: { name: string; onDownload: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 inline-flex">
      <Paperclip className="w-4 h-4 text-gray-400" />
      <span className="text-sm text-gray-700">{name}</span>
      <button onClick={onDownload} className="text-gray-400 hover:text-blue-600 transition-colors ml-1">
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex border-b border-gray-200 mb-4">
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${active === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ── useToast hook ─────────────────────────────────────────────────────────────

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = (msg: string) => setToast(msg);
  const clear = () => setToast(null);
  return { toast, show, clear };
}

// ── useConfirm hook ───────────────────────────────────────────────────────────

export function useConfirm() {
  const [state, setState] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const confirm = (message: string, onConfirm: () => void) => setState({ message, onConfirm });
  const cancel = () => setState(null);
  const doConfirm = () => { state?.onConfirm(); cancel(); };
  return { confirmState: state, confirm, cancel, doConfirm };
}
