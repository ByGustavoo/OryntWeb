import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, Globe, TriangleAlert, UserRound, UsersRound } from 'lucide-react';
import { CaixaMarcacao, CampoSelecao, GrupoOpcoes, Nota } from '@/componentes/ui';
import type { OpcaoSelecao } from '@/componentes/ui';
import { podeDefinirPadrao } from '@/regras/capacidadeAlteracoes';
import {
  camposDoPadrao,
  operacoesDoPadrao,
  privilegiosDoPadrao,
  rotuloTipoDeTodos,
  tiposDePadrao,
  validarPadrao,
} from '@/regras/formularioConcessao';
import type { AcaoDaConcessao, CamposPadrao } from '@/regras/formularioConcessao';
import { efeitoDoPrivilegio, esquemasDasPermissoes, PUBLICO, sujeitosDasPermissoes } from '@/regras/permissoes';
import type { PropriedadesDoFormulario } from './formularioAlteracao';
import estilos from './FormularioAlteracao.module.css';

interface FormularioPadraoProps extends PropriedadesDoFormulario {
  inicial: Partial<CamposPadrao>;
}

const opcoesDeAcao: { valor: AcaoDaConcessao; rotulo: string }[] = [
  { valor: 'CONCEDER', rotulo: 'Conceder' },
  { valor: 'REVOGAR', rotulo: 'Retirar' },
];

const QUALQUER_ESQUEMA = '';

const tipoDoPrivilegio = { TABELAS: 'TABELA', SEQUENCIAS: 'SEQUENCIA', FUNCOES: 'FUNCAO' } as const;

export function FormularioPadrao({ idFormulario, estado, aoRevisar, inicial }: FormularioPadraoProps) {
  const { indice } = estado;
  const [campos, setCampos] = useState<CamposPadrao>(() => camposDoPadrao(inicial));
  const [tentou, setTentou] = useState(false);
  const erros = validarPadrao(campos);
  const disponiveis = privilegiosDoPadrao(campos.tipoDeObjeto);
  const capacidade = campos.criador ? podeDefinirPadrao(indice, campos.criador) : null;

  const mudar = (mudanca: Partial<CamposPadrao>) =>
    setCampos((atuais) => {
      const proximos = { ...atuais, ...mudanca };
      const validos = privilegiosDoPadrao(proximos.tipoDeObjeto);
      return { ...proximos, privilegios: proximos.privilegios.filter((privilegio) => validos.includes(privilegio)) };
    });

  const papeis = useMemo(
    (): OpcaoSelecao[] =>
      sujeitosDasPermissoes(indice).map((papel) => ({
        valor: papel.nome,
        rotulo: papel.nome,
        descricao: papel.login ? 'Usuário' : 'Grupo',
        icone: papel.login ? UserRound : UsersRound,
      })),
    [indice],
  );

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    setTentou(true);
    if (Object.keys(erros).length > 0 || (capacidade && !capacidade.permitido)) return;
    aoRevisar({ operacoes: operacoesDoPadrao(campos), origem: 'FORMULARIO' });
  };

  return (
    <form id={idFormulario} className={estilos.formulario} onSubmit={enviar} noValidate>
      <GrupoOpcoes rotulo="O que fazer" opcoes={opcoesDeAcao} valor={campos.acao} aoMudar={(acao) => mudar({ acao })} />
      <div className={estilos.grade}>
        <CampoSelecao
          rotulo="O que este papel criar"
          obrigatorio
          opcoes={papeis}
          valor={campos.criador}
          aoMudar={(criador) => mudar({ criador })}
          erro={tentou ? erros.criador : undefined}
          dica="O privilégio padrão vale para os objetos que ele criar daqui em diante."
        />
        <CampoSelecao
          rotulo="Em que esquema"
          opcoes={[
            { valor: QUALQUER_ESQUEMA, rotulo: 'Qualquer esquema' },
            ...esquemasDasPermissoes(indice).map((esquema) => ({ valor: esquema, rotulo: esquema })),
          ]}
          valor={campos.esquema ?? QUALQUER_ESQUEMA}
          aoMudar={(esquema) => mudar({ esquema: esquema || null })}
        />
        <CampoSelecao
          rotulo="Tipo de objeto"
          opcoes={tiposDePadrao.map((tipo) => ({ valor: tipo, rotulo: rotuloTipoDeTodos[tipo] }))}
          valor={campos.tipoDeObjeto}
          aoMudar={(tipo) => tipo && mudar({ tipoDeObjeto: tipo })}
        />
        <CampoSelecao
          rotulo={campos.acao === 'CONCEDER' ? 'Para quem' : 'De quem'}
          obrigatorio
          opcoes={[...papeis, { valor: PUBLICO, rotulo: PUBLICO, descricao: 'Todos os papéis', icone: Globe }]}
          valor={campos.beneficiario}
          aoMudar={(beneficiario) => mudar({ beneficiario })}
          erro={tentou ? erros.beneficiario : undefined}
        />
      </div>
      <fieldset className={estilos.secao}>
        <div className={estilos.cabecalhoSecao}>
          <legend className={estilos.tituloSecao}>Privilégios</legend>
        </div>
        <div className={estilos.grupoMarcacoes}>
          {disponiveis.map((privilegio) => (
            <CaixaMarcacao
              key={privilegio}
              marcada={campos.privilegios.includes(privilegio)}
              aoMudar={(marcado) =>
                mudar({ privilegios: marcado ? [...campos.privilegios, privilegio] : campos.privilegios.filter((item) => item !== privilegio) })
              }
              descricao={efeitoDoPrivilegio(privilegio, tipoDoPrivilegio[campos.tipoDeObjeto])}
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
      {capacidade && !capacidade.permitido ? (
        <Nota tom={tentou ? 'erro' : 'aviso'} icone={TriangleAlert}>
          {capacidade.motivo}
        </Nota>
      ) : null}
    </form>
  );
}
