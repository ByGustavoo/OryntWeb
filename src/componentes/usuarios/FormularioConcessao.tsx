import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, Globe, TriangleAlert, UserRound, UsersRound } from 'lucide-react';
import { CaixaMarcacao, CampoSelecao, GrupoOpcoes, Interruptor, Nota } from '@/componentes/ui';
import type { OpcaoSelecao } from '@/componentes/ui';
import type { Privilegio } from '@/modelos/permissoes';
import { podeConcederNoObjeto, podeRevogarConcessoes } from '@/regras/capacidadeAlteracoes';
import { objetosDoAlvo } from '@/regras/aplicacaoAlteracoes';
import {
  aceitaColunas,
  ajustarAoAlvo,
  alvoDosCampos,
  camposDaConcessao,
  colunasDisponiveis,
  faltaUsageNoEsquema,
  operacoesDaConcessao,
  privilegiosDisponiveis,
  rotuloTipoDeTodos,
  tiposDeTodos,
  validarConcessao,
} from '@/regras/formularioConcessao';
import type { AcaoDaConcessao, AlcanceDaConcessao, CamposConcessao } from '@/regras/formularioConcessao';
import {
  efeitoDoPrivilegio,
  esquemasDasPermissoes,
  nomeCompleto,
  PUBLICO,
  rotuloTipoObjetoPermissao,
  sujeitosDasPermissoes,
} from '@/regras/permissoes';
import { iconeDoTipoObjetoPermissao } from './SeloSituacaoPermissao';
import type { PropriedadesDoFormulario } from './formularioAlteracao';
import estilos from './FormularioAlteracao.module.css';

interface FormularioConcessaoProps extends PropriedadesDoFormulario {
  inicial: Partial<CamposConcessao>;
}

const opcoesDeAcao: { valor: AcaoDaConcessao; rotulo: string }[] = [
  { valor: 'CONCEDER', rotulo: 'Conceder' },
  { valor: 'REVOGAR', rotulo: 'Revogar' },
];

const opcoesDeAlcance: { valor: AlcanceDaConcessao; rotulo: string }[] = [
  { valor: 'OBJETO', rotulo: 'Um objeto' },
  { valor: 'ESQUEMA', rotulo: 'Todos de um esquema' },
];

