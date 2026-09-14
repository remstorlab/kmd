import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, PageHeader,
  useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, Toggle, SearchInput, SortTh, useSort,
} from "../components/ui";
import { AppUser, Role } from "../data/mock";
import { ArrowLeft, Plus, ChevronRight } from "lucide-react";

const permissions = ["Создать", "Редактировать", "Удалить", "Просмотр", "Экспорт", "Печать"];

interface PermNode {
  key: string;
  label: string;
  base: string[];
  actions?: string[];
  children?: PermNode[];
}

const permTree: PermNode[] = [
  {
    key: "sklady", label: "Склады", base: ["Просмотр"],
    children: [
      { key: "ostatok-dm", label: "Остатки на складе ДМ", base: ["Просмотр", "Создать", "Редактировать", "Экспорт"], actions: ["Принять на склад", "Выдать со склада", "Объединить позиции"] },
      { key: "ostatok-gp", label: "Остатки на складе ГП", base: ["Просмотр", "Создать", "Редактировать", "Экспорт"] },
    ],
  },
  {
    key: "sklad-oper", label: "Складские операции", base: ["Просмотр"],
    children: [
      { key: "prihod-list", label: "Приход на склад", base: ["Просмотр", "Создать", "Редактировать", "Удалить", "Экспорт", "Печать"], actions: ["Принять на склад", "Печать ярлыков ДМ"] },
      { key: "vydacha-list", label: "Выдача со склада", base: ["Просмотр", "Создать", "Редактировать", "Удалить", "Экспорт", "Печать"], actions: ["Выдать со склада"] },
    ],
  },
  {
    key: "dvizhenie-mat", label: "Движение материала", base: ["Просмотр", "Создать", "Редактировать", "Экспорт", "Печать"],
    actions: ["Новая операция", "Оформить возврат", "Списать разницу"],
  },
  {
    key: "shihtovye-karty", label: "Шихтовые карты", base: ["Просмотр", "Создать", "Редактировать", "Экспорт"],
  },
  {
    key: "podotchetniki", label: "Подотчётники", base: ["Просмотр"],
  },
  {
    key: "otchetnost", label: "Отчётность", base: ["Просмотр", "Экспорт"],
  },
  {
    key: "spravochniki", label: "Справочники", base: ["Просмотр"],
  },
  {
    key: "logirovanie", label: "Логирование", base: ["Просмотр"],
  },
  {
    key: "admin", label: "Панель администрирования", base: ["Просмотр"],
    children: [
      { key: "admin-users", label: "Пользователи", base: ["Просмотр", "Создать", "Редактировать"], actions: ["Добавить пользователя"] },
      { key: "admin-roles", label: "Роли и разрешения", base: ["Просмотр", "Создать", "Редактировать", "Удалить"], actions: ["Создать роль"] },
    ],
  },
];

function flattenNodes(nodes: PermNode[]): PermNode[] {
  return nodes.flatMap(n => [n, ...(n.children ? flattenNodes(n.children) : [])]);
}
const allPermNodes = flattenNodes(permTree);

const defaultBasePerms: Record<string, string[]> = {
  "sklady": ["Просмотр"],
  "ostatok-dm": ["Просмотр", "Экспорт"],
  "ostatok-gp": ["Просмотр", "Экспорт"],
  "sklad-oper": ["Просмотр"],
  "prihod-list": ["Создать", "Редактировать", "Просмотр", "Экспорт", "Печать"],
  "vydacha-list": ["Создать", "Редактировать", "Просмотр", "Экспорт", "Печать"],
  "dvizhenie-mat": ["Создать", "Редактировать", "Просмотр", "Экспорт", "Печать"],
  "shihtovye-karty": ["Создать", "Редактировать", "Просмотр", "Экспорт"],
  "podotchetniki": ["Просмотр"],
  "otchetnost": ["Просмотр", "Экспорт"],
  "spravochniki": ["Просмотр"],
  "logirovanie": ["Просмотр"],
  "admin": ["Просмотр"],
  "admin-users": ["Просмотр"],
  "admin-roles": ["Просмотр"],
};

