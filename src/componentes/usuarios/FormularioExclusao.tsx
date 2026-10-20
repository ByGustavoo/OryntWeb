import { useState } from 'react';
import type { FormEvent } from 'react';
import { Activity, FileStack, KeyRound, ShieldMinus, UsersRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CaixaMarcacao, CampoSelecao, Nota } from '@/componentes/ui';
import type { PapelDTO } from '@/modelos/papeis';
import { podeEncerrarSessoes, podeReatribuirObjetos } from '@/regras/capacidadeAlteracoes';
import type { ContextoDaCapacidade } from '@/regras/capacidadeAlteracoes';
import {
  herdeiroInicial,
  herdeirosPossiveis,
  operacaoDeExclusao,
  precisaDeHerdeiro,
  vinculosDoPapel,
} from '@/regras/exclusaoPapel';
import { listarNomes } from '@/regras/efeitoAlteracoes';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import type { PropriedadesDoFormulario } from './formularioAlteracao';
import estilos from './FormularioAlteracao.module.css';
import locais from './FormularioExclusao.module.css';

interface FormularioExclusaoProps extends PropriedadesDoFormulario {
  papel: PapelDTO;
}

interface Vinculo {
  chave: string;
  icone: LucideIcon;
  titulo: string;
  texto: string;
}

