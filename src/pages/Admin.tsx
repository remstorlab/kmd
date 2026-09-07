import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  Badge, Btn, Modal, EyeIcon, EditIcon, DeleteIcon, PageHeader,
  useToast, Toast, useConfirm, ConfirmDialog,
  Field, Input, Select, Toggle,
} from "../components/ui";
import { AppUser, Role } from "../data/mock";

const sections = [
  "Склады", "Складские операции", "Движение материала",
  "Шихтовые карты", "Подотчётники", "Отчётность",
  "Справочники", "Логирование", "Панель администрирования",
];
const permissions = ["Создать", "Редактировать", "Удалить", "Просмотр", "Экспорт", "Печать"];

const defaultPerms: Record<string, string[]> = {
  "Склады": ["Просмотр", "Экспорт"],
  "Складские операции": ["Создать", "Редактировать", "Просмотр", "Экспорт", "Печать"],
  "Движение материала": ["Создать", "Редактировать", "Просмотр", "Экспорт", "Печать"],
  "Шихтовые карты": ["Создать", "Редактировать", "Просмотр", "Экспорт"],
  "Подотчётники": ["Просмотр"],
  "Отчётность": ["Просмотр", "Экспорт"],
  "Справочники": ["Просмотр"],
  "Логирование": ["Просмотр"],
  "Панель администрирования": [],
};

function NewRoleModal({ onClose, onSave }: { onClose: () => void; onSave: (r: Role) => void }) {
  const [roleName, setRoleName] = useState("");
  const [perms, setPerms] = useState<Record<string, Set<string>>>(
    Object.fromEntries(sections.map(s => [s, new Set(defaultPerms[s])]))
  );

  const toggle = (section: string, perm: string) => {
    setPerms(prev => {
      const s = new Set(prev[section]);
      s.has(perm) ? s.delete(perm) : s.add(perm);
      return { ...prev, [section]: s };
    });
  };

  return (
    <Modal
      title="Новая роль"
      onClose={onClose}
      extraWide
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
          <Btn onClick={() => onSave({ id: `r-${Date.now()}`, name: roleName || "Новая роль", active: true })}>
            Сохранить
          </Btn>
        </>
      }
    >
      <div className="mb-5">
        <Field label="Наименование роли"><Input value={roleName} onChange={setRoleName} placeholder="Введите наименование роли" /></Field>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs">Раздел системы</th>
              {permissions.map(p => (
                <th key={p} className="px-3 py-2 text-center font-medium text-gray-500 text-xs">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sections.map(sec => (
              <tr key={sec} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">{sec}</td>
                {permissions.map(perm => (
                  <td key={perm} className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={perms[sec]?.has(perm) || false}
                      onChange={() => toggle(sec, perm)}
                    />
                  </td>
                ))}
              </tr>
            ))}
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
  const [showNew, setShowNew] = useState(false);

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
          <Btn variant="secondary" onClick={onBack}>← Назад к пользователям</Btn>
          <Btn onClick={() => setShowNew(true)}>+ Создать роль</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {roles.map(role => (
          <div key={role.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{role.name}</h3>
                {role.active && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Активная роль
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <EyeIcon onClick={() => show(`Роль: ${role.name}`)} />
                <button
                  onClick={() => confirm(`Удалить роль «${role.name}»?`, () => setRoles(prev => prev.filter(r => r.id !== role.id)))}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <NewRoleModal
          onClose={() => setShowNew(false)}
          onSave={r => { setRoles(prev => [...prev, r]); setShowNew(false); show("Роль создана"); }}
        />
      )}
      {confirmState && <ConfirmDialog message={confirmState.message} onConfirm={doConfirm} onCancel={cancel} />}
      {toast && <Toast message={toast} onDone={clear} />}
    </div>
  );
}

export function PanelAdmin() {
  const { users, setUsers } = useApp();
  const { toast, show, clear } = useToast();
  const { confirmState, confirm, cancel, doConfirm } = useConfirm();
  const [showRoles, setShowRoles] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);

  if (showRoles) {
    return <RolesPage onBack={() => setShowRoles(false)} />;
  }

  return (
    <div>
      <PageHeader
        title="Панель администрирования"
        subtitle="Управление пользователями и ролями"
        breadcrumb={["Администрирование", "Пользователи"]}
        actions={
          <>
            <Btn onClick={() => setShowNewUser(true)}>+ Добавить пользователя</Btn>
            <Btn variant="secondary" onClick={() => setShowRoles(true)}>Управление ролями</Btn>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">ФИО</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Роль</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Статус доступа</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-gray-600">{user.role}</td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3"><Badge label={user.status} /></td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <EyeIcon onClick={() => show(`Пользователь: ${user.name}`)} />
                  <EditIcon onClick={() => setEditUser(user)} />
                </td>
              </tr>
            ))}
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
