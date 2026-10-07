import React from "react";
import { Link } from "react-router";
import { useApp } from "../store/AppContext";
import { PageHeader } from "../components/ui";
import { LOGIN_PATH, PAGE_PATHS as P } from "../router";
import { SPRAV_SLUGS } from "./Spravochniki";

// ── Карта экранов ─────────────────────────────────────────────────────────────
// Все экраны приложения с прямыми ссылками — для импорта страниц сайта в Figma.
// Ссылки на записи строятся по первым элементам тестовых данных.

type Screen = { title: string; path: string };
type Group = { title: string; screens: Screen[] };

export function useScreenGroups(): Group[] {
  const { gpItems, dmItems, skladDocs, vydachaDocs, operations, shihtovyeKarty, podotchetniki, logs, users, roles, storageLocations } = useApp();
  const opVydano = operations.find(o => o.stage === "Выдано") ?? operations[0];
  const opVozvrat = operations.find(o => o.stage === "Возврат: На редактировании") ?? operations[0];
  const opDone = operations.find(o => o.stage === "Завершено") ?? operations[0];
  const prihodOrder = skladDocs.find(d => d.type === "Приходный ордер") ?? skladDocs[0];
  const prihodNaklad = skladDocs.find(d => d.type !== "Приходный ордер") ?? skladDocs[0];
  const gp = gpItems[0];
  const dm = dmItems[0];
  const karta = shihtovyeKarty.find(k => k.status === "Новая") ?? shihtovyeKarty[0];
  const kartaRed = shihtovyeKarty.find(k => k.status === "Редактирование");
  const person = podotchetniki[0];
  const log = logs.find(l => (l.before?.length ?? 0) + (l.after?.length ?? 0) > 0) ?? logs[0];
  const S = SPRAV_SLUGS;
  const sprav = (slug: string) => `${P["spravochniki"]}/${slug}`;

  const groups: Group[] = [
    { title: "Общее", screens: [
      { title: "Вход в систему", path: LOGIN_PATH },
      { title: "Главная", path: P["dashboard"] },
      { title: "Смена пароля", path: `${P["dashboard"]}?modal=smena-parolya` },
    ] },
    { title: "Склады", screens: [
      { title: "Склады", path: P["sklady-hub"] },
      { title: "Остатки на складе ГП", path: P["ostatok-gp"] },
      gp && { title: "Просмотр позиции ГП", path: `${P["ostatok-gp"]}/view/${gp.id}` },
      { title: "ГП: приём на склад", path: `${P["ostatok-gp"]}/prihod` },
      { title: "ГП: выдача со склада", path: `${P["ostatok-gp"]}/vydacha` },
      { title: "ГП: выдача — подбор позиций", path: `${P["ostatok-gp"]}/vydacha/pick` },
      { title: "Остатки на складе ДМ", path: P["ostatok-dm"] },
      dm && { title: "Просмотр позиции ДМ", path: `${P["ostatok-dm"]}/view/${dm.id}` },
      { title: "ДМ: объединение позиций", path: `${P["ostatok-dm"]}/merge` },
      { title: "ДМ: приём — приходный ордер", path: `${P["ostatok-dm"]}/prihod` },
      { title: "ДМ: приём — накладная", path: `${P["ostatok-dm"]}/prihod/nakladnaya` },
      { title: "ДМ: приём — добавить позицию", path: `${P["ostatok-dm"]}/prihod/position-new` },
      { title: "ДМ: приём — просмотр позиции", path: `${P["ostatok-dm"]}/prihod/position/po-1` },
      { title: "ДМ: приём — редактирование позиции", path: `${P["ostatok-dm"]}/prihod/position-edit/po-1` },
      { title: "ДМ: выдача со склада", path: `${P["ostatok-dm"]}/vydacha` },
      { title: "ДМ: выдача — подбор позиций", path: `${P["ostatok-dm"]}/vydacha/pick` },
    ].filter(Boolean) as Screen[] },
    { title: "Складские операции", screens: [
      { title: "Складские операции", path: P["sklad-oper-hub"] },
      { title: "Приход на склад", path: P["prihod-list"] },
      { title: "Приход: новый документ", path: `${P["prihod-list"]}/new` },
      { title: "Приход: новая накладная", path: `${P["prihod-list"]}/new/nakladnaya` },
      prihodOrder && { title: "Приход: просмотр ордера", path: `${P["prihod-list"]}/view/${prihodOrder.id}` },
      prihodOrder && { title: "Приход: редактирование ордера", path: `${P["prihod-list"]}/edit/${prihodOrder.id}` },
      prihodNaklad && prihodNaklad !== prihodOrder && { title: "Приход: просмотр накладной", path: `${P["prihod-list"]}/view/${prihodNaklad.id}` },
      { title: "Печать ярлыков ДМ", path: `${P["prihod-list"]}/labels` },
      { title: "Выдача со склада", path: P["vydacha-list"] },
      { title: "Выдача: новый документ (ГП)", path: `${P["vydacha-list"]}/new` },
      { title: "Выдача: новый документ (ДМ)", path: `${P["vydacha-list"]}/new/dm` },
      { title: "Выдача: подбор позиций", path: `${P["vydacha-list"]}/new/pick` },
      vydachaDocs[0] && { title: "Выдача: просмотр документа", path: `${P["vydacha-list"]}/view/${vydachaDocs[0].id}` },
      vydachaDocs[0] && { title: "Выдача: редактирование документа", path: `${P["vydacha-list"]}/edit/${vydachaDocs[0].id}` },
    ].filter(Boolean) as Screen[] },
    { title: "Движение материала", screens: [
      { title: "Реестр операций", path: P["dvizhenie-mat"] },
      { title: "Новая операция", path: `${P["dvizhenie-mat"]}/new` },
      { title: "Новая операция — добавить позицию ДМ со склада", path: `${P["dvizhenie-mat"]}/new/add-position` },
      { title: "Новая операция — выдача по шихтовой карте", path: `${P["dvizhenie-mat"]}/new/shihta-pick` },
      opVydano && { title: "Операция: просмотр (выдано)", path: `${P["dvizhenie-mat"]}/view/${opVydano.id}` },
      opVydano && { title: "Операция: оформление возврата", path: `${P["dvizhenie-mat"]}/edit/${opVydano.id}?tab=vozvrat` },
      opVozvrat && { title: "Возврат — вкладка «Выдача»", path: `${P["dvizhenie-mat"]}/edit/${opVozvrat.id}?tab=vydacha` },
      opVozvrat && { title: "Возврат — вкладка «Возврат»", path: `${P["dvizhenie-mat"]}/edit/${opVozvrat.id}?tab=vozvrat` },
      opVozvrat && { title: "Возврат — добавить позицию возврата", path: `${P["dvizhenie-mat"]}/edit/${opVozvrat.id}/vozvrat-pick?tab=vozvrat` },
      opVozvrat && { title: "Возврат — новая позиция ДМ", path: `${P["dvizhenie-mat"]}/edit/${opVozvrat.id}/vozvrat-pick/new-position?tab=vozvrat` },
      opVozvrat && { title: "Возврат — вкладка «Списание»", path: `${P["dvizhenie-mat"]}/edit/${opVozvrat.id}?tab=spisanie` },
      opVozvrat && { title: "Возврат — вкладка «Итого»", path: `${P["dvizhenie-mat"]}/edit/${opVozvrat.id}?tab=itogo` },
      opVozvrat && { title: "Возврат — списание разницы", path: `${P["dvizhenie-mat"]}/edit/${opVozvrat.id}/spisanie-raznicy?tab=itogo` },
      opDone && { title: "Операция: просмотр (завершено)", path: `${P["dvizhenie-mat"]}/view/${opDone.id}?tab=itogo` },
    ].filter(Boolean) as Screen[] },
    { title: "Шихтовые карты", screens: [
      { title: "Реестр шихтовых карт", path: P["shihtovye-karty"] },
      { title: "Новая шихтовая карта", path: `${P["shihtovye-karty"]}/new` },
      { title: "Новая карта — добавить со склада", path: `${P["shihtovye-karty"]}/new/from-sklad` },
      { title: "Новая карта — доп. материал", path: `${P["shihtovye-karty"]}/new/dop-material` },
      karta && { title: "Карта: просмотр", path: `${P["shihtovye-karty"]}/view/${karta.id}` },
      kartaRed && { title: "Карта: редактирование (черновик)", path: `${P["shihtovye-karty"]}/edit/${kartaRed.id}` },
      kartaRed && { title: "Карта: результат расчёта", path: `${P["shihtovye-karty"]}/edit/${kartaRed.id}/raschet` },
    ].filter(Boolean) as Screen[] },
    { title: "Подотчётники", screens: [
      { title: "Реестр подотчётников", path: P["podotchetniki"] },
      person && { title: "Карточка: текущие процессы", path: `${P["podotchetniki"]}/${person.id}` },
      person && { title: "Карточка: завершённые процессы", path: `${P["podotchetniki"]}/${person.id}?tab=zavershennye` },
    ].filter(Boolean) as Screen[] },
    { title: "Отчётность", screens: [
      { title: "Отчётность", path: P["otchetnost"] },
      { title: "Акт по итогам инвентаризации НЗП", path: `${P["otchetnost"]}/report/akt-nzp` },
      { title: "Опись хранения драгоценных камней", path: `${P["otchetnost"]}/report/opis-kamney` },
      { title: "Накладные", path: `${P["otchetnost"]}/report/nakladnye` },
      { title: "Инвентаризационная опись ДМ", path: `${P["otchetnost"]}/inv-opis` },
      { title: "Инвентаризационная опись ДМ — сформирована", path: `${P["otchetnost"]}/inv-opis/sformirovana` },
    ] },
    { title: "Справочники", screens: [
      { title: "Справочники", path: P["spravochniki"] },
      ...Object.entries(S).map(([name, slug]) => ({ title: name, path: sprav(slug) })),
      { title: "Типы документов — добавить запись", path: `${sprav(S["Типы документов"])}/new` },
      { title: "Типы документов — редактировать запись", path: `${sprav(S["Типы документов"])}/edit/${encodeURIComponent("ПО")}` },
      { title: "Коды материалов — добавить запись", path: `${sprav(S["Коды материалов"])}/new` },
      { title: "Классы материалов — просмотр", path: `${sprav(S["Классы материалов"])}/view/${encodeURIComponent("Сл")}` },
      { title: "Классы материалов — добавить запись", path: `${sprav(S["Классы материалов"])}/new` },
      { title: "Места хранения — добавить", path: `${sprav(S["Места хранения"])}/new` },
      storageLocations[0] && { title: "Места хранения — просмотр", path: `${sprav(S["Места хранения"])}/view/${storageLocations[0].id}` },
      { title: "Химический состав — добавить запись", path: `${sprav(S["Химический состав"])}/new` },
      { title: "Химический состав — просмотр", path: `${sprav(S["Химический состав"])}/view/au` },
      { title: "Химический состав — редактирование", path: `${sprav(S["Химический состав"])}/edit/au` },
      storageLocations[0] && { title: "Места хранения — редактирование", path: `${sprav(S["Места хранения"])}/edit/${storageLocations[0].id}` },
    ].filter(Boolean) as Screen[] },
    { title: "Логирование", screens: [
      { title: "Журнал событий", path: P["logirovanie"] },
      log && { title: "Событие: было / стало", path: `${P["logirovanie"]}/view/${log.id}` },
    ].filter(Boolean) as Screen[] },
    { title: "Администрирование", screens: [
      { title: "Пользователи", path: P["admin-users"] },
      { title: "Новый пользователь", path: `${P["admin-users"]}/new` },
      users[0] && { title: "Редактирование пользователя", path: `${P["admin-users"]}/edit/${users[0].id}` },
      { title: "Роли и разрешения", path: P["admin-roles"] },
      { title: "Новая роль", path: `${P["admin-roles"]}/new` },
      roles[0] && { title: "Роль: просмотр", path: `${P["admin-roles"]}/view/${roles[0].id}` },
      roles[0] && { title: "Роль: редактирование", path: `${P["admin-roles"]}/edit/${roles[0].id}` },
      { title: "Настройки", path: P["admin-settings"] },
    ].filter(Boolean) as Screen[] },
  ];
  return groups;
}

export function Ekrany() {
  const groups = useScreenGroups();
  const total = groups.reduce((n, g) => n + g.screens.length, 0);

  return (
    <div>
      <PageHeader title="Карта экранов" subtitle={`${total} экранов — у каждого свой адрес`} breadcrumb={["Карта экранов"]} />
      <div className="grid grid-cols-2 gap-4">
        {groups.map(g => (
          <div key={g.title} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">{g.title}</div>
            <ul className="divide-y divide-gray-100">
              {g.screens.map(sc => (
                <li key={sc.path} className="px-4 py-2 flex items-center justify-between gap-3 text-sm">
                  <Link to={sc.path} className="text-blue-600 hover:underline">{sc.title}</Link>
                  <code className="text-xs text-gray-400 truncate">{sc.path}</code>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
