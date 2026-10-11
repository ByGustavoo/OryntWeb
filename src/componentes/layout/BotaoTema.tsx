import { Moon, Sun } from 'lucide-react';
import { useTema } from '@/provedores/ProvedorTema';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './BotaoTema.module.css';

export function BotaoTema() {
  const { tema, alternarTema } = useTema();
  const escuro = tema === 'escuro';
  const rotulo = escuro ? 'Usar tema claro' : 'Usar tema escuro';

  return (
    <button type="button" className={estilos.botao} onClick={alternarTema} aria-label={rotulo} title={rotulo}>
      <span className={estilos.palco} aria-hidden="true">
        <Sun data-transicao-propria className={juntarClasses(estilos.icone, estilos.sol, !escuro && estilos.oculto)} size={18} strokeWidth={2} />
        <Moon data-transicao-propria className={juntarClasses(estilos.icone, estilos.lua, escuro && estilos.oculto)} size={18} strokeWidth={2} />
      </span>
    </button>
  );
}
