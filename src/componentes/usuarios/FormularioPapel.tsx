import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FilePlus2,
  Plus,
  ServerCog,
  Sparkles,
  TriangleAlert,
  UsersRound,
  X,
} from 'lucide-react';
import { MedidorForcaSenha } from '@/componentes/recuperacao/MedidorForcaSenha';
import {
  Botao,
  BotaoIcone,
  CaixaMarcacao,
  CampoSelecao,
  CampoSenha,
  CampoTexto,
  GrupoOpcoes,
  Interruptor,
  Nota,
} from '@/componentes/ui';
import type { PapelDTO, TipoPapel } from '@/modelos/papeis';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import {
  ehSuperusuarioNoContexto,
  motivoDoAtributo,
  podeAlterarAtributosDoPapel,
  podeMudarParticipacao,
  podeRenomearPapel,
} from '@/regras/capacidadeAlteracoes';
import type { ContextoDaCapacidade } from '@/regras/capacidadeAlteracoes';
import { listarNomes } from '@/regras/efeitoAlteracoes';
import { avaliarForcaSenha } from '@/regras/forcaSenha';
import {
  atributosDoFormulario,
  avisoDoLimite,
  camposDoModelo,
  camposDoPapel,
  configuracaoNova,
  criadoresDoEsquema,
  descricaoModeloDePapel,
  dicaDoNome,
  gruposDisponiveis,
  hojeComoData,
  modeloComEsquema,
  modelosDePapel,
  operacoesDoFormularioPapel,
  ordemDosCamposPapel,
  palavraAtributoDoFormulario,
  rotuloAtributoDoFormulario,
  rotuloModeloDePapel,
  tipoDoModelo,
  usuariosDisponiveis,
  validarCamposPapel,
} from '@/regras/formularioPapel';
import type { AtributoDoFormulario, CamposPapel, ModeloDePapel, ParticipacaoNoFormulario } from '@/regras/formularioPapel';
import { efeitoDoAtributo } from '@/regras/papeis';
import { esquemasDasPermissoes } from '@/regras/permissoes';
import { copiarTexto } from '@/utilitarios/areaTransferencia';
import { gerarSenha } from '@/utilitarios/geradorSenha';
import { verificadorScram } from '@/utilitarios/scram';
import { focarPrimeiroErro } from './formularioAlteracao';
import type { PropriedadesDoFormulario } from './formularioAlteracao';
import estilos from './FormularioAlteracao.module.css';

const iconeDoModelo: Record<ModeloDePapel, LucideIcon> = {
  EM_BRANCO: FilePlus2,
  GRUPO_DE_LEITURA: UsersRound,
  APLICACAO: ServerCog,
  LEITURA: BookOpen,
};

const efeitoDoAtributoDoFormulario: Record<AtributoDoFormulario, string> = {
  superusuario: efeitoDoAtributo.SUPERUSUARIO,
  criaBancos: efeitoDoAtributo.CRIA_BANCOS,
  criaPapeis: efeitoDoAtributo.CRIA_PAPEIS,
  replicacao: efeitoDoAtributo.REPLICACAO,
  ignoraRls: efeitoDoAtributo.IGNORA_RLS,
  herda: 'Recebe as permissões dos grupos de que participa sem precisar de SET ROLE.',
};

const opcoesDeTipo: { valor: TipoPapel; rotulo: string }[] = [
  { valor: 'USUARIO', rotulo: 'Usuário' },
  { valor: 'GRUPO', rotulo: 'Grupo' },
];

interface FormularioPapelProps extends PropriedadesDoFormulario {
  original: PapelDTO | null;
  trocarSenha: boolean;
}

const DURACAO_CONFIRMACAO_MS = 2400;

