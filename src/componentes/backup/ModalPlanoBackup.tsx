import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, OctagonX, Play, Plus } from 'lucide-react';
import { descreverFalha, errosDeCampo } from '@/api/tratamentoErros';
import { Botao, CampoSelecao, CampoTexto, ConteudoAssincrono, Esqueleto, GrupoOpcoes, Interruptor, Modal, Nota } from '@/componentes/ui';
import type { OpcaoSelecao } from '@/componentes/ui';
import { useDadosPorChave } from '@/ganchos/useDadosAssincronos';
import type { ModoDoPlano } from '@/ganchos/usePlanoBackup';
import type { TipoBackup, UnidadeIntervalo } from '@/modelos/backup';
import type { ConexaoSalvaDTO } from '@/modelos/conexao';
import { useBackupLocal } from '@/provedores/ProvedorBackupLocal';
import { useConexao } from '@/provedores/ProvedorConexao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { descreverLocal } from '@/regras/acompanhamentoBackup';
import {
  PROXIMAS_NA_PREVIA,
  TAMANHO_MAXIMO_NOME_BACKUP,
  descricaoTipoBackup,
  errosDaEtapa,
  etapasDoPlano,
  frequenciaDosCampos,
  montarDadosAgendamento,
  montarNovaExecucao,
  nomeSugeridoDoBackup,
  rotuloEtapaDoPlano,
  rotuloTipoBackup,
  tiposBackup,
} from '@/regras/backup';
import type { CampoPlano, CamposPlano, ErrosPlano, EtapaDoPlano, QuandoExecutar } from '@/regras/backup';
import { enderecoConexao } from '@/regras/conexoesSalvas';
import {
  INTERVALO_MAXIMO,
  descreverFrequencia,
  diasDaSemana,
  proximasOcorrencias,
  rotuloTipoFrequencia,
  rotuloUnidadeIntervalo,
  tiposFrequencia,
} from '@/regras/frequenciaBackup';
import { ajustarSelecaoAoTipo, descreverSelecao } from '@/regras/selecaoObjetosBackup';
import { servicoBackup } from '@/servicos';
import { formatarDiaSemana, formatarInstante, iniciarComMaiuscula } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { ArvoreObjetos } from './ArvoreObjetos';
import { ComoFuncionaSegundoPlano } from './ComoFuncionaSegundoPlano';
import { CaminhoDoBackup, EscolhaDestino } from './EscolhaDestino';
import { ModalConexaoSalva } from './ModalConexaoSalva';
import estilos from './ModalPlanoBackup.module.css';

const ID_FORMULARIO = 'formulario-plano-backup';

const tituloDoModo: Record<ModoDoPlano, string> = {
  NOVO: 'Novo backup',
  AGENDAR: 'Novo agendamento',
  EDITAR: 'Editar agendamento',
  DUPLICAR: 'Duplicar agendamento',
};

const opcoesDeUnidade: { valor: UnidadeIntervalo; rotulo: string }[] = (['HORAS', 'DIAS'] as const).map((valor) => ({
  valor,
  rotulo: rotuloUnidadeIntervalo[valor],
}));

const opcoesDoDia: OpcaoSelecao[] = diasDaSemana.map((dia) => ({ valor: String(dia.valor), rotulo: dia.rotulo }));

interface ModalPlanoBackupProps {
  aberto: boolean;
  modo: ModoDoPlano;
  inicial: CamposPlano;
  agendamentoId: string | null;
  aoFechar: () => void;
  aoConcluir: () => void;
}

