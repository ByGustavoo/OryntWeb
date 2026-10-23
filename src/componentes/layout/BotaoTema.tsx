import { Moon, Sun } from 'lucide-react';
import { Dica } from '@/componentes/ui';
import { useTema } from '@/provedores/ProvedorTema';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './BotaoTema.module.css';

export function BotaoTema() {
  const { tema, alternarTema } = useTema();
  const escuro = tema === 'escuro';
  const rotulo = escuro ? 'Usar tema claro' : 'Usar tema escuro';

  return (
    <Dica conteudo={rotulo} lado="baixo">
      <button type="button" className={estilos.botao} onClick={alternarTema} aria-label={rotulo}>
        <span className={estilos.palco} aria-hidden="true">
          <Sun data-transicao-propria className={juntarClasses(estilos.icone, estilos.sol, !escuro && estilos.oculto)} size={18} strokeWidth={2} />
          <Moon data-transicao-propria className={juntarClasses(estilos.icone, estilos.lua, escuro && estilos.oculto)} size={18} strokeWidth={2} />
        </span>
      </button>
    </Dica>
  );
}
