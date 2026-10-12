import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, LogOut, Settings2 } from 'lucide-react';
import { descreverFalha } from '@/api/tratamentoErros';
import { ListaConexoesSalvas } from '@/componentes/conexao/ListaConexoesSalvas';
import { ResumoConexao } from '@/componentes/conexao/ResumoConexao';
import { Flutuante, IndicadorGiratorio, Selo } from '@/componentes/ui';
import type { ConexaoSalvaDTO } from '@/modelos/conexao';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { inicialDoUsuario } from '@/regras/inicialUsuario';
import { caminhos } from '@/rotas/caminhos';
import estilos from './MenuConta.module.css';

function descreverAusenciaDeConexao(situacao: SituacaoConexao, alvo: ConexaoSalvaDTO | null): string {
  if (alvo) return `Conectando a ${alvo.nome}…`;
  if (situacao === 'INDISPONIVEL') return 'Não foi possível verificar a conexão.';
  return 'Nenhum banco conectado.';
}

export function MenuConta() {
  const { usuario, sair } = useAutenticacao();
  const { situacao, conexao, salvas, alvo, ativarConexao } = useConexao();
  const notificacoes = useNotificacoes();
  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fechar = useCallback((devolverFoco: boolean) => {
    setAberto(false);
    if (devolverFoco) gatilhoRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const quadro = requestAnimationFrame(() => menuRef.current?.focus());
    return () => cancelAnimationFrame(quadro);
  }, [aberto]);

  if (!usuario) return null;

  const inicial = inicialDoUsuario(usuario);
  const outrasConexoes = salvas.filter((salva) => salva.id !== conexao?.id);
  const tituloOutrasConexoes = conexao ? 'Trocar de conexão' : 'Conexões salvas';

  const escolher = (salva: ConexaoSalvaDTO) => {
    menuRef.current?.focus();
    void ativarConexao(salva);
  };

  const encerrar = async () => {
    if (saindo) return;
    setSaindo(true);
    try {
      await sair();
    } catch (erro) {
      setSaindo(false);
      notificacoes.erro('Não foi possível sair.', descreverFalha(erro));
    }
  };

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        className={estilos.gatilho}
        title={aberto ? undefined : 'Conta e conexão'}
        aria-label={`Conta de ${usuario.email} e conexão em uso`}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
      >
        <span className={estilos.avatar} aria-hidden="true">
          {inicial}
        </span>
      </button>

      <Flutuante aberto={aberto} ancora={gatilhoRef} aoFechar={fechar} rotulo="Conta e conexão" alinhamento="fim">
        <div ref={menuRef} className={estilos.menu} tabIndex={-1}>
          <div className={estilos.conta}>
            <span className={estilos.avatarConta} aria-hidden="true">
              {inicial}
            </span>
            <div className={estilos.identidade}>
              <p className={estilos.nome}>{usuario.nome}</p>
              <p className={estilos.email}>{usuario.email}</p>
            </div>
          </div>

          <div className={estilos.secao} role="group" aria-labelledby="titulo-conexao-menu-conta">
            <div className={estilos.cabecalhoSecao}>
              <p id="titulo-conexao-menu-conta" className={estilos.tituloSecao}>
                Conexão em uso
              </p>
              {conexao?.simulada ? (
                <Selo tom="aviso" icone={FlaskConical} titulo="Demonstração: nenhum banco real está sendo acessado.">
                  <span className="visualmente-oculto">Estado: </span>
                  Demonstração
                </Selo>
              ) : conexao ? (
                <Selo tom="sucesso" ponto>
                  <span className="visualmente-oculto">Estado: </span>
                  Conectada
                </Selo>
              ) : null}
            </div>
            {conexao ? (
              <ResumoConexao conexao={conexao} />
            ) : (
              <p className={estilos.semConexao} role="status">
                {descreverAusenciaDeConexao(situacao, alvo)}
              </p>
            )}
          </div>

          {outrasConexoes.length > 0 ? (
            <div className={estilos.secaoLista}>
              <p className={estilos.tituloLista}>{tituloOutrasConexoes}</p>
              <ListaConexoesSalvas
                rotulo={tituloOutrasConexoes}
                conexoes={outrasConexoes}
                idAtiva={null}
                idConectando={alvo?.id ?? null}
                aoEscolher={escolher}
                semMoldura
                className={estilos.lista}
              />
            </div>
          ) : null}

          <div className={estilos.rodape}>
            <Link to={caminhos.configuracoes} className={estilos.acao} onClick={() => setAberto(false)}>
              <Settings2 size={16} strokeWidth={2} aria-hidden="true" />
              Gerenciar conexões
            </Link>
            <button type="button" className={estilos.acao} onClick={encerrar} aria-busy={saindo || undefined}>
              {saindo ? (
                <IndicadorGiratorio tamanho={16} />
              ) : (
                <LogOut size={16} strokeWidth={2} aria-hidden="true" />
              )}
              {saindo ? 'Saindo…' : 'Sair'}
            </button>
          </div>
        </div>
      </Flutuante>
    </>
  );
}