export function ModalPlanoBackup({ aberto, modo, inicial, agendamentoId, aoFechar, aoConcluir }: ModalPlanoBackupProps) {
  const { salvas, guardarSalva } = useConexao();
  const notificacoes = useNotificacoes();
  const { iniciar, localDoDestino } = useBackupLocal();
  const [campos, setCampos] = useState<CamposPlano>(inicial);
  const [etapa, setEtapa] = useState<EtapaDoPlano>('ORIGEM');
  const [erros, setErros] = useState<ErrosPlano>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [conexaoNova, setConexaoNova] = useState<{ vez: number; aberta: boolean }>({ vez: 0, aberta: false });
  const [tentativa, setTentativa] = useState(0);
  const corpo = useRef<HTMLDivElement>(null);

  const conexao = salvas.find((salva) => salva.id === campos.conexaoId) ?? null;
  const indice = etapasDoPlano.indexOf(etapa);
  const ultimaEtapa = indice === etapasDoPlano.length - 1;
  const soAgendamento = modo !== 'NOVO';
  const objetos = useDadosPorChave(campos.conexaoId ?? '', (id, signal) =>
    id ? servicoBackup.listarObjetos(id, signal) : Promise.resolve({ conexaoId: '', banco: '', objetos: [] }),
  );

  useEffect(() => {
    corpo.current?.parentElement?.scrollTo({ top: 0 });
  }, [etapa]);

  useEffect(() => {
    if (tentativa > 0) corpo.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [tentativa]);

  const mudar = (mudanca: Partial<CamposPlano>) => {
    setCampos((atuais) => ({ ...atuais, ...mudanca }));
    setFalha(null);
    const tocados = Object.keys(mudanca) as (keyof CamposPlano)[];
    setErros((atuais) => {
      const proximos = { ...atuais };
      for (const campo of tocados) delete proximos[campo as CampoPlano];
      return proximos;
    });
  };

  const mudarTipo = (tipo: TipoBackup) =>
    mudar({ tipo, selecao: ajustarSelecaoAoTipo(campos.selecao, objetos.dados?.objetos ?? [], tipo) });

  const opcoesDeConexao = useMemo(
    (): OpcaoSelecao[] => salvas.map((salva) => ({ valor: salva.id, rotulo: salva.nome, descricao: enderecoConexao(salva) })),
    [salvas],
  );

  const opcoesDoQuando: { valor: QuandoExecutar; rotulo: string }[] = [
    ...(soAgendamento ? [] : [{ valor: 'AGORA' as const, rotulo: 'Agora' }]),
    ...tiposFrequencia.map((valor) => ({ valor, rotulo: rotuloTipoFrequencia[valor] })),
  ];

  const irPara = (destino: EtapaDoPlano) => {
    setErros({});
    setEtapa(destino);
  };

  const avancar = () => {
    const encontrados = errosDaEtapa(etapa, campos);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) {
      setTentativa((atual) => atual + 1);
      return false;
    }
    const proxima = etapasDoPlano[indice + 1];
    if (proxima) setEtapa(proxima);
    return true;
  };

  const concluirAgendamento = async () => {
    const dados = montarDadosAgendamento(campos);
    if (!dados) return;
    setEnviando(true);
    try {
      if (modo === 'EDITAR' && agendamentoId) {
        await servicoBackup.editarAgendamento(agendamentoId, dados);
        notificacoes.sucesso('Agendamento salvo.', descreverFrequencia(dados.frequencia));
      } else {
        await servicoBackup.criarAgendamento(dados);
        notificacoes.sucesso('Agendamento criado.', descreverFrequencia(dados.frequencia));
      }
      aoConcluir();
      aoFechar();
    } catch (erro) {
      setErros(errosDeCampo<CampoPlano>(erro));
      setFalha(descreverFalha(erro));
      setEnviando(false);
    }
  };

  const iniciarAgora = async () => {
    setEnviando(true);
    try {
      await iniciar(montarNovaExecucao(campos));
      aoConcluir();
      aoFechar();
    } catch (erro) {
      setErros(errosDeCampo<CampoPlano>(erro));
      setFalha(descreverFalha(erro));
    } finally {
      setEnviando(false);
    }
  };

  const enviar = () => {
    if (enviando) return;
    const encontrados = etapasDoPlano.flatMap((item) => {
      const daEtapa = errosDaEtapa(item, campos);
      return Object.keys(daEtapa).length > 0 ? [{ item, daEtapa }] : [];
    });
    const primeiro = encontrados[0];
    if (primeiro) {
      setEtapa(primeiro.item);
      setErros(primeiro.daEtapa);
      setTentativa((atual) => atual + 1);
      return;
    }
    void (campos.quando === 'AGORA' ? iniciarAgora() : concluirAgendamento());
  };

  const fechar = () => {
    if (!enviando) aoFechar();
  };

  const textoDoBotao = campos.quando === 'AGORA' ? 'Executar backup' : modo === 'EDITAR' ? 'Salvar agendamento' : 'Criar agendamento';

  return (
    <>
      <Modal
        aberto={aberto}
        aoFechar={fechar}
        titulo={tituloDoModo[modo]}
        descricao={`Etapa ${indice + 1} de ${etapasDoPlano.length}: ${rotuloEtapaDoPlano[etapa].toLowerCase()}`}
        tamanho="lg"
        rodape={
          <>
            {indice > 0 ? (
              <Botao variante="terciario" icone={ArrowLeft} className={estilos.voltar} disabled={enviando} onClick={() => irPara(etapasDoPlano[indice - 1] ?? 'ORIGEM')}>
                Voltar
              </Botao>
            ) : (
              <Botao variante="terciario" className={estilos.voltar} onClick={fechar}>
                Cancelar
              </Botao>
            )}
            {ultimaEtapa ? (
              <Botao type="submit" form={ID_FORMULARIO} icone={campos.quando === 'AGORA' ? Play : Check} carregando={enviando}>
                {textoDoBotao}
              </Botao>
            ) : (
              <Botao type="submit" form={ID_FORMULARIO} iconeDireita={ArrowRight}>
                Continuar
              </Botao>
            )}
          </>
        }
      >
        <form
          id={ID_FORMULARIO}
          noValidate
          className={estilos.formulario}
          onSubmit={(evento) => {
            evento.preventDefault();
            if (ultimaEtapa) enviar();
            else avancar();
          }}
        >
          <div ref={corpo} className={estilos.corpo}>
            <ol className={estilos.etapas}>
              {etapasDoPlano.map((item, posicao) => {
                const feita = posicao < indice;
                return (
                  <li key={item} className={juntarClasses(estilos.etapa, item === etapa && estilos.etapaAtual, feita && estilos.etapaFeita)} aria-current={item === etapa ? 'step' : undefined}>
                    <button type="button" className={estilos.botaoEtapa} disabled={!feita} onClick={() => irPara(item)}>
                      <span className={`${estilos.numeroEtapa} numeros`} aria-hidden="true">
                        {feita ? <Check size={12} strokeWidth={3} /> : posicao + 1}
                      </span>
                      <span className={estilos.rotuloEtapa}>{rotuloEtapaDoPlano[item]}</span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {falha ? (
              <Nota tom="erro" icone={OctagonX} titulo="Não deu certo." role="alert">
                {falha}
              </Nota>
            ) : null}

            {etapa === 'ORIGEM' ? (
              <div className={estilos.secao}>
                <div className={estilos.linhaConexao}>
                  <CampoSelecao
                    rotulo="Conexão PostgreSQL"
                    obrigatorio
                    className={estilos.campoConexao}
                    opcoes={opcoesDeConexao}
                    valor={campos.conexaoId}
                    aoMudar={(conexaoId) => mudar({ conexaoId, selecao: { modo: 'BANCO_INTEIRO' } })}
                    textoVazio="Escolha uma conexão"
                    erro={erros.conexaoId}
                  />
                  <Botao
                    variante="secundario"
                    icone={Plus}
                    className={estilos.novaConexao}
                    onClick={() => setConexaoNova((atual) => ({ vez: atual.vez + 1, aberta: true }))}
                  >
                    Nova conexão
                  </Botao>
                </div>
                <CampoTexto
                  rotulo="Banco de dados"
                  value={conexao?.banco ?? ''}
                  placeholder="Vem da conexão escolhida"
                  dica="Cada conexão aponta para um banco. Para outro banco, use outra conexão."
                  readOnly
                  disabled
                />
                <fieldset className={estilos.tipos}>
                  <legend className={estilos.legenda}>Tipo de backup</legend>
                  {tiposBackup.map((tipo) => (
                    <label key={tipo} className={juntarClasses(estilos.tipo, campos.tipo === tipo && estilos.tipoEscolhido)}>
                      <input type="radio" name="tipo-backup" className={estilos.radio} checked={campos.tipo === tipo} onChange={() => mudarTipo(tipo)} />
                      <span className={estilos.textosDoTipo}>
                        <span className={estilos.nomeDoTipo}>{rotuloTipoBackup[tipo]}</span>
                        <span className={estilos.descricaoDoTipo}>{descricaoTipoBackup[tipo]}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              </div>
            ) : null}

            {etapa === 'OBJETOS' ? (
              <ConteudoAssincrono
                resultado={objetos}
                revelar={false}
                tituloErro="Não foi possível ler os objetos do banco"
                esqueleto={
                  <div className={estilos.esperaDaArvore} role="status" aria-label="Carregando os objetos do banco…">
                    <Esqueleto largura={240} altura={38} raio="var(--raio-md)" />
                    <Esqueleto largura="60%" />
                    <Esqueleto altura={64} raio="var(--raio-md)" />
                  </div>
                }
              >
                {(lista) => (
                  <ArvoreObjetos objetos={lista.objetos} tipo={campos.tipo} selecao={campos.selecao} erro={erros.selecao} aoMudar={(selecao) => mudar({ selecao })} />
                )}
              </ConteudoAssincrono>
            ) : null}

            {etapa === 'DESTINO' ? (
              <div className={estilos.secao}>
                <EscolhaDestino />
                <CaminhoDoBackup />
              </div>
            ) : null}

            {etapa === 'QUANDO' ? (
              <div className={estilos.secao}>
                <div className={estilos.grupoComRotulo}>
                  <span className={estilos.legenda}>Quando executar</span>
                  <GrupoOpcoes rotulo="Quando executar" opcoes={opcoesDoQuando} valor={campos.quando} aoMudar={(quando) => mudar({ quando })} className={estilos.quebravel} />
                </div>

                <CampoTexto
                  rotulo={campos.quando === 'AGORA' ? 'Nome do backup (opcional)' : 'Nome do agendamento'}
                  value={campos.nome}
                  erro={erros.nome}
                  placeholder={conexao ? nomeSugeridoDoBackup(conexao.banco, campos.tipo) : ''}
                  maxLength={TAMANHO_MAXIMO_NOME_BACKUP + 1}
                  autoComplete="off"
                  aria-required={campos.quando === 'AGORA' ? undefined : 'true'}
                  onChange={(evento) => mudar({ nome: evento.target.value })}
                />

                {campos.quando !== 'AGORA' ? (
                  <>
                    <div className={estilos.linhaFrequencia}>
                      {campos.quando === 'SEMANAL' ? (
                        <CampoSelecao
                          rotulo="Dia da semana"
                          opcoes={opcoesDoDia}
                          valor={String(campos.diaDaSemana)}
                          aoMudar={(dia) => mudar({ diaDaSemana: Number(dia ?? 0) })}
                        />
                      ) : null}
                      {campos.quando === 'MENSAL' ? (
                        <CampoTexto
                          rotulo="Dia do mês"
                          value={campos.diaDoMes}
                          erro={erros.diaDoMes}
                          dica={erros.diaDoMes ? undefined : 'Nos meses mais curtos, roda no último dia.'}
                          inputMode="numeric"
                          maxLength={2}
                          autoComplete="off"
                          onChange={(evento) => mudar({ diaDoMes: evento.target.value })}
                        />
                      ) : null}
                      {campos.quando === 'PERSONALIZADA' ? (
                        <>
                          <CampoTexto
                            rotulo="A cada"
                            value={campos.intervalo}
                            erro={erros.intervalo}
                            dica={erros.intervalo ? undefined : `De 1 a ${INTERVALO_MAXIMO[campos.unidade]}.`}
                            inputMode="numeric"
                            maxLength={3}
                            autoComplete="off"
                            onChange={(evento) => mudar({ intervalo: evento.target.value })}
                          />
                          <div className={estilos.grupoComRotulo}>
                            <span className={estilos.legenda}>Unidade</span>
                            <GrupoOpcoes rotulo="Unidade do intervalo" opcoes={opcoesDeUnidade} valor={campos.unidade} aoMudar={(unidade) => mudar({ unidade })} />
                          </div>
                        </>
                      ) : null}
                      <CampoTexto
                        type="time"
                        rotulo={campos.quando === 'PERSONALIZADA' && campos.unidade === 'HORAS' ? 'A partir das' : 'Horário'}
                        value={campos.horario}
                        erro={erros.horario}
                        dica={erros.horario ? undefined : 'Horário deste computador.'}
                        onChange={(evento) => mudar({ horario: evento.target.value })}
                      />
                    </div>

                    <PreviaDasExecucoes campos={campos} />

                    <Nota>
                      É um lembrete: na hora prevista, com o Orynt aberto, você recebe um aviso e confirma o início. Com o site fechado, nada roda, e o agendamento aparece como atrasado até você fazer o backup.
                    </Nota>

                    <Interruptor ligado={campos.ativo} aoMudar={(ativo) => mudar({ ativo })}>
                      {campos.ativo ? 'Agendamento ativo' : 'Agendamento inativo: fica salvo sem avisar'}
                    </Interruptor>
                  </>
                ) : null}

                <dl className={estilos.revisao}>
                  <ItemDaRevisao rotulo="Conexão" valor={conexao?.nome ?? 'Nenhuma'} />
                  <ItemDaRevisao rotulo="Banco" valor={conexao?.banco ?? 'Nenhum'} codigo />
                  <ItemDaRevisao rotulo="Tipo" valor={rotuloTipoBackup[campos.tipo]} />
                  <ItemDaRevisao rotulo="Objetos" valor={descreverSelecao(campos.selecao)} />
                  <ItemDaRevisao rotulo="Destino" valor={descreverLocal(localDoDestino)} />
                </dl>

                {campos.quando === 'AGORA' ? <ComoFuncionaSegundoPlano /> : null}
              </div>
            ) : null}
          </div>
        </form>
      </Modal>

      {conexaoNova.vez > 0 ? (
        <ModalConexaoSalva
          key={conexaoNova.vez}
          conexao={null}
          aberto={conexaoNova.aberta}
          aoFechar={() => setConexaoNova((atual) => ({ ...atual, aberta: false }))}
          aoSalvar={(salva: ConexaoSalvaDTO) => {
            guardarSalva(salva);
            mudar({ conexaoId: salva.id, selecao: { modo: 'BANCO_INTEIRO' } });
            setConexaoNova((atual) => ({ ...atual, aberta: false }));
            notificacoes.sucesso('Conexão salva.', salva.nome);
          }}
        />
      ) : null}
    </>
  );
}

function ItemDaRevisao({ rotulo, valor, codigo = false }: { rotulo: string; valor: string; codigo?: boolean }) {
  return (
    <div className={estilos.itemRevisao}>
      <dt>{rotulo}</dt>
      <dd className={codigo ? 'codigo' : undefined}>{valor}</dd>
    </div>
  );
}

function PreviaDasExecucoes({ campos }: { campos: CamposPlano }) {
  const frequencia = frequenciaDosCampos(campos);
  if (!frequencia) return null;
  const agora = new Date();
  const proximas = proximasOcorrencias(frequencia, agora, agora, PROXIMAS_NA_PREVIA);
  return (
    <div className={estilos.previa}>
      <p className={estilos.tituloPrevia}>{descreverFrequencia(frequencia)}. Os próximos lembretes:</p>
      <ul className={estilos.listaPrevia} aria-live="polite">
        {proximas.map((instante) => (
          <li key={instante.toISOString()} className={estilos.itemPrevia}>
            <span className={estilos.diaPrevia}>{iniciarComMaiuscula(formatarDiaSemana(instante.toISOString()))}</span>
            <span className="numeros">{formatarInstante(instante.toISOString())}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