function PermTreeRows({
  nodes, level, expanded, toggleExpand, baseState, actionState, toggleBase, toggleAction, readOnly,
}: {
  nodes: PermNode[];
  level: number;
  expanded: Set<string>;
  toggleExpand: (key: string) => void;
  baseState: Record<string, Set<string>>;
  actionState: Record<string, Set<string>>;
  toggleBase: (key: string, perm: string) => void;
  toggleAction: (key: string, action: string) => void;
  readOnly?: boolean;
}) {
  return (
    <>
      {nodes.map(n => (
        <React.Fragment key={n.key}>
          <tr className="hover:bg-gray-50">
            <td className="py-2 pr-3">
              <div className="flex items-center gap-1.5" style={{ paddingLeft: level * 20 }}>
                {n.children ? (
                  <button type="button" onClick={() => toggleExpand(n.key)} className="text-gray-400 hover:text-gray-600 shrink-0">
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded.has(n.key) ? "rotate-90" : ""}`} />
                  </button>
                ) : <span className="w-3.5 shrink-0" />}
                <span className={level === 0 ? "font-medium text-gray-900" : "text-gray-700"}>{n.label}</span>
              </div>
            </td>
            {permissions.map(p => (
              <td key={p} className="px-2 py-2 text-center">
                {n.base.includes(p) ? (
                  <input type="checkbox" checked={baseState[n.key]?.has(p) || false} onChange={() => toggleBase(n.key, p)} disabled={readOnly} />
                ) : <span className="text-gray-300">–</span>}
              </td>
            ))}
            <td className="px-3 py-2">
              {n.actions && n.actions.length > 0 ? (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {n.actions.map(a => (
                    <label key={a} className="inline-flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
                      <input type="checkbox" checked={actionState[n.key]?.has(a) || false} onChange={() => toggleAction(n.key, a)} disabled={readOnly} />
                      {a}
                    </label>
                  ))}
                </div>
              ) : <span className="text-gray-300 text-xs">–</span>}
            </td>
          </tr>
          {n.children && expanded.has(n.key) && (
            <PermTreeRows
              nodes={n.children}
              level={level + 1}
              expanded={expanded}
              toggleExpand={toggleExpand}
              baseState={baseState}
              actionState={actionState}
              toggleBase={toggleBase}
              toggleAction={toggleAction}
              readOnly={readOnly}
            />
          )}
        </React.Fragment>
      ))}
    </>
  );
}

function NewRoleModal({ role, readOnly = false, onClose, onSave }: { role?: Role; readOnly?: boolean; onClose: () => void; onSave: (r: Role) => void }) {
  const [roleName, setRoleName] = useState(role?.name || "");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(permTree.filter(n => n.children).map(n => n.key)));
  const [baseState, setBaseState] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(allPermNodes.map(n => [n.key, new Set(role?.permissions?.base?.[n.key] ?? defaultBasePerms[n.key] ?? [])]))
  );
  const [actionState, setActionState] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(allPermNodes.map(n => [n.key, new Set(role?.permissions?.actions?.[n.key] ?? [])]))
  );

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const toggleBase = (key: string, perm: string) => {
    setBaseState(prev => {
      const s = new Set(prev[key]);
      s.has(perm) ? s.delete(perm) : s.add(perm);
      return { ...prev, [key]: s };
    });
  };

  const toggleAction = (key: string, action: string) => {
    setActionState(prev => {
      const s = new Set(prev[key]);
      s.has(action) ? s.delete(action) : s.add(action);
      return { ...prev, [key]: s };
    });
  };

  const save = () => {
    const base: Record<string, string[]> = {};
    const actions: Record<string, string[]> = {};
    allPermNodes.forEach(n => {
      base[n.key] = [...baseState[n.key]];
      if (actionState[n.key]?.size) actions[n.key] = [...actionState[n.key]];
    });
    onSave({ id: role?.id || `r-${Date.now()}`, name: roleName || "Новая роль", active: role?.active ?? true, permissions: { base, actions } });
  };

  return (
    <Modal
      title={role ? (readOnly ? `Роль: ${role.name}` : `Редактирование роли «${role.name}»`) : "Новая роль"}
      onClose={onClose}
      extraWide
      footer={
        readOnly ? (
          <Btn variant="secondary" onClick={onClose}>Закрыть</Btn>
        ) : (
          <>
            <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
            <Btn onClick={save}>Сохранить</Btn>
          </>
        )
      }
    >
      <div className="mb-5">
        <Field label="Наименование роли"><Input value={roleName} onChange={setRoleName} placeholder="Введите наименование роли" disabled={readOnly} /></Field>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs">Раздел системы</th>
              {permissions.map(p => (
                <th key={p} className="px-2 py-2 text-center font-medium text-gray-500 text-xs">{p}</th>
              ))}
              <th className="px-3 py-2 text-left font-medium text-gray-500 text-xs">Разрешения на действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <PermTreeRows
              nodes={permTree}
              level={0}
              expanded={expanded}
              toggleExpand={toggleExpand}
              baseState={baseState}
              actionState={actionState}
              toggleBase={toggleBase}
              toggleAction={toggleAction}
              readOnly={readOnly}
            />
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function NewUserModal({ user, onClose, onSave }: { user?: AppUser | null; onClose: () => void; onSave: (u: AppUser) => void }) {
  const [form, setForm] = useState({
    username: user?.username || "",
    name: user?.name || "",
    email: user?.email || "",
    role: user?.role || "Сотрудник склада ДМ",
    blocked: user?.status === "Заблокирован",
    password: "",
    position: "",
    phone: "+7 (___) ___-__-__",
  });

  return (
    <Modal
      title={user ? "Редактировать пользователя" : "Новый пользователь"}
      onClose={onClose}
      wide
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn onClick={() => onSave({
            id: user?.id || `u-${Date.now()}`,
            name: form.name,
            username: form.username,
            email: form.email,
            role: form.role,
            status: form.blocked ? "Заблокирован" : "Активен",
          })}>
            {user ? "Сохранить" : "Добавить"}
          </Btn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Username"><Input value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))} placeholder="login" /></Field>
        <Field label="Пароль"><Input value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="••••••••" /></Field>
        <Field label="ФИО" full><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Иванов Иван Иванович" /></Field>
        <Field label="Должность"><Input value={form.position} onChange={v => setForm(f => ({ ...f, position: v }))} placeholder="Кладовщик" /></Field>
        <Field label="Электронная почта"><Input value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="email@company.ru" /></Field>
        <Field label="Телефон"><Input value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+7 (___) ___-__-__" /></Field>
        <Field label="Роль" full>
          <Select
            value={form.role}
            options={["Администратор", "Сотрудник склада ДМ", "Сотрудник ПТО", "Технолог"]}
            onChange={v => setForm(f => ({ ...f, role: v }))}
          />
        </Field>
        <div className="col-span-2 flex items-center justify-between">
          <Toggle checked={form.blocked} onChange={v => setForm(f => ({ ...f, blocked: v }))} label="Блокировка" />
          <Toggle checked={true} onChange={() => {}} label="Язык: RU" disabled />
        </div>
      </div>
    </Modal>
  );
}

function RolesPage({ onBack }: { onBack: () => void }) {
  const { roles, setRoles } = useApp();
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [viewRole, setViewRole] = useState<Role | null>(null);
  const [editRole, setEditRole] = useState<Role | null>(null);

  const filtered = roles.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-gray-500">Панель администрирования / Роли и разрешения</div>
        <span className="text-xs text-gray-400">Обновлено: {new Date().toLocaleDateString("ru-RU")}</span>
      </div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Роли и разрешения</h1>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={onBack}><ArrowLeft className="w-4 h-4" />Назад к пользователям</Btn>
          <Btn onClick={() => setShowNew(true)}><Plus className="w-4 h-4" />Создать роль</Btn>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-gray-500 mb-1">Наименование роли</label>
          <SearchInput value={search} onChange={setSearch} placeholder="Поиск по названию роли..." />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs">Наименование роли</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs">Статус</th>
              <th className="w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(role => (
              <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{role.name}</td>
                <td className="px-4 py-3">
                  {role.active ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Активная роль
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                      Неактивна
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <EyeIcon onClick={() => setViewRole(role)} />
                    <EditIcon onClick={() => setEditRole(role)} />
                    <DeleteIcon onClick={() => confirm(`Удалить роль «${role.name}»?`, () => setRoles(prev => prev.filter(r => r.id !== role.id)))} />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">Роли не найдены</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewRoleModal
          onClose={() => setShowNew(false)}
          onSave={r => { setRoles(prev => [...prev, r]); setShowNew(false); show("Роль создана"); }}
        />
      )}
      {viewRole && (
        <NewRoleModal role={viewRole} readOnly onClose={() => setViewRole(null)} onSave={() => {}} />
      )}
      {editRole && (
        <NewRoleModal
          role={editRole}
          onClose={() => setEditRole(null)}
          onSave={r => { setRoles(prev => prev.map(x => x.id === r.id ? r : x)); setEditRole(null); show("Роль обновлена"); }}
        />
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

function SettingsPage({ onBack }: { onBack: () => void }) {
  const { securityPolicy, setSecurityPolicy } = useApp();
  const { toast, show, clear } = useToast();
  const [form, setForm] = useState({
    minLength: String(securityPolicy.minLength),
    minCharTypes: String(securityPolicy.minCharTypes),
    expiryDays: String(securityPolicy.expiryDays),
    historyDepth: String(securityPolicy.historyDepth),
    minDiffPositions: String(securityPolicy.minDiffPositions),
    sessionTimeoutMinutes: String(securityPolicy.sessionTimeoutMinutes),
  });

  const save = () => {
    setSecurityPolicy({
      minLength: Math.max(1, parseInt(form.minLength, 10) || 8),
      minCharTypes: Math.min(4, Math.max(1, parseInt(form.minCharTypes, 10) || 3)),
      expiryDays: Math.max(1, parseInt(form.expiryDays, 10) || 90),
      historyDepth: Math.max(1, parseInt(form.historyDepth, 10) || 3),
      minDiffPositions: Math.max(1, parseInt(form.minDiffPositions, 10) || 3),
      sessionTimeoutMinutes: Math.max(1, parseInt(form.sessionTimeoutMinutes, 10) || 30),
    });
    show("Настройки сохранены");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-gray-500">Панель администрирования / Настройки</div>
        <span className="text-xs text-gray-400">Обновлено: {new Date().toLocaleDateString("ru-RU")}</span>
      </div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Настройки</h1>
          <p className="text-sm text-gray-500 mt-1">Параметры процессов авторизации, сессии и смены пароля</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={onBack}><ArrowLeft className="w-4 h-4" />Назад к пользователям</Btn>
          <Btn onClick={save}>Сохранить</Btn>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h3 className="font-semibold text-gray-900 mb-1">Парольная политика</h3>
        <p className="text-sm text-gray-500 mb-4">
          Аутентификация пользователей должна осуществляться по логину и паролю с обязательным соблюдением парольной политики.
        </p>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Field label="Минимальная длина пароля, символов">
            <Input value={form.minLength} onChange={v => setForm(f => ({ ...f, minLength: v }))} placeholder="8" />
          </Field>
          <Field label="Минимальное число типов символов">
            <Select value={form.minCharTypes} options={["2", "3", "4"]} onChange={v => setForm(f => ({ ...f, minCharTypes: v }))} />
          </Field>
          <Field label="Периодичность смены пароля, дней">
            <Input value={form.expiryDays} onChange={v => setForm(f => ({ ...f, expiryDays: v }))} placeholder="90" />
          </Field>
          <Field label="Запрет повтора: последних паролей">
            <Input value={form.historyDepth} onChange={v => setForm(f => ({ ...f, historyDepth: v }))} placeholder="3" />
          </Field>
          <Field label="Минимальное отличие пароля, позиций">
            <Input value={form.minDiffPositions} onChange={v => setForm(f => ({ ...f, minDiffPositions: v }))} placeholder="3" />
          </Field>
        </div>
        <ul className="text-xs text-gray-500 list-disc list-inside space-y-1 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <li>Минимальная длина пароля: {form.minLength || 0} (восемь) символов.</li>
          <li>Сложность пароля: состоит не менее чем из {form.minCharTypes || 0} типов символов (букв в верхнем регистре, букв в нижнем регистре, цифр и других символов, знаков пунктуации).</li>
          <li>Обязательная смена пароля: не реже 1 раза в {Math.round((parseInt(form.expiryDays, 10) || 0) / 30)} мес. ({form.expiryDays || 0} дн.).</li>
          <li>Отличие нового пароля: от {form.historyDepth || 0} предыдущих и не менее чем в {form.minDiffPositions || 0} позициях символов.</li>
        </ul>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Политика сессии</h3>
        <p className="text-sm text-gray-500 mb-4">
          Сессия пользователя должна автоматически завершаться по истечении установленного периода неактивности.
        </p>
        <div className="max-w-xs">
          <Field label="Таймаут неактивности сессии, минут">
            <Input value={form.sessionTimeoutMinutes} onChange={v => setForm(f => ({ ...f, sessionTimeoutMinutes: v }))} placeholder="30" />
          </Field>
        </div>
      </div>

      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

export function PanelAdmin() {
  const { users, setUsers } = useApp();
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [showRoles, setShowRoles] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [search, setSearch] = useState("");

  const filtered = users.filter(u => {
    const q = search.trim().toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const { sorted, sort, toggleSort } = useSort(filtered, {
    name: u => u.name,
    username: u => u.username,
    role: u => u.role,
    email: u => u.email,
    status: u => u.status,
  });

  if (showRoles) {
    return <RolesPage onBack={() => setShowRoles(false)} />;
  }
  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />;
  }

  return (
    <div>
      <PageHeader
        title="Панель администрирования"
        subtitle="Управление пользователями и ролями"
        breadcrumb={["Администрирование", "Пользователи"]}
        actions={
          <>
            <Btn onClick={() => setShowNewUser(true)}><Plus className="w-4 h-4" />Добавить пользователя</Btn>
            <Btn variant="secondary" onClick={() => setShowRoles(true)}>Управление ролями</Btn>
            <Btn variant="secondary" onClick={() => setShowSettings(true)}>Настройки</Btn>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-gray-500 mb-1">Поиск</label>
          <SearchInput value={search} onChange={setSearch} placeholder="ФИО, username, роль..." />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortTh sortKey="name" sort={sort} onSort={toggleSort}>ФИО</SortTh>
              <SortTh sortKey="username" sort={sort} onSort={toggleSort}>Username</SortTh>
              <SortTh sortKey="role" sort={sort} onSort={toggleSort}>Роль</SortTh>
              <SortTh sortKey="email" sort={sort} onSort={toggleSort}>Email</SortTh>
              <SortTh sortKey="status" sort={sort} onSort={toggleSort}>Статус доступа</SortTh>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-gray-500">{user.username}</td>
                <td className="px-4 py-3 text-gray-600">{user.role}</td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3"><Badge label={user.status} /></td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <EyeIcon onClick={() => show(`Пользователь: ${user.name}`)} />
                  <EditIcon onClick={() => setEditUser(user)} />
                  <DeleteIcon onClick={() => confirm(`Удалить пользователя «${user.name}»?`, () => { setUsers(prev => prev.filter(u => u.id !== user.id)); show("Пользователь удалён"); })} />
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Пользователи не найдены</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showNewUser && (
        <NewUserModal
          onClose={() => setShowNewUser(false)}
          onSave={u => { setUsers(prev => [...prev, u]); setShowNewUser(false); show("Пользователь добавлен"); }}
        />
      )}
      {editUser && (
        <NewUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={u => { setUsers(prev => prev.map(x => x.id === u.id ? u : x)); setEditUser(null); show("Пользователь обновлён"); }}
        />
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}