export function FormularioConcessao({ idFormulario, estado, aoRevisar, inicial }: FormularioConcessaoProps) {
  const { indice } = estado;
  const [campos, setCampos] = useState<CamposConcessao>(() => ajustarAoAlvo(camposDaConcessao(inicial), indice));
  const [tentou, setTentou] = useState(false);
  const erros = validarConcessao(campos, indice);
  const disponiveis = privilegiosDisponiveis(campos, indice);
  const colunas = colunasDisponiveis(campos, indice);
  const semUsage = faltaUsageNoEsquema(campos, indice);

  const alvo = alvoDosCampos(campos, indice);
  const objetosAlcancados = useMemo(() => (alvo ? objetosDoAlvo(indice.dados, alvo) : []), [alvo, indice.dados]);
  const capacidade = useMemo(() => {
    if (!alvo || campos.privilegios.length === 0) return null;
    if (campos.acao === 'CONCEDER') {
      const negada = objetosAlcancados.map((objeto) => podeConcederNoObjeto(indice, objeto, campos.privilegios)).find((item) => !item.permitido);
      return negada ?? null;
    }
    const operacao = operacoesDaConcessao(campos, indice)[0];
    if (operacao?.tipo !== 'REVOGAR') return null;
    const resultado = podeRevogarConcessoes(indice, operacao.concedentes);
    return resultado.permitido ? null : resultado;
  }, [alvo, campos, indice, objetosAlcancados]);

  const mudar = (mudanca: Partial<CamposConcessao>) => setCampos((atuais) => ajustarAoAlvo({ ...atuais, ...mudanca }, indice));

  const opcoesPapel = useMemo(
    (): OpcaoSelecao[] => [
      ...sujeitosDasPermissoes(indice).map((papel) => ({
        valor: papel.nome,
        rotulo: papel.nome,
        descricao: `${papel.login ? 'Usuário' : 'Grupo'}${papel.superusuario ? ' superusuário' : ''}`,
        icone: papel.login ? UserRound : UsersRound,
      })),
      { valor: PUBLICO, rotulo: PUBLICO, descricao: 'Todos os papéis, os de hoje e os que vierem', icone: Globe },
    ],
    [indice],
  );
  const opcoesObjeto = useMemo(
    (): OpcaoSelecao[] =>
      indice.ordenados.map((objeto) => ({
        valor: objeto.id,
        rotulo: nomeCompleto(objeto),
        descricao: rotuloTipoObjetoPermissao[objeto.tipo],
        icone: iconeDoTipoObjetoPermissao[objeto.tipo],
      })),
    [indice],
  );
  const objetoEscolhido = campos.objeto ? indice.objetos.get(campos.objeto) : undefined;
  const tipoEscolhido = objetoEscolhido?.tipo ?? (campos.tipoDeObjeto === 'SEQUENCIAS' ? 'SEQUENCIA' : campos.tipoDeObjeto === 'FUNCOES' ? 'FUNCAO' : 'TABELA');

  const alternarPrivilegio = (privilegio: Privilegio, marcado: boolean) =>
    mudar({
      privilegios: marcado ? [...campos.privilegios, privilegio] : campos.privilegios.filter((item) => item !== privilegio),
    });

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    setTentou(true);
    if (Object.keys(erros).length > 0 || capacidade) return;
    aoRevisar({ operacoes: operacoesDaConcessao(campos, indice), origem: 'FORMULARIO' });
  };

  return (
    <form id={idFormulario} className={estilos.formulario} onSubmit={enviar} noValidate>
      <div className={estilos.secao}>
        <GrupoOpcoes rotulo="O que fazer" opcoes={opcoesDeAcao} valor={campos.acao} aoMudar={(acao) => mudar({ acao })} />
        <CampoSelecao
          rotulo={campos.acao === 'CONCEDER' ? 'Para quem' : 'De quem'}
          obrigatorio
          opcoes={opcoesPapel}
          valor={campos.beneficiario}
          aoMudar={(beneficiario) => mudar({ beneficiario })}
          erro={tentou ? erros.beneficiario : undefined}
          dica={
            campos.beneficiario === PUBLICO
              ? 'PUBLIC vale para todos os papéis, inclusive os criados depois.'
              : 'Conceda a um grupo, e não a cada usuário, quando mais de um papel precisa do mesmo acesso.'
          }
        />
      </div>

      <fieldset className={estilos.secao}>
        <div className={estilos.cabecalhoSecao}>
          <legend className={estilos.tituloSecao}>Onde</legend>
        </div>
        <GrupoOpcoes rotulo="Alcance" opcoes={opcoesDeAlcance} valor={campos.alcance} aoMudar={(alcance) => mudar({ alcance })} />
        {campos.alcance === 'OBJETO' ? (
          <CampoSelecao
            rotulo="Objeto"
            rotuloOculto
            obrigatorio
            textoVazio="Escolha o objeto"
            opcoes={opcoesObjeto}
            valor={campos.objeto}
            aoMudar={(objeto) => mudar({ objeto })}
            erro={tentou ? erros.objeto : undefined}
          />
        ) : (
          <div className={estilos.grade}>
            <CampoSelecao
              rotulo="Esquema"
              obrigatorio
              opcoes={esquemasDasPermissoes(indice).map((esquema) => ({ valor: esquema, rotulo: esquema }))}
              valor={campos.esquema}
              aoMudar={(esquema) => mudar({ esquema })}
              erro={tentou ? erros.esquema : undefined}
            />
            <CampoSelecao
              rotulo="Tipo de objeto"
              opcoes={tiposDeTodos.map((tipo) => ({ valor: tipo, rotulo: rotuloTipoDeTodos[tipo] }))}
              valor={campos.tipoDeObjeto}
              aoMudar={(tipo) => tipo && mudar({ tipoDeObjeto: tipo })}
              dica={
                campos.esquema
                  ? `Alcança os ${objetosAlcancados.length} que existem hoje. Para os que vierem, use um privilégio padrão.`
                  : undefined
              }
            />
          </div>
        )}
      </fieldset>

      {disponiveis.length > 0 ? (
        <fieldset className={estilos.secao}>
          <div className={estilos.cabecalhoSecao}>
            <legend className={estilos.tituloSecao}>Privilégios</legend>
          </div>
          <div className={estilos.grupoMarcacoes}>
            {disponiveis.map((privilegio) => (
              <CaixaMarcacao
                key={privilegio}
                marcada={campos.privilegios.includes(privilegio)}
                aoMudar={(marcado) => alternarPrivilegio(privilegio, marcado)}
                descricao={efeitoDoPrivilegio(privilegio, tipoEscolhido)}
                codigo
              >
                {privilegio}
              </CaixaMarcacao>
            ))}
          </div>
          {tentou && erros.privilegios ? (
            <p className={estilos.erroDoGrupo} role="alert">
              <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
              {erros.privilegios}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {aceitaColunas(campos, indice) || campos.porColuna ? (
        <fieldset className={estilos.secao}>
          <Interruptor ligado={campos.porColuna} aoMudar={(porColuna) => mudar({ porColuna })}>
            Só em algumas colunas
          </Interruptor>
          {campos.porColuna ? (
            <>
              <div className={`${estilos.grupoMarcacoes} ${estilos.tres}`}>
                {colunas.map((coluna) => (
                  <CaixaMarcacao
                    key={coluna}
                    marcada={campos.colunas.includes(coluna)}
                    aoMudar={(marcada) =>
                      mudar({ colunas: marcada ? [...campos.colunas, coluna] : campos.colunas.filter((item) => item !== coluna) })
                    }
                    codigo
                  >
                    {coluna}
                  </CaixaMarcacao>
                ))}
              </div>
              {tentou && erros.colunas ? (
                <p className={estilos.erroDoGrupo} role="alert">
                  <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
                  {erros.colunas}
                </p>
              ) : null}
            </>
          ) : null}
        </fieldset>
      ) : null}

      {campos.acao === 'CONCEDER' ? (
        <fieldset className={estilos.secao}>
          {semUsage ? (
            <CaixaMarcacao
              marcada={campos.usageNoEsquema}
              aoMudar={(usageNoEsquema) => mudar({ usageNoEsquema })}
              descricao={`${campos.beneficiario} não tem USAGE em ${semUsage}: sem ele, o PostgreSQL recusa o acesso antes de olhar o objeto.`}
            >
              Conceder também USAGE no esquema {semUsage}
            </CaixaMarcacao>
          ) : null}
          {campos.beneficiario !== PUBLICO ? (
            <CaixaMarcacao
              marcada={campos.repassavel}
              aoMudar={(repassavel) => mudar({ repassavel })}
              descricao="WITH GRANT OPTION: ele pode repassar o acesso a quem quiser. Em Permissões, isso vira um ponto de atenção."
            >
              Pode repassar a outros
            </CaixaMarcacao>
          ) : null}
        </fieldset>
      ) : null}

      {capacidade && tentou ? (
        <Nota tom="erro" icone={TriangleAlert} role="alert">
          {capacidade.motivo}
        </Nota>
      ) : capacidade ? (
        <Nota tom="aviso" icone={TriangleAlert}>
          {capacidade.motivo}
        </Nota>
      ) : null}
    </form>
  );
}
