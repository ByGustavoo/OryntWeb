import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { Botao, Flutuante } from '@/componentes/ui';
import type { PlanoExecucaoDTO } from '@/modelos/planos';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { planoEmJson, planoEmTexto } from '@/regras/planoExecucao';
import { copiarTexto } from '@/utilitarios/areaTransferencia';
import { focaveisVisiveis } from '@/utilitarios/foco';
import estilos from './MenuExportarCsv.module.css';

type FormatoDoPlano = 'TEXTO' | 'JSON';

interface MenuCopiarPlanoProps {
  plano: PlanoExecucaoDTO;
}

const formatos: { formato: FormatoDoPlano; rotulo: string; descricao: string }[] = [
  { formato: 'TEXTO', rotulo: 'Texto', descricao: 'Como o psql mostra. Serve para o explain.depesz.com.' },
  { formato: 'JSON', rotulo: 'JSON', descricao: 'O formato JSON do EXPLAIN. Serve para o PEV2 e outras ferramentas.' },
];

const escrever: Record<FormatoDoPlano, (plano: PlanoExecucaoDTO) => string> = {
  TEXTO: planoEmTexto,
  JSON: planoEmJson,
};

const DURACAO_CONFIRMACAO_MS = 2400;
const passoDaTecla: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

export function MenuCopiarPlano({ plano }: MenuCopiarPlanoProps) {
  const notificacoes = useNotificacoes();
  const gatilho = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState<FormatoDoPlano | null>(null);

  const fechar = useCallback((devolverFoco: boolean) => {
    setAberto(false);
    if (devolverFoco) gatilho.current?.focus();
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const quadro = requestAnimationFrame(() => menu.current?.querySelector('button')?.focus());
    return () => cancelAnimationFrame(quadro);
  }, [aberto]);

  useEffect(() => {
    if (!copiado) return;
    const temporizador = window.setTimeout(() => setCopiado(null), DURACAO_CONFIRMACAO_MS);
    return () => window.clearTimeout(temporizador);
  }, [copiado]);

  const escolher = async (formato: FormatoDoPlano) => {
    fechar(true);
    if (await copiarTexto(escrever[formato](plano))) {
      setCopiado(formato);
      return;
    }
    notificacoes.erro(
      'Não foi possível copiar o plano',
      'O navegador bloqueou a área de transferência. Tente de novo depois de clicar na página.',
    );
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
        tamanho="sm"
        icone={copiado ? Check : Copy}
        iconeDireita={ChevronDown}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
      >
        {copiado ? 'Copiado' : 'Copiar plano'}
      </Botao>
      <span className="visualmente-oculto" role="status">
        {copiado ? `Plano copiado em ${copiado === 'JSON' ? 'JSON' : 'texto'} para a área de transferência.` : ''}
      </span>

      <Flutuante aberto={aberto} ancora={gatilho} aoFechar={fechar} rotulo="Formato do plano copiado" alinhamento="fim">
        <div ref={menu} className={estilos.menu} onKeyDown={andarPelasOpcoes}>
          <p className={estilos.titulo}>Formato</p>
          {formatos.map(({ formato, rotulo, descricao }) => (
            <button key={formato} type="button" className={estilos.opcao} onClick={() => void escolher(formato)}>
              <span className={estilos.rotulo}>{rotulo}</span>
              <span className={estilos.descricao}>{descricao}</span>
            </button>
          ))}
        </div>
      </Flutuante>
    </>
  );
}