export function FormularioPapel({ idFormulario, estado, aoRevisar, aoOcupar, original, trocarSenha }: FormularioPapelProps) {
  const notificacoes = useNotificacoes();
  const formulario = useRef<HTMLFormElement>(null);
  const esquemas = useMemo(() => esquemasDasPermissoes(estado.indice), [estado.indice]);
  const [campos, setCampos] = useState<CamposPapel>(() => {
    if (!original) return camposDoModelo('EM_BRANCO', null, esquemas.includes('public') ? 'public' : (esquemas[0] ?? null));
    return { ...camposDoPapel(original), definirSenha: trocarSenha };
  });
  const [tentou, setTentou] = useState(false);
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const [avancados, setAvancados] = useState(() => (original ? atributosDoFormulario.some((atributo) => atributo !== 'herda' && original[atributo]) || !original.herda : false));
  const [gerada, setGerada] = useState(false);
  const [copiada, setCopiada] = useState(false);
  const [semMudancas, setSemMudancas] = useState(false);

  const contexto: ContextoDaCapacidade = { ator: estado.papeis.papelDaConexao, papeis: estado.papeis.papeis };
  const hoje = hojeComoData(new Date(estado.papeis.geradoEm));
  const erros = validarCamposPapel(campos, { papeis: estado.papeis.papeis, original, hoje });
  const erro = (campo: string) => (tentou || tocados.has(campo) ? erros[campo] : undefined);
  const tocar = (campo: string) => setTocados((atuais) => (atuais.has(campo) ? atuais : new Set(atuais).add(campo)));
  const usuario = campos.tipo === 'USUARIO';
  const soSenha = trocarSenha && original !== null;
  const atributosPermitidos = original ? podeAlterarAtributosDoPapel(contexto, original.nome) : { permitido: true, motivo: null };
  const renomear = original ? podeRenomearPapel(contexto, original.nome) : { permitido: true, motivo: null };
  const forca = campos.senha ? avaliarForcaSenha(campos.senha, [campos.nome]) : null;

  const mudar = (mudanca: Partial<CamposPapel>) => {
    setSemMudancas(false);
    setCampos((atuais) => ({ ...atuais, ...mudanca }));
  };

  const escolherModelo = (modelo: ModeloDePapel) => {
    setSemMudancas(false);
    setCampos((atuais) => camposDoModelo(modelo, atuais, atuais.esquema ?? (esquemas.includes('public') ? 'public' : (esquemas[0] ?? null))));
  };

  const alternarParticipacao = (grupo: string, marcada: boolean) =>
    mudar({
      participacoes: marcada
        ? [...campos.participacoes, { papel: grupo, herda: true, assume: true, administra: false }]
        : campos.participacoes.filter((item) => item.papel !== grupo),
    });

  const mudarParticipacao = (grupo: string, mudanca: Partial<ParticipacaoNoFormulario>) =>
    mudar({ participacoes: campos.participacoes.map((item) => (item.papel === grupo ? { ...item, ...mudanca } : item)) });

  const gerar = () => {
    mudar({ senha: gerarSenha(), definirSenha: true });
    setGerada(true);
    setCopiada(false);
  };

  const copiarSenha = async () => {
    if (await copiarTexto(campos.senha)) {
      setCopiada(true);
      window.setTimeout(() => setCopiada(false), DURACAO_CONFIRMACAO_MS);
      return;
    }
    notificacoes.erro('Não foi possível copiar a senha', 'O navegador bloqueou a área de transferência. Mostre a senha no campo e copie por lá.');
  };

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setTentou(true);
    if (Object.keys(erros).length > 0) {
      focarPrimeiroErro(formulario.current, ordemDosCamposPapel(campos), erros);
      return;
    }
    let verificador: string | null = null;
    if (usuario && campos.definirSenha && campos.senha) {
      aoOcupar(true);
      try {
        verificador = await verificadorScram(campos.senha);
      } finally {
        aoOcupar(false);
      }
    }
    const operacoes = operacoesDoFormularioPapel({ campos, original, permissoes: estado.permissoes, verificador });
    if (operacoes.length === 0) {
      setSemMudancas(true);
      return;
    }
    aoRevisar({ operacoes, origem: campos.modelo === 'EM_BRANCO' ? 'FORMULARIO' : 'MODELO' });
  };

  const gruposParaParticipar = gruposDisponiveis(estado.papeis.papeis, original?.nome ?? null);
  const usuariosParaMembros = usuariosDisponiveis(estado.papeis.papeis, original?.nome ?? null);
  const criadores = campos.esquema ? criadoresDoEsquema(estado.permissoes, campos.esquema) : [];

  const secaoSenha = usuario ? (
    <fieldset className={estilos.secao}>
      <div className={estilos.cabecalhoSecao}>
        <legend className={estilos.tituloSecao}>Senha e acesso</legend>
        <p className={estilos.descricaoSecao}>
          A senha nunca sai do navegador: o Orynt calcula o verificador SCRAM-SHA-256, que é o que o banco guarda.
        </p>
      </div>
      {original && !soSenha ? (
        <Interruptor ligado={campos.definirSenha} aoMudar={(ligado) => mudar({ definirSenha: ligado, senha: ligado ? campos.senha : '' })}>
          Definir uma nova senha
        </Interruptor>
      ) : null}
      {campos.definirSenha ? (
        <div className={estilos.senha} data-campo="senha">
          <CampoSenha
            rotulo={original ? 'Nova senha' : 'Senha'}
            preenchimentoAutomatico="new-password"
            value={campos.senha}
            onChange={(evento) => {
              setGerada(false);
              mudar({ senha: evento.target.value });
            }}
            onBlur={() => tocar('senha')}
            erro={erro('senha')}
            dica={
              forca
                ? `${forca.rotulo}. ${forca.orientacao.replace('do seu e-mail', 'do nome do papel')}`
                : original
                  ? undefined
                  : 'Opcional: sem senha, o papel só entra pelos métodos do pg_hba.conf que não pedem senha.'
            }
            complemento={campos.senha ? <MedidorForcaSenha forca={forca} /> : null}
          />
          <div className={estilos.senhaGerada}>
            <Botao variante="secundario" tamanho="sm" icone={Sparkles} onClick={gerar}>
              Gerar senha forte
            </Botao>
            {gerada && campos.senha ? (
              <>
                <Botao variante="terciario" tamanho="sm" icone={copiada ? Check : Copy} onClick={() => void copiarSenha()}>
                  {copiada ? 'Copiada' : 'Copiar a senha'}
                </Botao>
                <span>Guarde-a agora: depois de executar, nem o Orynt nem o banco a mostram de novo.</span>
              </>
            ) : null}
            <span className="visualmente-oculto" role="status">
              {copiada ? 'Senha copiada para a área de transferência.' : ''}
            </span>
          </div>
        </div>
      ) : null}
      <div className={estilos.grade}>
        <div data-campo="validade">
          <CampoTexto
            type="date"
            rotulo="Validade da senha"
            value={campos.validade}
            min={hoje}
            onChange={(evento) => mudar({ validade: evento.target.value })}
            onBlur={() => tocar('validade')}
            erro={erro('validade')}
            dica="Em branco, a senha não vence."
          />
        </div>
        {!soSenha ? (
          <div data-campo="limite">
            <CampoTexto
              rotulo="Limite de conexões"
              inputMode="numeric"
              value={campos.limite}
              onChange={(evento) => mudar({ limite: evento.target.value.replace(/\D/g, '') })}
              onBlur={() => tocar('limite')}
              erro={erro('limite')}
              dica={avisoDoLimite(campos.limite) ?? 'Em branco, sem limite próprio.'}
              placeholder="Sem limite"
            />
          </div>
        ) : null}
      </div>
    </fieldset>
  ) : null;

  return (
    <form id={idFormulario} ref={formulario} className={estilos.formulario} onSubmit={(evento) => void enviar(evento)} noValidate>
      {semMudancas ? (
        <Nota tom="info" role="status">
          Nada mudou: altere algum campo para revisar.
        </Nota>
      ) : null}

      {soSenha ? (
        secaoSenha
      ) : (
        <>
          {!original ? (
            <fieldset className={estilos.secao}>
              <div className={estilos.cabecalhoSecao}>
                <legend className={estilos.tituloSecao}>Começar de</legend>
                <p className={estilos.descricaoSecao}>Um modelo já traz o tipo, os limites e as permissões do caso mais comum.</p>
              </div>
              <div className={estilos.modelos}>
                {modelosDePapel.map((modelo) => {
                  const Icone = iconeDoModelo[modelo];
                  return (
                    <label key={modelo} className={estilos.modelo}>
                      <input
                        type="radio"
                        name={`${idFormulario}-modelo`}
                        className={estilos.entradaModelo}
                        checked={campos.modelo === modelo}
                        onChange={() => escolherModelo(modelo)}
                      />
                      <span className={estilos.iconeModelo} aria-hidden="true">
                        <Icone size={16} strokeWidth={2} />
                      </span>
                      <span className={estilos.rotuloModelo}>{rotuloModeloDePapel[modelo]}</span>
                      <span className={estilos.descricaoModelo}>{descricaoModeloDePapel[modelo]}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <fieldset className={estilos.secao}>
            <div className={estilos.cabecalhoSecao}>
              <legend className={estilos.tituloSecao}>Identificação</legend>
            </div>
            {tipoDoModelo(campos.modelo) === null ? (
              <GrupoOpcoes
                rotulo="Tipo de papel"
                opcoes={opcoesDeTipo}
                valor={campos.tipo}
                aoMudar={(tipo) => mudar({ tipo })}
              />
            ) : null}
            <div className={estilos.grade}>
              <div data-campo="nome">
                <CampoTexto
                  rotulo="Nome"
                  required
                  value={campos.nome}
                  onChange={(evento) => mudar({ nome: evento.target.value })}
                  onBlur={() => tocar('nome')}
                  erro={erro('nome')}
                  dica={!renomear.permitido ? (renomear.motivo ?? undefined) : (dicaDoNome(campos.nome) ?? 'Vale para o servidor inteiro, não só para este banco.')}
                  readOnly={!renomear.permitido}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder={usuario ? 'ana_silva' : 'leitura_financeiro'}
                />
              </div>
              <CampoTexto
                rotulo="Descrição"
                value={campos.descricao}
                onChange={(evento) => mudar({ descricao: evento.target.value })}
                dica="Opcional. Fica no banco, com COMMENT ON ROLE."
                maxLength={300}
              />
              {modeloComEsquema(campos.modelo) ? (
                <div data-campo="esquema" className={estilos.inteira}>
                  <CampoSelecao
                    rotulo="Esquema"
                    opcoes={esquemas.map((esquema) => ({ valor: esquema, rotulo: esquema }))}
                    valor={campos.esquema}
                    aoMudar={(esquema) => mudar({ esquema })}
                    erro={tentou ? erros.esquema : undefined}
                    dica={
                      campos.esquema && criadores.length > 0
                        ? `O que ${listarNomes(criadores)} criar ali também chega a ele, pelo privilégio padrão.`
                        : undefined
                    }
                  />
                </div>
              ) : null}
            </div>
          </fieldset>

          {secaoSenha}

          {!original ? (
            <fieldset className={estilos.secao}>
              <div className={estilos.cabecalhoSecao}>
                <legend className={estilos.tituloSecao}>{usuario ? 'Participa de' : 'Membros'}</legend>
                <p className={estilos.descricaoSecao}>
                  {usuario
                    ? 'Os grupos de que ele recebe as permissões. Dar acesso por grupo é mais fácil de manter do que papel a papel.'
                    : 'Os usuários que passam a receber o que o grupo tiver.'}
                </p>
              </div>
              {usuario ? (
                gruposParaParticipar.length > 0 ? (
                  <ul className={`${estilos.lista} ${estilos.listaRolavel}`}>
                    {gruposParaParticipar.map((grupo) => {
                      const participacao = campos.participacoes.find((item) => item.papel === grupo.nome);
                      const capacidade = podeMudarParticipacao(contexto, grupo.nome);
                      return (
                        <li key={grupo.nome} className={estilos.itemLista}>
                          <CaixaMarcacao
                            marcada={participacao !== undefined}
                            aoMudar={(marcada) => alternarParticipacao(grupo.nome, marcada)}
                            descricao={grupo.descricao ?? undefined}
                            motivoDesabilitada={capacidade.permitido ? null : capacidade.motivo}
                            codigo
                          >
                            {grupo.nome}
                          </CaixaMarcacao>
                          {participacao ? (
                            <div className={estilos.opcoesDoItem}>
                              <Interruptor ligado={participacao.herda} aoMudar={(herda) => mudarParticipacao(grupo.nome, { herda })}>
                                Herda as permissões
                              </Interruptor>
                              <Interruptor ligado={participacao.assume} aoMudar={(assume) => mudarParticipacao(grupo.nome, { assume })}>
                                Pode usar SET ROLE
                              </Interruptor>
                              <Interruptor
                                ligado={participacao.administra}
                                aoMudar={(administra) => mudarParticipacao(grupo.nome, { administra })}
                              >
                                Concede a outros (ADMIN)
                              </Interruptor>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className={estilos.vazio}>O servidor não tem grupos ainda.</p>
                )
              ) : usuariosParaMembros.length > 0 ? (
                <ul className={`${estilos.lista} ${estilos.listaRolavel}`}>
                  {usuariosParaMembros.map((membro) => (
                    <li key={membro.nome} className={estilos.itemLista}>
                      <CaixaMarcacao
                        marcada={campos.membros.includes(membro.nome)}
                        aoMudar={(marcada) =>
                          mudar({ membros: marcada ? [...campos.membros, membro.nome] : campos.membros.filter((nome) => nome !== membro.nome) })
                        }
                        descricao={membro.descricao ?? undefined}
                        codigo
                      >
                        {membro.nome}
                      </CaixaMarcacao>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={estilos.vazio}>O servidor não tem usuários para pôr no grupo.</p>
              )}
            </fieldset>
          ) : null}

          <fieldset className={estilos.secao}>
            <div className={estilos.cabecalhoSecao}>
              <legend className={estilos.tituloSecao}>Configurações próprias</legend>
              <p className={estilos.descricaoSecao}>
                Valem em toda sessão deste papel, com ALTER ROLE … SET. Um statement_timeout evita consultas sem fim.
              </p>
            </div>
            {campos.configuracoes.length > 0 ? (
              <div className={estilos.cabecalhoConfiguracao} aria-hidden="true">
                <span>Parâmetro</span>
                <span>Valor</span>
              </div>
            ) : null}
            {campos.configuracoes.map((configuracao) => (
              <div key={configuracao.chave} className={estilos.configuracao}>
                <div data-campo={`${configuracao.chave}-parametro`}>
                  <CampoTexto
                    rotulo="Parâmetro"
                    rotuloOculto
                    value={configuracao.parametro}
                    placeholder="statement_timeout"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(evento) =>
                      mudar({
                        configuracoes: campos.configuracoes.map((item) =>
                          item.chave === configuracao.chave ? { ...item, parametro: evento.target.value } : item,
                        ),
                      })
                    }
                    erro={tentou ? erros[`${configuracao.chave}-parametro`] : undefined}
                  />
                </div>
                <div data-campo={`${configuracao.chave}-valor`}>
                  <CampoTexto
                    rotulo={`Valor de ${configuracao.parametro || 'parâmetro'}`}
                    rotuloOculto
                    value={configuracao.valor}
                    placeholder="30s"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(evento) =>
                      mudar({
                        configuracoes: campos.configuracoes.map((item) =>
                          item.chave === configuracao.chave ? { ...item, valor: evento.target.value } : item,
                        ),
                      })
                    }
                    erro={tentou ? erros[`${configuracao.chave}-valor`] : undefined}
                  />
                </div>
                <BotaoIcone
                  icone={X}
                  rotulo={`Tirar ${configuracao.parametro || 'esta configuração'}`}
                  className={estilos.remover}
                  onClick={() => mudar({ configuracoes: campos.configuracoes.filter((item) => item.chave !== configuracao.chave) })}
                />
              </div>
            ))}
            <div className={estilos.acoesDaSecao}>
              <Botao
                variante="secundario"
                tamanho="sm"
                icone={Plus}
                onClick={() => mudar({ configuracoes: [...campos.configuracoes, configuracaoNova()] })}
              >
                Adicionar configuração
              </Botao>
            </div>
          </fieldset>

          <fieldset className={estilos.secao}>
            <Botao
              variante="terciario"
              tamanho="sm"
              icone={avancados ? ChevronUp : ChevronDown}
              className={estilos.alternarAvancados}
              aria-expanded={avancados}
              aria-controls={`${idFormulario}-avancados`}
              onClick={() => setAvancados(!avancados)}
            >
              Atributos avançados
            </Botao>
            <div id={`${idFormulario}-avancados`} hidden={!avancados}>
              {!atributosPermitidos.permitido ? (
                <Nota tom="aviso" icone={TriangleAlert}>
                  {atributosPermitidos.motivo}
                </Nota>
              ) : null}
              <div className={`${estilos.grupoMarcacoes} ${estilos.tres}`}>
                {atributosDoFormulario.map((atributo) => {
                  const motivo = !atributosPermitidos.permitido
                    ? atributosPermitidos.motivo
                    : atributo === 'herda'
                      ? null
                      : motivoDoAtributo(contexto, atributo);
                  return (
                    <CaixaMarcacao
                      key={atributo}
                      marcada={campos.atributos[atributo]}
                      aoMudar={(marcada) => mudar({ atributos: { ...campos.atributos, [atributo]: marcada } })}
                      descricao={`${palavraAtributoDoFormulario[atributo]}. ${efeitoDoAtributoDoFormulario[atributo]}`}
                      motivoDesabilitada={motivo && campos.atributos[atributo] === (original?.[atributo] ?? atributo === 'herda') ? motivo : null}
                    >
                      {rotuloAtributoDoFormulario[atributo]}
                    </CaixaMarcacao>
                  );
                })}
              </div>
              {campos.atributos.superusuario && !original?.superusuario && ehSuperusuarioNoContexto(contexto) ? (
                <p className={estilos.erroDoGrupo}>
                  <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
                  Um superusuário passa por cima de todas as permissões: prefira dar só o que ele precisa.
                </p>
              ) : null}
            </div>
          </fieldset>
        </>
      )}
    </form>
  );
}
