import { useState } from "react";
import { RefreshCw, Copy, Check, KeyRound } from "lucide-react";
import { useApp, generatePassword } from "../store/AppContext";

// Предложение сгенерированного пароля по парольной политике.
// «Использовать» подставляет пароль в поля «Новый пароль» и «Повтор пароля».
export default function PasswordSuggest({ onUse }: { onUse: (pwd: string) => void }) {
  const { securityPolicy } = useApp();
  const [pwd, setPwd] = useState(() => generatePassword(securityPolicy));
  const [copied, setCopied] = useState(false);

  const regenerate = () => { setPwd(generatePassword(securityPolicy)); setCopied(false); };
  const copy = () => {
    navigator.clipboard?.writeText(pwd).then(() => setCopied(true), () => {});
  };

  return (
    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
      <KeyRound className="w-4 h-4 text-blue-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-blue-700 leading-tight">Предлагаемый пароль</div>
        <div className="font-mono text-sm text-gray-900 truncate select-all">{pwd}</div>
      </div>
      <button type="button" onClick={regenerate} title="Сгенерировать другой" className="p-1.5 rounded-md text-blue-600 hover:bg-blue-100 transition-colors">
        <RefreshCw className="w-4 h-4" />
      </button>
      <button type="button" onClick={copy} title="Скопировать" className="p-1.5 rounded-md text-blue-600 hover:bg-blue-100 transition-colors">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
      <button type="button" onClick={() => onUse(pwd)} className="px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors whitespace-nowrap">
        Использовать
      </button>
    </div>
  );
}
