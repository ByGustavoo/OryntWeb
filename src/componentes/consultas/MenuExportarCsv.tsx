import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { Botao, Flutuante } from '@/componentes/ui';
import { descricaoPadraoNumerico, padroesNumericos, rotuloPadraoNumerico } from '@/regras/exportacaoRelatorio';
import type { PadraoNumerico } from '@/regras/exportacaoRelatorio';
import { focaveisVisiveis } from '@/utilitarios/foco';
import estilos from './MenuExportarCsv.module.css';

interface MenuExportarCsvProps {
  exportando: boolean;
  desabilitado: boolean;
  aoExportar: (padrao: PadraoNumerico) => void;
  className?: string;
}

const passoDaTecla: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

export function MenuExportarCsv({ exportando, desabilitado, aoExportar, className }: MenuExportarCsvProps) {
  const gatilho = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);

  const fechar = useCallback((devolverFoco: boolean) => {
    setAberto(false);
    if (devolverFoco) gatilho.current?.focus();
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const quadro = requestAnimationFrame(() => menu.current?.querySelector('button')?.focus());
    return () => cancelAnimationFrame(quadro);
  }, [aberto]);

  const escolher = (padrao: PadraoNumerico) => {
    fechar(true);
    aoExportar(padrao);
  };

  const andarPelasOpcoes = (evento: KeyboardEvent<HTMLDivElement>) => {
    const passo = passoDaTecla[evento.key];
    if (!passo || !menu.current) return;
    evento.preventDefault();
    const opcoes = focaveisVisiveis(menu.current);
    const atual = opcoes.indexOf(document.activeElement as HTMLElement);
    opcoes[(atual + passo + opcoes.length) % opcoes.length]?.focus();
  };

  return (
    <>
      <Botao
        ref={gatilho}
        variante="secundario"
        icone={Download}
        iconeDireita={ChevronDown}
        className={className}
        carregando={exportando}
        disabled={desabilitado}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
      >
        Exportar CSV
      </Botao>

      <Flutuante aberto={aberto} ancora={gatilho} aoFechar={fechar} rotulo="Padrão dos números do arquivo CSV" alinhamento="fim">
        <div ref={menu} className={estilos.menu} onKeyDown={andarPelasOpcoes}>
          <p className={estilos.titulo}>Padrão dos números</p>
          {padroesNumericos.map((padrao) => (
            <button key={padrao} type="button" className={estilos.opcao} onClick={() => escolher(padrao)}>
              <span className={estilos.rotulo}>{rotuloPadraoNumerico[padrao]}</span>
              <span className={estilos.descricao}>{descricaoPadraoNumerico[padrao]}</span>
            </button>
          ))}
        </div>
      </Flutuante>
    </>
  );
}
