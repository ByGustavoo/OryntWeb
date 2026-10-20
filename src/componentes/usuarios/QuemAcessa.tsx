import { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Globe, KeyRound, UserRound, UsersRound } from 'lucide-react';
import estilos from '@/componentes/objetos/DetalheObjeto.module.css';
import { Botao, Esqueleto } from '@/componentes/ui';
import type { PermissoesSobDemanda } from '@/ganchos/usePermissoesSobDemanda';
import { ehSuperusuario, linhasDoObjeto, PUBLICO, resumoDasOrigens, rotuloDoNivel } from '@/regras/permissoes';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import locais from './QuemAcessa.module.css';
import { SeloSituacaoPermissao } from './SeloSituacaoPermissao';

const RECOLHIDOS = 6;

interface QuemAcessaProps {
  objetoId: string;
  permissoes: PermissoesSobDemanda;
  aoVer: (objetoId: string, sujeito?: string) => void;
}

function listar(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1) ?? ''}`;
}

export function QuemAcessa({ objetoId, permissoes, aoVer }: QuemAcessaProps) {
  const [expandida, setExpandida] = useState(false);
  const { indice } = permissoes;

  const cabecalho = (quantidade: number | null) => (
    <h3 className={estilos.tituloSecao} id="titulo-quem-acessa">
      Quem acessa
      {quantidade === null ? null : <span className={`${estilos.contagem} numeros`}>{formatarNumero(quantidade)}</span>}
    </h3>
  );

  if (permissoes.falhou) {
    return (
      <section className={estilos.secao} aria-labelledby="titulo-quem-acessa">
        {cabecalho(null)}
        <p className={estilos.leitura}>O Orynt não conseguiu carregar as permissões deste banco.</p>
        <Botao variante="secundario" tamanho="sm" className={locais.acao} onClick={permissoes.recarregar}>
          Tentar de novo
        </Botao>
      </section>
    );
  }

  if (!indice) {
    return (
      <section className={estilos.secao} aria-labelledby="titulo-quem-acessa" aria-busy="true">
        {cabecalho(null)}
        <span className="visualmente-oculto" role="status">
          Carregando quem acessa este objeto…
        </span>
        <div className={locais.espera} aria-hidden="true">
          <Esqueleto largura="72%" altura={12} />
          <Esqueleto largura="100%" altura={44} raio="var(--raio-md)" />
          <Esqueleto largura="100%" altura={44} raio="var(--raio-md)" />
        </div>
      </section>
    );
  }

  if (!indice.objetos.has(objetoId)) {
    return (
      <section className={estilos.secao} aria-labelledby="titulo-quem-acessa">
        {cabecalho(null)}
        <p className={estilos.leitura}>Este objeto não está entre as permissões que o Orynt leu deste banco.</p>
      </section>
    );
  }

  const linhas = linhasDoObjeto(objetoId, indice).filter((linha) => linha.acesso.nivel !== 'NENHUM');
  const superusuarios = linhas.filter((linha) => ehSuperusuario(linha.acesso.sujeito, indice)).map((linha) => linha.chave);
  const proprias = linhas.filter((linha) => !ehSuperusuario(linha.acesso.sujeito, indice));
  const comPublico = proprias.some((linha) => linha.acesso.sujeito === PUBLICO);
  const papeis = proprias.length - (comPublico ? 1 : 0);
  const visiveis = expandida ? proprias : proprias.slice(0, RECOLHIDOS);

  const frase = [
    papeis === 0
      ? 'Nenhum papel tem acesso próprio além dos superusuários'
      : `${formatarNumero(papeis)} ${pluralizar(papeis, 'papel tem', 'papéis têm')} acesso próprio`,
    comPublico ? ', e PUBLIC dá o que está na primeira linha a todos os papéis' : '',
    '.',
    superusuarios.length > 0
      ? ` ${pluralizar(superusuarios.length, 'O superusuário', 'Os superusuários')} ${listar(superusuarios)} ${pluralizar(superusuarios.length, 'passa', 'passam')} por cima de qualquer permissão.`
      : '',
  ].join('');

  return (
    <section className={estilos.secao} aria-labelledby="titulo-quem-acessa">
      {cabecalho(proprias.length)}
      <p className={estilos.leitura}>{frase}</p>
      {visiveis.length > 0 ? (
        <ul className={estilos.objetos}>
          {visiveis.map((linha) => {
            const { sujeito } = linha.acesso;
            const papel = indice.papeis.get(sujeito);
            const Icone = sujeito === PUBLICO ? Globe : papel?.login ? UserRound : UsersRound;
            const [situacao] = linha.situacoes;
            return (
              <li key={linha.chave}>
                <button
                  type="button"
                  className={juntarClasses(estilos.objeto, estilos.objetoAbrivel)}
                  onClick={() => aoVer(objetoId, sujeito)}
                >
                  <Icone className={estilos.iconeObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                  <span className={estilos.textosObjeto}>
                    <span className={`${estilos.nomeObjeto} codigo`}>{sujeito}</span>
                    <span className={estilos.tipoObjeto}>
                      {rotuloDoNivel(linha.acesso)} · {resumoDasOrigens(linha.acesso)}
                    </span>
                  </span>
                  {situacao ? <SeloSituacaoPermissao situacao={situacao} /> : null}
                  <ChevronRight className={estilos.setaObjeto} size={16} strokeWidth={2} aria-hidden="true" />
                  <span className="visualmente-oculto">. Ver em Permissões de onde vem este acesso</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className={locais.acoes}>
        {proprias.length > RECOLHIDOS ? (
          <Botao
            variante="terciario"
            tamanho="sm"
            icone={expandida ? ChevronUp : ChevronDown}
            aria-expanded={expandida}
            onClick={() => setExpandida(!expandida)}
          >
            {expandida ? `Mostrar só os ${formatarNumero(RECOLHIDOS)} primeiros` : `Mostrar os ${formatarNumero(proprias.length)}`}
          </Botao>
        ) : null}
        <Botao variante="secundario" tamanho="sm" icone={KeyRound} iconeDireita={ChevronRight} onClick={() => aoVer(objetoId)}>
          Ver em Permissões
        </Botao>
      </div>
    </section>
  );
}
