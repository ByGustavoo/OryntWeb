import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, CircleCheck, DatabaseBackup, HardDrive, History, OctagonX, Plus } from 'lucide-react';
import { AlertasDeBackup } from '@/componentes/backup/AlertasDeBackup';
import { ModalConexaoSalva } from '@/componentes/backup/ModalConexaoSalva';
import { ModalPlanoBackup } from '@/componentes/backup/ModalPlanoBackup';
import { SeloSituacaoExecucao } from '@/componentes/backup/SelosBackup';
import { EsqueletoIndicadores, GradeIndicadores } from '@/componentes/dashboard/GradeIndicadores';
import { IndicadorNumerico } from '@/componentes/dashboard/IndicadorNumerico';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { Panorama } from '@/componentes/objetos/Panorama';
import { Botao, CabecalhoPainel, ConteudoAssincrono, Esqueleto, EstadoVazio, Painel } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { usePlanoBackup } from '@/ganchos/usePlanoBackup';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import type { ResumoBackupDTO } from '@/modelos/backup';
import { useBackupLocal } from '@/provedores/ProvedorBackupLocal';
import { useConexao } from '@/provedores/ProvedorConexao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { descreverLocal } from '@/regras/acompanhamentoBackup';
import { rotuloSituacaoExecucao } from '@/regras/backup';
import { caminhos } from '@/rotas/caminhos';
import { servicoBackup } from '@/servicos';
import { formatarInstante, formatarNumero, formatarPercentual, formatarTamanho, formatarTempoAte, formatarTempoRelativo } from '@/utilitarios/formatacao';
import estilos from './PaginaBackup.module.css';

const QUANTIDADE_DE_INDICADORES = 6;
const LINHAS_DO_ESQUELETO = 4;

function Indicadores({ resumo }: { resumo: ResumoBackupDTO }) {
  const { ultimaExecucao: ultima, proximosAgendamentos, totalExecucoes, concluidas, falhas } = resumo;
  const { localDoDestino } = useBackupLocal();
  const proximo = proximosAgendamentos[0] ?? null;
  const taxa = totalExecucoes > 0 ? (concluidas / totalExecucoes) * 100 : 0;

  return (
    <GradeIndicadores colunas={3}>
      <IndicadorNumerico
        icone={DatabaseBackup}
        rotulo="Backups realizados"
        valor={totalExecucoes}
        formatar={formatarNumero}
        destino={{ para: caminhos.backupHistorico, descricao: 'ver todos no histórico' }}
        contexto="Em todas as conexões"
      />
      <IndicadorNumerico
        icone={History}
        rotulo="Último backup"
        valor={0}
        formatar={() => (ultima ? formatarTempoRelativo(ultima.iniciadaEm) : 'Nenhum')}
        tom={ultima?.situacao === 'FALHOU' ? 'aviso' : 'destaque'}
        contexto={ultima ? `${ultima.nome}: ${rotuloSituacaoExecucao[ultima.situacao].toLowerCase()}` : 'Nenhum backup foi feito ainda'}
      />
      <IndicadorNumerico
        icone={CalendarClock}
        rotulo="Próximo lembrete"
        valor={0}
        formatar={() => (proximo ? formatarTempoAte(proximo.quando) : 'Nenhum')}
        destino={{ para: caminhos.backupAgendamentos, descricao: 'ver os agendamentos' }}
        contexto={proximo ? proximo.nome : 'Nenhum agendamento ativo'}
      />
      <IndicadorNumerico
        icone={HardDrive}
        rotulo="Destino"
        valor={0}
        formatar={() => 'Seu computador'}
        contexto={descreverLocal(localDoDestino).replace(', no seu computador', '')}
      />
      <IndicadorNumerico
        icone={CircleCheck}
        rotulo="Concluídos"
        valor={concluidas}
        formatar={formatarNumero}
        tom="sucesso"
        destino={concluidas > 0 ? { para: caminhos.backupHistorico, estado: { historico: { situacao: 'CONCLUIDO' } }, descricao: 'ver os concluídos' } : undefined}
        contexto={totalExecucoes > 0 ? `${formatarPercentual(taxa)} dos backups` : 'Nenhum até agora'}
      />
      <IndicadorNumerico
        icone={OctagonX}
        rotulo="Com falha"
        valor={falhas}
        formatar={formatarNumero}
        tom={falhas > 0 ? 'aviso' : 'sucesso'}
        destino={falhas > 0 ? { para: caminhos.backupHistorico, estado: { historico: { situacao: 'FALHOU' } }, descricao: 'ver os que falharam' } : undefined}
        contexto={falhas > 0 ? `De ${formatarNumero(totalExecucoes)} backups no histórico` : 'Nenhuma falha registrada'}
      />
    </GradeIndicadores>
  );
}