export function FormularioExclusao({ idFormulario, estado, aoRevisar, papel }: FormularioExclusaoProps) {
  const vinculos = vinculosDoPapel(papel, estado.permissoes);
  const papeis = estado.papeis.papeis;
  const [herdeiro, setHerdeiro] = useState<string | null>(() => herdeiroInicial(papel, papeis, estado.papeis.papelDaConexao));
  const [encerrar, setEncerrar] = useState(false);
  const [tentou, setTentou] = useState(false);
  const contexto: ContextoDaCapacidade = { ator: estado.papeis.papelDaConexao, papeis };
  const exigeHerdeiro = precisaDeHerdeiro(vinculos);
  const reatribuir = herdeiro && exigeHerdeiro ? podeReatribuirObjetos(contexto, papel.nome, herdeiro) : null;
  const encerramento = podeEncerrarSessoes(contexto, papel.nome);

  const lista: Vinculo[] = [
    vinculos.objetos > 0 && {
      chave: 'objetos',
      icone: FileStack,
      titulo: `Dono de ${formatarNumero(vinculos.objetos)} ${pluralizar(vinculos.objetos, 'objeto', 'objetos')}`,
      texto: `${vinculos.textoDosObjetos}. REASSIGN OWNED passa todos para o papel escolhido abaixo.`,
    },
    vinculos.concessoes > 0 && {
      chave: 'concessoes',
      icone: KeyRound,
      titulo: `${formatarNumero(vinculos.concessoes)} ${pluralizar(vinculos.concessoes, 'privilégio recebido', 'privilégios recebidos')}`,
      texto: `Em ${listarNomes(vinculos.objetosComConcessoes)}. DROP OWNED os revoga.`,
    },
    vinculos.concessoesFeitas > 0 && {
      chave: 'feitas',
      icone: ShieldMinus,
      titulo: `${formatarNumero(vinculos.concessoesFeitas)} ${pluralizar(vinculos.concessoesFeitas, 'concessão feita por ele', 'concessões feitas por ele')}`,
      texto: 'Quem recebeu dele perde esse acesso quando DROP OWNED remove as concessões.',
    },
    vinculos.padroes > 0 && {
      chave: 'padroes',
      icone: KeyRound,
      titulo: `${formatarNumero(vinculos.padroes)} ${pluralizar(vinculos.padroes, 'privilégio padrão', 'privilégios padrão')}`,
      texto: 'DROP OWNED remove os privilégios padrão que ele define ou recebe.',
    },
    vinculos.gruposDeQueParticipa.length + vinculos.membros.length > 0 && {
      chave: 'participacoes',
      icone: UsersRound,
      titulo: 'Participações',
      texto: [
        vinculos.gruposDeQueParticipa.length > 0 ? `Participa de ${listarNomes(vinculos.gruposDeQueParticipa)}.` : '',
        vinculos.membros.length > 0
          ? `${listarNomes(vinculos.membros)} ${vinculos.membros.length === 1 ? 'participa' : 'participam'} dele e perde${vinculos.membros.length === 1 ? '' : 'm'} o que ele dava.`
          : '',
      ]
        .filter(Boolean)
        .join(' '),
    },
    vinculos.sessoes > 0 && {
      chave: 'sessoes',
      icone: Activity,
      titulo: `${formatarNumero(vinculos.sessoes)} ${pluralizar(vinculos.sessoes, 'sessão aberta', 'sessões abertas')} agora`,
      texto: 'Uma sessão aberta continua até desconectar, mesmo sem o papel. Encerre-as abaixo se for o caso.',
    },
  ].filter((item): item is Vinculo => Boolean(item));

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    setTentou(true);
    if (exigeHerdeiro && !herdeiro) return;
    aoRevisar({ operacoes: [operacaoDeExclusao(papel, vinculos, herdeiro, encerrar)], origem: 'FORMULARIO' });
  };

  return (
    <form id={idFormulario} className={estilos.formulario} onSubmit={enviar} noValidate>
      <section className={estilos.secao} aria-labelledby={`${idFormulario}-vinculos`}>
        <div className={estilos.cabecalhoSecao}>
          <h3 className={estilos.tituloSecao} id={`${idFormulario}-vinculos`}>
            O que depende de {papel.nome}
          </h3>
          <p className={estilos.descricaoSecao}>
            {lista.length > 0
              ? 'O PostgreSQL recusa o DROP ROLE enquanto qualquer um destes existir. Os comandos da revisão resolvem cada um, na ordem.'
              : 'Nada neste banco depende dele: basta o DROP ROLE.'}
          </p>
        </div>
        {lista.length > 0 ? (
          <ul className={locais.vinculos}>
            {lista.map((vinculo) => {
              const Icone = vinculo.icone;
              return (
                <li key={vinculo.chave} className={locais.vinculo}>
                  <span className={locais.icone} aria-hidden="true">
                    <Icone size={15} strokeWidth={2} />
                  </span>
                  <span className={locais.textos}>
                    <span className={locais.titulo}>{vinculo.titulo}</span>
                    <span className={locais.texto}>{vinculo.texto}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      {exigeHerdeiro ? (
        <div className={estilos.secao}>
          <CampoSelecao
            rotulo="Quem fica com os objetos"
            obrigatorio
            opcoes={herdeirosPossiveis(papel, papeis).map((candidato) => ({
              valor: candidato.nome,
              rotulo: candidato.nome,
              descricao: candidato.login ? 'Usuário' : 'Grupo',
            }))}
            valor={herdeiro}
            aoMudar={setHerdeiro}
            erro={tentou && !herdeiro ? 'Escolha quem fica com os objetos.' : (reatribuir && !reatribuir.permitido ? (reatribuir.motivo ?? undefined) : undefined)}
            dica="Prefira um grupo dono, como o da aplicação, a um usuário de pessoa."
          />
        </div>
      ) : null}

      {vinculos.sessoes > 0 ? (
        <CaixaMarcacao
          marcada={encerrar}
          aoMudar={setEncerrar}
          motivoDesabilitada={encerramento.permitido ? null : encerramento.motivo}
          descricao="Com pg_terminate_backend: a transação aberta de cada uma é desfeita e a aplicação precisa reconectar."
        >
          Encerrar as {formatarNumero(vinculos.sessoes)} {pluralizar(vinculos.sessoes, 'sessão aberta', 'sessões abertas')}
        </CaixaMarcacao>
      ) : null}

      <Nota tom="info">
        A exclusão não tem desfazer: o papel volta só se for criado de novo, e as permissões que ele tinha não voltam sozinhas.
      </Nota>
    </form>
  );
}
