import { Check, Minus } from 'lucide-react';
import { CaixaMarcacao, CampoSelecao, Selo } from '@/componentes/ui';
import type { CodigoPermissao, PerfilConta } from '@/modelos/administracao';
import { formatarNumero, iniciarComMaiuscula } from '@/utilitarios/formatacao';
import type { OrigemDaPermissao } from '@/regras/permissoesConta';
import { gruposDePermissoes, origemDaPermissao, perfis, personalizada, rotuloDaPermissao } from '@/regras/permissoesConta';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './EditorDePermissoes.module.css';

export interface EscolhaDePermissoes {
  perfil: PerfilConta;
  permissoes: CodigoPermissao[];
}

interface EditorDePermissoesProps {
  idBase: string;
  escolha: EscolhaDePermissoes;
  original: EscolhaDePermissoes | null;
  bloqueio: (codigo: CodigoPermissao, marcada: boolean) => string | null;
  aoMarcar: (codigo: CodigoPermissao, marcada: boolean) => void;
  aoTrocarPerfil: (perfil: PerfilConta) => void;
  aoVoltarAoPerfil: () => void;
  foraDoAlcance: CodigoPermissao[];
  desabilitado?: boolean;
}

const textoDaOrigem: Record<OrigemDaPermissao, string> = {
  DO_PERFIL: 'do perfil',
  CONCEDIDA_A_PARTE: 'concedida à parte',
  REVOGADA_DO_PERFIL: 'revogada do perfil',
  FORA_DO_PERFIL: 'fora do perfil',
};

const opcoesDePerfil = perfis.map((definicao) => ({ valor: definicao.perfil, rotulo: definicao.rotulo, descricao: definicao.descricao }));

const classeDaOrigem: Record<OrigemDaPermissao, string | undefined> = {
  DO_PERFIL: undefined,
  CONCEDIDA_A_PARTE: estilos.aParte,
  REVOGADA_DO_PERFIL: estilos.revogada,
  FORA_DO_PERFIL: undefined,
};

function Estado({ concedida, mudou, origem }: { concedida: boolean; mudou: boolean; origem: OrigemDaPermissao }) {
  if (mudou) {
    return (
      <Selo tom="destaque" icone={concedida ? Check : Minus}>
        {concedida ? 'Vai conceder' : 'Vai revogar'}
      </Selo>
    );
  }
  return <span className={juntarClasses(estilos.origem, classeDaOrigem[origem])}>{iniciarComMaiuscula(textoDaOrigem[origem])}</span>;
}

export function EditorDePermissoes({
  idBase,
  escolha,
  original,
  bloqueio,
  aoMarcar,
  aoTrocarPerfil,
  aoVoltarAoPerfil,
  foraDoAlcance,
  desabilitado = false,
}: EditorDePermissoesProps) {
  const ehPersonalizada = personalizada(escolha.perfil, escolha.permissoes);
  const total = gruposDePermissoes.reduce((soma, grupo) => soma + grupo.permissoes.length, 0);

  return (
    <div className={estilos.editor}>
      <div className={estilos.perfil}>
        <CampoSelecao
          id={`${idBase}-perfil`}
          rotulo="Perfil"
          className={estilos.selecaoPerfil}
          opcoes={opcoesDePerfil}
          valor={escolha.perfil}
          aoMudar={(perfil) => perfil && aoTrocarPerfil(perfil)}
          desabilitado={desabilitado}
          dica="O perfil traz um conjunto de permissões. Marque ou desmarque abaixo para ajustar só esta conta."
        />
        <div className={estilos.resumoPerfil}>
          <p className={estilos.contagem} aria-live="polite">
            <span className="numeros">{formatarNumero(escolha.permissoes.length)}</span> de{' '}
            <span className="numeros">{formatarNumero(total)}</span> permissões
          </p>
          {ehPersonalizada ? (
            <div className={estilos.personalizada}>
              <Selo tom="info" titulo="As permissões desta conta não são exatamente as do perfil.">
                Personalizado
              </Selo>
              <button type="button" className={estilos.voltar} onClick={aoVoltarAoPerfil} disabled={desabilitado}>
                Voltar ao do perfil
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {foraDoAlcance.length > 0 ? (
        <p className={estilos.foraDoAlcance}>
          O perfil também traz {foraDoAlcance.map((codigo) => `“${rotuloDaPermissao(codigo)}”`).join(', ')}, que a sua conta não tem e
          por isso não pode conceder.
        </p>
      ) : null}

      <div className={estilos.grupos}>
        {gruposDePermissoes.map((grupo) => (
          <fieldset key={grupo.chave} className={estilos.grupo} disabled={desabilitado}>
            <legend className={estilos.tituloGrupo}>{grupo.titulo}</legend>
            <ul className={estilos.lista}>
              {grupo.permissoes.map((definicao) => {
                const marcada = escolha.permissoes.includes(definicao.codigo);
                const antes = original ? original.permissoes.includes(definicao.codigo) : marcada;
                const mudou = original !== null && antes !== marcada;
                const motivo = bloqueio(definicao.codigo, marcada);
                const origem = origemDaPermissao(escolha.perfil, escolha.permissoes, definicao.codigo);
                return (
                  <li key={definicao.codigo} className={juntarClasses(estilos.item, mudou && estilos.itemMudou)}>
                    <CaixaMarcacao
                      marcada={marcada}
                      aoMudar={(nova) => aoMarcar(definicao.codigo, nova)}
                      descricao={definicao.descricao}
                      motivoDesabilitada={motivo}
                      className={estilos.caixa}
                    >
                      {definicao.rotulo}
                    </CaixaMarcacao>
                    <span className={estilos.estado}>
                      <Estado concedida={marcada} mudou={mudou} origem={origem} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