function ListasDoResumo({ resumo }: { resumo: ResumoBackupDTO }) {
  return (
    <Panorama
      proporcao="equilibrada"
      figura={
        <Painel aria-labelledby="titulo-proximos-backups">
          <CabecalhoPainel
            titulo={<span id="titulo-proximos-backups">Próximos lembretes</span>}
            descricao="Quando o Orynt vai avisar, do mais próximo ao mais distante"
            acao={
              <Link to={caminhos.backupAgendamentos} className={estilos.atalho}>
                Ver todos
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            }
          />
          {resumo.proximosAgendamentos.length === 0 ? (
            <EstadoVazio compacto icone={CalendarClock} titulo="Nada agendado" descricao="Crie um lembrete para o Orynt avisar quando for a hora de fazer o backup." />
          ) : (
            <ul className={`${estilos.lista} ${estilos.listaFechada}`}>
              {resumo.proximosAgendamentos.map((proximo) => (
                <li key={proximo.agendamentoId} className={estilos.itemLista}>
                  <div className={estilos.textos}>
                    <span className={estilos.nome}>{proximo.nome}</span>
                    <span className={estilos.detalhe}>{proximo.descricaoDaFrequencia}</span>
                  </div>
                  <div className={estilos.lado}>
                    <span className="numeros">{formatarTempoAte(proximo.quando)}</span>
                    <span className={`${estilos.ladoSecundario} codigo`}>{proximo.banco}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      }
      pontos={
        <Painel aria-labelledby="titulo-ultimas-execucoes">
          <CabecalhoPainel
            titulo={<span id="titulo-ultimas-execucoes">Últimas execuções</span>}
            descricao="Os backups mais recentes, em todas as conexões"
            acao={
              <Link to={caminhos.backupHistorico} className={estilos.atalho}>
                Ver histórico
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            }
          />
          {resumo.ultimasExecucoes.length === 0 ? (
            <EstadoVazio compacto icone={History} titulo="Nenhuma execução ainda" descricao="Os backups aparecem aqui assim que você fizer o primeiro." />
          ) : (
            <ul className={estilos.lista}>
              {resumo.ultimasExecucoes.map((execucao) => (
                <li key={execucao.id} className={estilos.itemLista}>
                  <div className={estilos.textos}>
                    <span className={estilos.nome}>{execucao.nome}</span>
                    <span className={estilos.detalhe}>
                      {formatarInstante(execucao.iniciadaEm)}
                      {execucao.tamanhoBytes !== null ? ` · ${formatarTamanho(execucao.tamanhoBytes)}` : ''}
                    </span>
                  </div>
                  <SeloSituacaoExecucao situacao={execucao.situacao} progresso={execucao.progresso} />
                </li>
              ))}
            </ul>
          )}
        </Painel>
      }
    />
  );
}

function EsqueletoListas() {
  const painel = (
    <Painel aria-hidden="true">
      <Esqueleto largura="45%" altura={16} />
      <div className={estilos.lista}>
        {Array.from({ length: LINHAS_DO_ESQUELETO }, (_, indice) => (
          <div key={indice} className={estilos.itemLista}>
            <Esqueleto largura={`${60 - indice * 6}%`} />
            <Esqueleto largura={64} />
          </div>
        ))}
      </div>
    </Painel>
  );
  return <Panorama proporcao="equilibrada" figura={painel} pontos={painel} />;
}

export default function PaginaBackupResumo() {
  useTituloDocumento('Backup: Resumo');
  const { salvas, guardarSalva } = useConexao();
  const notificacoes = useNotificacoes();
  const { versao: versaoDosBackups } = useBackupLocal();
  const [versao, setVersao] = useState(0);
  const [cadastro, setCadastro] = useState({ vez: 0, aberto: false });
  const { plano, abrirNovo, fechar } = usePlanoBackup();
  const resumo = useDadosAssincronos((signal) => servicoBackup.buscarResumo(signal), [versao, versaoDosBackups, salvas.length]);
  const semConexoes = salvas.length === 0;

  return (
    <>
      <CabecalhoPagina
        titulo="Backup"
        descricao="Conecte seu PostgreSQL, escolha o que entra e salve o arquivo direto no seu computador. O Orynt não guarda nenhuma cópia."
        acoes={
          semConexoes ? undefined : (
            <Botao icone={Plus} onClick={() => abrirNovo()}>
              Novo backup
            </Botao>
          )
        }
      />
      <div className={estilos.blocos}>
        {semConexoes ? (
          <Painel>
            <EstadoVazio
              icone={DatabaseBackup}
              titulo="Nenhum banco para proteger ainda"
              descricao="Cadastre uma conexão PostgreSQL para fazer o primeiro backup. Ela fica salva sem trocar o banco que o Orynt está mostrando."
              acao={
                <Botao icone={Plus} onClick={() => setCadastro((atual) => ({ vez: atual.vez + 1, aberto: true }))}>
                  Cadastrar conexão
                </Botao>
              }
            />
          </Painel>
        ) : (
          <ConteudoAssincrono
            resultado={resumo}
            revelar={false}
            tituloErro="Não foi possível carregar o resumo dos backups"
            esqueleto={
              <>
                <EsqueletoIndicadores colunas={3} quantidade={QUANTIDADE_DE_INDICADORES} />
                <EsqueletoListas />
              </>
            }
          >
            {(dados) => (
              <div className={estilos.blocos}>
                <Indicadores resumo={dados} />
                <AlertasDeBackup alertas={dados.alertas} />
                <ListasDoResumo resumo={dados} />
              </div>
            )}
          </ConteudoAssincrono>
        )}
      </div>

      {plano ? (
        <ModalPlanoBackup
          key={plano.vez}
          aberto={plano.aberto}
          modo={plano.modo}
          inicial={plano.inicial}
          agendamentoId={plano.agendamentoId}
          aoFechar={fechar}
          aoConcluir={() => setVersao((atual) => atual + 1)}
        />
      ) : null}

      {cadastro.vez > 0 ? (
        <ModalConexaoSalva
          key={cadastro.vez}
          conexao={null}
          aberto={cadastro.aberto}
          aoFechar={() => setCadastro((atual) => ({ ...atual, aberto: false }))}
          aoSalvar={(salva) => {
            guardarSalva(salva);
            setCadastro((atual) => ({ ...atual, aberto: false }));
            notificacoes.sucesso('Conexão salva.', salva.nome);
          }}
        />
      ) : null}
    </>
  );
}
