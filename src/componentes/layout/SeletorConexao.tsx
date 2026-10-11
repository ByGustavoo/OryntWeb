import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronsUpDown, CloudOff, Database, FlaskConical, Settings2, Unplug } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ListaConexoesSalvas } from '@/componentes/conexao/ListaConexoesSalvas';
import { Flutuante, IndicadorGiratorio, Selo } from '@/componentes/ui';
import type { ConexaoDTO, ConexaoSalvaDTO } from '@/modelos/conexao';
import { rotuloTipoBanco } from '@/modelos/rotulos';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { enderecoConexao } from '@/regras/conexoesSalvas';
import { caminhos } from '@/rotas/caminhos';
import { focaveisVisiveis } from '@/utilitarios/foco';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './SeletorConexao.module.css';

interface ResumoConexao {
  icone: LucideIcon | null;
  ativa: boolean;
  nome: string;
  detalhe: string;
  dica?: string;
}

interface EntradaResumo {
  situacao: SituacaoConexao;
  conexao: ConexaoDTO | null;
  alvo: ConexaoSalvaDTO | null;
  quantidadeSalvas: number;
}

function resumir({ situacao, conexao, alvo, quantidadeSalvas }: EntradaResumo): ResumoConexao {
  if (conexao) {
    return {
      icone: alvo ? null : Database,
      ativa: true,
      nome: conexao.nome,
      detalhe: alvo ? `Trocando para ${alvo.nome}…` : rotuloTipoBanco[conexao.tipoBanco],
      dica: enderecoConexao(conexao),
    };
  }
  if (situacao === 'INDISPONIVEL') {
    return { icone: CloudOff, ativa: false, nome: 'Conexão não verificada', detalhe: 'O Orynt não respondeu' };
  }
  if (situacao === 'DESCONECTADA') {
    return {
      icone: Unplug,
      ativa: false,
      nome: 'Sem conexão',
      detalhe: quantidadeSalvas > 0 ? 'Escolha uma conexão salva' : 'Nenhum banco conectado',
    };
  }
  return {
    icone: null,
    ativa: true,
    nome: alvo?.nome ?? 'Verificando a conexão…',
    detalhe: alvo ? 'Conectando…' : 'Aguarde um instante',
    dica: alvo ? enderecoConexao(alvo) : undefined,
  };
}

export function SeletorConexao() {
  const { situacao, conexao, salvas, alvo, ativarConexao } = useConexao();
  const [aberto, setAberto] = useState(false);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const resumo = resumir({ situacao, conexao, alvo, quantidadeSalvas: salvas.length });
  const Icone = resumo.icone;
  const temMenu = salvas.length > 0;
  const semNadaParaMostrar = situacao === 'DESCONECTADA' && !temMenu;

  const fechar = useCallback((devolverFoco: boolean) => {
    setAberto(false);
    if (devolverFoco) gatilhoRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const quadro = requestAnimationFrame(() => {
      const menu = menuRef.current;
      if (!menu) return;
      (menu.querySelector<HTMLElement>('[aria-current]') ?? focaveisVisiveis(menu)[0])?.focus();
    });
    return () => cancelAnimationFrame(quadro);
  }, [aberto]);

  const aoTeclarNoMenu = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return;
    const itens = menuRef.current ? focaveisVisiveis(menuRef.current) : [];
    if (itens.length === 0) return;
    evento.preventDefault();
    const atual = itens.findIndex((item) => item === document.activeElement);
    const passo = evento.key === 'ArrowDown' ? 1 : -1;
    itens[(atual + passo + itens.length) % itens.length]?.focus();
  };

  const escolher = (salva: ConexaoSalvaDTO) => {
    fechar(true);
    if (salva.id !== conexao?.id) void ativarConexao(salva);
  };

  if (semNadaParaMostrar) return null;

  const conteudo = (
    <>
      <span className={juntarClasses(estilos.icone, !resumo.ativa && estilos.iconeNeutro)} aria-hidden="true">
        {Icone ? <Icone size={16} strokeWidth={2} /> : <IndicadorGiratorio tamanho={16} />}
      </span>
      <span className={estilos.textos}>
        <span className="visualmente-oculto">Conexão: </span>
        <span className={estilos.nome}>{resumo.nome}</span>
        <span className={estilos.detalhe}>
          <span className="visualmente-oculto">, </span>
          {resumo.detalhe}
        </span>
      </span>
    </>
  );

  return (
    <div className={estilos.seletor}>
      {temMenu ? (
        <button
          ref={gatilhoRef}
          type="button"
          className={estilos.gatilho}
          title={resumo.dica}
          aria-haspopup="dialog"
          aria-expanded={aberto}
          onClick={() => setAberto(!aberto)}
        >
          {conteudo}
          <ChevronsUpDown className={estilos.seta} size={14} strokeWidth={2} aria-hidden="true" />
          <span className="visualmente-oculto">. Trocar de conexão</span>
        </button>
      ) : (
        <div className={estilos.indicador} title={resumo.dica}>
          {conteudo}
        </div>
      )}

      {conexao?.simulada ? (
        <>
          <Selo
            tom="aviso"
            icone={FlaskConical}
            className={estilos.estado}
            titulo="Demonstração: nenhum banco real está sendo acessado."
          >
            <span className="visualmente-oculto">Estado: </span>
            Demonstração
          </Selo>
          <span className={estilos.estadoCompacto} role="img" aria-label="Estado: demonstração, conexão simulada">
            <FlaskConical size={14} strokeWidth={2.25} aria-hidden="true" />
          </span>
        </>
      ) : conexao ? (
        <Selo tom="sucesso" ponto className={estilos.estado}>
          <span className="visualmente-oculto">Estado: </span>
          Conectada
        </Selo>
      ) : null}

      <Flutuante aberto={aberto} ancora={gatilhoRef} aoFechar={fechar} rotulo="Trocar de conexão" larguraMinimaDaAncora>
        <div ref={menuRef} className={estilos.menu} onKeyDown={aoTeclarNoMenu}>
          <p className={estilos.tituloMenu}>Conexões salvas</p>
          <ListaConexoesSalvas
            rotulo="Conexões salvas"
            conexoes={salvas}
            idAtiva={conexao?.id ?? null}
            idConectando={alvo?.id ?? null}
            aoEscolher={escolher}
            semMoldura
            className={estilos.listaMenu}
          />
          <div className={estilos.rodapeMenu}>
            <Link to={caminhos.configuracoes} className={estilos.gerenciar} onClick={() => setAberto(false)}>
              <Settings2 size={16} strokeWidth={2} aria-hidden="true" />
              Gerenciar conexões
            </Link>
          </div>
        </div>
      </Flutuante>
    </div>
  );
}
