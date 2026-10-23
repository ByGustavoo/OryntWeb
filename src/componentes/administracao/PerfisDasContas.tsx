import type { CSSProperties } from 'react';
import { CabecalhoPainel, Painel } from '@/componentes/ui';
import type { ContaDTO, PerfilConta } from '@/modelos/administracao';
import { CATALOGO_DE_PERMISSOES, perfis } from '@/regras/permissoesConta';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PerfisDasContas.module.css';

interface PerfisDasContasProps {
  contas: ContaDTO[];
  perfilAtivo: PerfilConta | null;
  aoAlternar: (perfil: PerfilConta) => void;
}

export function PerfisDasContas({ contas, perfilAtivo, aoAlternar }: PerfisDasContasProps) {
  const total = CATALOGO_DE_PERMISSOES.length;

  return (
    <Painel aria-labelledby="titulo-perfis-contas" className={estilos.painel}>
      <CabecalhoPainel
        titulo={<span id="titulo-perfis-contas">Perfis</span>}
        descricao="O ponto de partida das permissões de cada conta. Escolha um para ver só as contas dele."
      />
      <ul className={estilos.perfis}>
        {perfis.map((definicao) => {
          const quantidade = contas.filter((conta) => conta.perfil === definicao.perfil).length;
          const parte = definicao.permissoes.length / total;
          const ativo = perfilAtivo === definicao.perfil;
          return (
            <li key={definicao.perfil}>
              <button
                type="button"
                className={juntarClasses(estilos.perfil, ativo && estilos.ativo)}
                aria-pressed={ativo}
                onClick={() => aoAlternar(definicao.perfil)}
              >
                <span className={estilos.topo}>
                  <span className={estilos.rotulo}>{definicao.rotulo}</span>
                  <span className={estilos.quantidade}>
                    <span className="numeros">{formatarNumero(quantidade)}</span>{' '}
                    {pluralizar(quantidade, 'conta', 'contas')}
                  </span>
                </span>
                <span className={estilos.descricao}>{definicao.descricao}</span>
                <span className={estilos.alcance}>
                  <span className={estilos.trilha} aria-hidden="true">
                    <span className={estilos.preenchido} style={{ '--parte': parte } as CSSProperties} />
                  </span>
                  <span className={estilos.textoDoAlcance}>
                    <span className="numeros">{formatarNumero(definicao.permissoes.length)}</span> de{' '}
                    <span className="numeros">{formatarNumero(total)}</span> permissões
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Painel>
  );
}
