import { useLocation, useNavigate, useSearchParams } from "react-router";
import type { Page } from "./store/AppContext";

// ── Маршруты ──────────────────────────────────────────────────────────────────
// У каждого раздела свой путь, у модалок и вложенных экранов — именованные сегменты после него:
//   /dvizhenie-materiala/new                → новая операция
//   /dvizhenie-materiala/view/op1           → просмотр
//   /dvizhenie-materiala/edit/op1           → редактирование
//   /dvizhenie-materiala/new/add-position   → вложенная модалка поверх формы
// Вкладки — query-параметр ?tab=.

export const PAGE_PATHS: Record<Page, string> = {
  "dashboard": "/",
  "sklady-hub": "/sklady",
  "ostatok-gp": "/sklady/gp",
  "ostatok-dm": "/sklady/dm",
  "sklad-oper-hub": "/skladskie-operacii",
  "prihod-list": "/skladskie-operacii/prihod",
  "vydacha-list": "/skladskie-operacii/vydacha",
  "dvizhenie-mat": "/dvizhenie-materiala",
  "shihtovye-karty": "/shihtovye-karty",
  "podotchetniki": "/podotchetniki",
  "podotchetnik-card": "/podotchetniki",
  "otchetnost": "/otchetnost",
  "spravochniki": "/spravochniki",
  "spravochnik-detail": "/spravochniki",
  "logirovanie": "/logirovanie",
  "admin-users": "/admin/users",
  "admin-roles": "/admin/roles",
  "admin-settings": "/admin/settings",
};

export const LOGIN_PATH = "/login";
export const SCREENS_PATH = "/ekrany";

// Разделы с вложенными сегментами; более длинные пути — раньше, чтобы /sklady/dm не съел /sklady.
const SECTION_PAGES: Page[] = (Object.keys(PAGE_PATHS) as Page[])
  .filter(p => p !== "dashboard" && p !== "podotchetnik-card" && p !== "spravochnik-detail")
  .sort((a, b) => PAGE_PATHS[b].length - PAGE_PATHS[a].length);

const segsOf = (path: string) => path.split("/").filter(Boolean).map(s => decodeURIComponent(s));
const joinPath = (base: string, parts: string[]) =>
  (base === "/" ? "" : base) + (parts.length ? "/" + parts.map(encodeURIComponent).join("/") : "") || "/";

// Раздел (страница) по текущему адресу. depth — сколько сегментов адреса занимает сам раздел;
// остальные сегменты — экраны внутри него.
export function matchPage(pathname: string): { page: Page; base: string; depth: number; segs: string[] } {
  const segs = segsOf(pathname);
  for (const p of SECTION_PAGES) {
    const baseSegs = segsOf(PAGE_PATHS[p]);
    if (!baseSegs.every((s, i) => segs[i] === s)) continue;
    // Карточка подотчётника и страница справочника — первый сегмент после раздела
    if ((p === "podotchetniki" || p === "spravochniki") && segs.length > baseSegs.length) {
      const depth = baseSegs.length + 1;
      return { page: p === "podotchetniki" ? "podotchetnik-card" : "spravochnik-detail", base: joinPath("/", segs.slice(0, depth)), depth, segs };
    }
    return { page: p, base: PAGE_PATHS[p], depth: baseSegs.length, segs };
  }
  return { page: "dashboard", base: "/", depth: 0, segs };
}

export function pagePath(p: Page, params: Record<string, string> = {}): string {
  if (p === "podotchetnik-card") return `${PAGE_PATHS[p]}/${encodeURIComponent(params.id ?? "")}`;
  if (p === "spravochnik-detail") return `${PAGE_PATHS[p]}/${encodeURIComponent(params.dict ?? "")}`;
  return PAGE_PATHS[p];
}

// ── Экран внутри раздела ──────────────────────────────────────────────────────
// Сегменты после базового пути раздела работают как стек модалок:
// open(...) добавляет сегменты к текущему адресу, close(name) обрезает адрес до этого сегмента.

export function useScreen() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { base, depth, segs } = matchPage(pathname);
  const rest = segs.slice(depth);

  const go = (parts: string[], keepSearch: boolean) => navigate(joinPath(base, parts) + (keepSearch ? search : ""));

  return {
    base,
    rest,
    /** Открыт ли экран с этим сегментом */
    has: (name: string) => rest.includes(name),
    /** Значение сразу после сегмента (например, id после «view») */
    after: (name: string) => {
      const i = rest.indexOf(name);
      return i >= 0 ? rest[i + 1] : undefined;
    },
    /** Открыть вложенный экран поверх текущего */
    open: (...parts: string[]) => go([...rest, ...parts], true),
    /** Открыть экран раздела с нуля (из списка) */
    openTop: (...parts: string[]) => go(parts, false),
    /** Закрыть экран с этим сегментом и всё, что открыто поверх него */
    close: (name: string) => {
      const i = rest.indexOf(name);
      if (i < 0) return;
      const left = rest.slice(0, i);
      go(left, left.length > 0);
    },
    /** Заменить сегмент-флаг (переключатели вида внутри экрана) без новой записи истории */
    toggle: (name: string, on: boolean) => {
      if (on === rest.includes(name)) return;
      navigate(joinPath(base, on ? [...rest, name] : rest.filter(s => s !== name)) + search, { replace: true });
    },
  };
}

// Вкладка в адресе (?tab=slug). options — пары «подпись → slug».
export function useTabParam<T extends string>(options: Record<T, string>, fallback: T, key = "tab"): [T, (t: T) => void] {
  const [params, setParams] = useSearchParams();
  const slug = params.get(key);
  const current = (Object.keys(options) as T[]).find(t => options[t] === slug) ?? fallback;
  const set = (t: T) => setParams(prev => {
    const next = new URLSearchParams(prev);
    if (t === fallback) next.delete(key); else next.set(key, options[t]);
    return next;
  }, { replace: true });
  return [current, set];
}
