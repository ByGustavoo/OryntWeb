import { useState } from 'react';
import type { FormEvent } from 'react';
import { UserRound, UsersRound } from 'lucide-react';
import { CampoSelecao, Interruptor } from '@/componentes/ui';
import { podeMudarParticipacao } from '@/regras/capacidadeAlteracoes';
import { operacoesDaParticipacao, validarParticipacao } from '@/regras/formularioPapel';
import type { CamposParticipacao } from '@/regras/formularioPapel';
import { participacoesComSetRole, rotuloAtributo } from '@/regras/papeis';
import type { PropriedadesDoFormulario } from './formularioAlteracao';
import estilos from './FormularioAlteracao.module.css';

interface FormularioParticipacaoProps extends PropriedadesDoFormulario {
  grupo: string | null;
  membro: string | null;
}

export function FormularioParticipacao({ idFormulario, estado, aoRevisar, grupo, membro }: FormularioParticipacaoProps) {
  const papeis = estado.papeis.papeis;
  const contexto = { ator: estado.papeis.papelDaConexao, papeis };
  const [campos, setCampos] = useState<CamposParticipacao>({ grupo, membro, herda: true, assume: true, administra: false });
  const [tentou, setTentou] = useState(false);
  const erros = validarParticipacao(campos, papeis);
  const capacidade = campos.grupo ? podeMudarParticipacao(contexto, campos.grupo) : null;
  const grupoEscolhido = papeis.find((papel) => papel.nome === campos.grupo);
  const membroEscolhido = papeis.find((papel) => papel.nome === campos.membro);
  const ganhos =
    campos.assume && grupoEscolhido && membroEscolhido
      ? participacoesComSetRole({ ...membroEscolhido, membroDe: [{ papel: grupoEscolhido.nome, herda: campos.herda, assume: true, administra: false }] }, papeis)
      : [];

  const mudar = (mudanca: Partial<CamposParticipacao>) => setCampos((atuais) => ({ ...atuais, ...mudanca }));

  const opcao = (nome: string) => {
    const papel = papeis.find((candidato) => candidato.nome === nome);
    return {
      valor: nome,
      rotulo: nome,
      descricao: papel?.login ? 'Usuário' : 'Grupo',
      icone: papel?.login ? UserRound : UsersRound,
    };
  };

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    setTentou(true);
    if (Object.keys(erros).length > 0 || (capacidade && !capacidade.permitido)) return;
    aoRevisar({ operacoes: operacoesDaParticipacao(campos), origem: 'FORMULARIO' });
  };

  return (
    <form id={idFormulario} className={estilos.formulario} onSubmit={enviar} noValidate>
      <div className={estilos.grade}>
        <CampoSelecao
          rotulo="Grupo"
          obrigatorio
          opcoes={[...papeis.filter((papel) => !papel.login), ...papeis.filter((papel) => papel.login)].filter((papel) => papel.nome !== campos.membro).map((papel) => opcao(papel.nome))}
          valor={campos.grupo}
          aoMudar={(valor) => mudar({ grupo: valor })}
          erro={tentou ? (erros.grupo ?? (capacidade && !capacidade.permitido ? (capacidade.motivo ?? undefined) : undefined)) : undefined}
          dica={grupoEscolhido?.login ? 'É um usuário: qualquer papel pode servir de grupo, mas um grupo sem login é mais fácil de manter.' : undefined}
        />
        <CampoSelecao
          rotulo="Quem passa a participar"
          obrigatorio
          opcoes={papeis.filter((papel) => papel.nome !== campos.grupo).map((papel) => opcao(papel.nome))}
          valor={campos.membro}
          aoMudar={(valor) => mudar({ membro: valor })}
          erro={tentou ? erros.membro : undefined}
        />
      </div>
      <fieldset className={estilos.secao}>
        <div className={estilos.cabecalhoSecao}>
          <legend className={estilos.tituloSecao}>Opções da participação</legend>
          <p className={estilos.descricaoSecao}>
            No PostgreSQL 16 ou mais novo, cada participação diz se o membro herda as permissões, se pode assumir o grupo com SET
            ROLE e se pode pôr outros nele.
          </p>
        </div>
        <Interruptor ligado={campos.herda} aoMudar={(herda) => mudar({ herda })}>
          Herda as permissões do grupo
        </Interruptor>
        <Interruptor ligado={campos.assume} aoMudar={(assume) => mudar({ assume })}>
          Pode assumir o grupo com SET ROLE
        </Interruptor>
        <Interruptor ligado={campos.administra} aoMudar={(administra) => mudar({ administra })}>
          Pode pôr e tirar outros do grupo (ADMIN)
        </Interruptor>
        {ganhos.length > 0 ? (
          <p className={estilos.erroDoGrupo}>
            Com SET ROLE {campos.grupo}, {campos.membro} ganha {ganhos.map((item) => rotuloAtributo[item.atributo].toLowerCase()).join(', ')}.
          </p>
        ) : null}
      </fieldset>
    </form>
  );
}
