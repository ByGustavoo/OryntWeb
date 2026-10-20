import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeftRight, ChevronDown, ChevronRight, ChevronUp, FlaskConical, Info, OctagonAlert, TriangleAlert } from 'lucide-react';
import { SecaoCopiavel } from '@/componentes/objetos/DetalheObjeto';
import estilos from '@/componentes/objetos/DetalheObjeto.module.css';
import proprios from '@/componentes/objetos/DetalheTabela.module.css';
import { NomeObjeto } from '@/componentes/objetos/NomeObjeto';
import { Botao, BotaoIcone, Modal, Nota, Selo } from '@/componentes/ui';
import type { ModoPermissoes, Privilegio } from '@/modelos/permissoes';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import {
  comandosDoAcesso,
  comandosParaConceder,
  efeitoDoPrivilegio,
  formasDeTirar,
  fraseDaOrigem,
  fraseDaSituacao,
  nomeCompleto,
  PUBLICO,
  rotuloDoSujeito,
  rotuloTipoObjetoPermissao,
  semUsageNoEsquema,
  tomDaSituacaoPermissao,
} from '@/regras/permissoes';
import type { Acesso, IndiceDasPermissoes, LinhaPermissao } from '@/regras/permissoes';
import { formatarNumero } from '@/utilitarios/formatacao';
import locais from './DetalheAcesso.module.css';
import { iconeDoTipoObjetoPermissao, SeloNivel, SeloSituacaoPermissao } from './SeloSituacaoPermissao';

const telaDoObjeto: Partial<Record<string, string>> = {
  TABELA: 'Tabelas',
  VISAO: 'Visões',
  VISAO_MATERIALIZADA: 'Visões',
  FUNCAO: 'Funções',
  PROCEDIMENTO: 'Funções',
};

export interface AcoesDoDetalheAcesso {
  aoAbrirPapel: (nome: string) => void;
  aoAbrirObjeto: (acesso: Acesso) => void;
  aoVerPorPapel: (sujeito: string) => void;
  aoVerPorObjeto: (objetoId: string) => void;
  aoComparar: (sujeito: string) => void;
}

interface DetalheAcessoProps extends AcoesDoDetalheAcesso {
  modo: ModoPermissoes;
  linhas: LinhaPermissao[] | null;
  diferencas: Privilegio[][] | null;
  indice: IndiceDasPermissoes | null;
  papelDaConexao: string;
  simulada: boolean;
  posicao: number | null;
  total: number;
  aoPercorrer: (sentido: SentidoDoPasso) => void;
  aoFechar: () => void;
  focoAoFechar: () => HTMLElement | null;
}

const palavraDoPasso: Record<ModoPermissoes, [singular: string, anterior: string, seguinte: string]> = {
  PAPEL: ['Objeto', 'Objeto anterior', 'Próximo objeto'],
  OBJETO: ['Papel', 'Papel anterior', 'Próximo papel'],
  COMPARACAO: ['Objeto', 'Objeto anterior', 'Próximo objeto'],
};

function tituloDoDetalhe(modo: ModoPermissoes, linhas: LinhaPermissao[]): string {
  const [primeira, segunda] = linhas;
  if (!primeira) return 'Acesso';
  if (modo === 'COMPARACAO' && segunda) {
    return `Acesso de ${rotuloDoSujeito(primeira.acesso.sujeito)} e ${rotuloDoSujeito(segunda.acesso.sujeito)}`;
  }
  return `Acesso de ${rotuloDoSujeito(primeira.acesso.sujeito)}`;
}

export function DetalheAcesso({
  modo,
  linhas,
  diferencas,
  indice,
  papelDaConexao,
  simulada,
  posicao,
  total,
  aoPercorrer,
  aoFechar,
  focoAoFechar,
  ...acoes
}: DetalheAcessoProps) {
  const [exibidas, setExibidas] = useState(linhas);
  const [exibidoModo, setExibidoModo] = useState(modo);
  if (linhas && linhas !== exibidas) {
    setExibidas(linhas);
    setExibidoModo(modo);
  }
  const [singular, anterior, seguinte] = palavraDoPasso[exibidoModo];
  const temAnterior = posicao !== null && posicao > 1;
  const temSeguinte = posicao !== null && posicao < total;
  const primeira = exibidas?.[0] ?? null;

  return (
    <Modal
      aberto={linhas !== null}
      aoFechar={aoFechar}
      titulo={exibidas ? tituloDoDetalhe(exibidoModo, exibidas) : 'Acesso'}
      descricao={
        primeira ? `${rotuloTipoObjetoPermissao[primeira.acesso.objeto.tipo]} ${nomeCompleto(primeira.acesso.objeto)}` : undefined
      }
      tamanho="lg"
      focoAoFechar={focoAoFechar}
      rodape={
        <div className={estilos.navegacao}>
          <div className={estilos.passos} role="group" aria-label="Percorrer a lista">
            <BotaoIcone
              icone={ChevronUp}
              rotulo={anterior}
              variante="secundario"
              aria-disabled={temAnterior ? undefined : true}
              onClick={() => temAnterior && aoPercorrer(-1)}
            />
            <BotaoIcone
              icone={ChevronDown}
              rotulo={seguinte}
              variante="secundario"
              aria-disabled={temSeguinte ? undefined : true}
              onClick={() => temSeguinte && aoPercorrer(1)}
            />
          </div>
          <p className={estilos.posicao} role="status">
            {posicao !== null ? (
              <>
                <span className={estilos.palavraDaPosicao}>{singular} </span>
                <span className="numeros">{formatarNumero(posicao)}</span> de <span className="numeros">{formatarNumero(total)}</span>
              </>
            ) : (
              'Fora dos filtros da lista'
            )}
          </p>
        </div>
      }
    >
      {exibidas && primeira && indice ? (
        <CorpoDetalhe
          key={`${exibidoModo}-${exibidas.map((item) => `${item.acesso.sujeito}-${item.acesso.objeto.id}`).join('|')}`}
          modo={exibidoModo}
          linhas={exibidas}
          diferencas={diferencas}
          indice={indice}
          papelDaConexao={papelDaConexao}
          simulada={simulada}
          {...acoes}
        />
      ) : null}
    </Modal>
  );
}

interface CorpoDetalheProps extends AcoesDoDetalheAcesso {
  modo: ModoPermissoes;
  linhas: LinhaPermissao[];
  diferencas: Privilegio[][] | null;
  indice: IndiceDasPermissoes;
  papelDaConexao: string;
  simulada: boolean;
}

function CorpoDetalhe({ modo, linhas, diferencas, indice, papelDaConexao, simulada, ...acoes }: CorpoDetalheProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const [primeira] = linhas;

  useLayoutEffect(() => {
    raiz.current?.parentElement?.scrollTo({ top: 0 });
  }, []);

  if (!primeira) return null;
  const { objeto } = primeira.acesso;
  const Icone = iconeDoTipoObjetoPermissao[objeto.tipo];
  const tela = telaDoObjeto[objeto.tipo];

  return (
    <div ref={raiz} className={estilos.detalhe}>
      <header className={estilos.identidade}>
        <p className={`${estilos.nome} codigo`}>
          <NomeObjeto esquema={objeto.esquema} nome={objeto.nome} classeEsquema={estilos.esquema} />
        </p>
        <p className={estilos.descricao}>
          {rotuloTipoObjetoPermissao[objeto.tipo]} de {objeto.dono}
          {objeto.segurancaDefinidor ? ', que roda com os privilégios do dono (SECURITY DEFINER)' : ''}.
        </p>
        <div className={estilos.selos}>
          <Selo tom="neutro" icone={Icone}>
            {rotuloTipoObjetoPermissao[objeto.tipo]}
          </Selo>
          {simulada ? (
            <Selo tom="aviso" icone={FlaskConical}>
              Dados demonstrativos
            </Selo>
          ) : null}
        </div>
      </header>

      {linhas.map((linha, posicao) => (
        <LadoDoAcesso
          key={linha.acesso.sujeito}
          linha={linha}
          diferenca={diferencas?.[posicao] ?? null}
          comparando={linhas.length > 1}
          indice={indice}
          papelDaConexao={papelDaConexao}
          aoAbrirPapel={acoes.aoAbrirPapel}
        />
      ))}

      <section className={estilos.secao} aria-labelledby="titulo-caminhos-acesso">
        <h3 className={estilos.tituloSecao} id="titulo-caminhos-acesso">
          Ver também
        </h3>
        <div className={locais.caminhos}>
          {modo !== 'OBJETO' ? (
            <Botao variante="secundario" tamanho="sm" iconeDireita={ChevronRight} onClick={() => acoes.aoVerPorObjeto(objeto.id)}>
              Todos que acessam {objeto.nome}
            </Botao>
          ) : null}
          {linhas.map((linha) =>
            modo !== 'PAPEL' || linhas.length > 1 ? (
              <Botao
                key={`papel-${linha.acesso.sujeito}`}
                variante="secundario"
                tamanho="sm"
                iconeDireita={ChevronRight}
                onClick={() => acoes.aoVerPorPapel(linha.acesso.sujeito)}
              >
                Tudo o que {rotuloDoSujeito(linha.acesso.sujeito)} acessa
              </Botao>
            ) : null,
          )}
          {modo !== 'COMPARACAO' && primeira.acesso.sujeito !== PUBLICO ? (
            <Botao
              variante="secundario"
              tamanho="sm"
              icone={ArrowLeftRight}
              onClick={() => acoes.aoComparar(primeira.acesso.sujeito)}
            >
              Comparar {primeira.acesso.sujeito} com outro papel
            </Botao>
          ) : null}
          {tela ? (
            <Botao variante="secundario" tamanho="sm" iconeDireita={ChevronRight} onClick={() => acoes.aoAbrirObjeto(primeira.acesso)}>
              Abrir em {tela}
            </Botao>
          ) : null}
        </div>
      </section>
    </div>
  );
}

interface LadoDoAcessoProps {
  linha: LinhaPermissao;
  diferenca: Privilegio[] | null;
  comparando: boolean;
  indice: IndiceDasPermissoes;
  papelDaConexao: string;
  aoAbrirPapel: (nome: string) => void;
}

function LadoDoAcesso({ linha, diferenca, comparando, indice, papelDaConexao, aoAbrirPapel }: LadoDoAcessoProps) {
  const { acesso } = linha;
  const { sujeito } = acesso;
  const papel = indice.papeis.get(sujeito);
  const comandos = comandosDoAcesso(linha, indice);
  const formas = acesso.nivel === 'NENHUM' ? [] : formasDeTirar(acesso);
  const conceder = acesso.nivel === 'NENHUM' ? comandosParaConceder(acesso, indice) : [];
  const idBase = `acesso-${sujeito.replace(/[^\w-]/g, '_')}`;
  const semUsage = acesso.nivel !== 'NENHUM' && !linha.situacoes.includes('SEM_USAGE') && semUsageNoEsquema(acesso, indice);

  return (
    <section className={locais.lado} aria-labelledby={`${idBase}-titulo`}>
      <div className={locais.cabecalhoDoLado}>
        <h3 className={locais.sujeito} id={`${idBase}-titulo`}>
          <span className="codigo">{rotuloDoSujeito(sujeito)}</span>
          {sujeito === papelDaConexao ? (
            <Selo tom="destaque" titulo="O papel com que o Orynt está conectado">
              Você
            </Selo>
          ) : null}
        </h3>
        <div className={estilos.selos}>
          <SeloNivel acesso={acesso} />
          {linha.situacoes.map((situacao) => (
            <SeloSituacaoPermissao key={situacao} situacao={situacao} />
          ))}
        </div>
        <p className={estilos.descricao}>
          {sujeito === PUBLICO
            ? 'Vale para todos os papéis do servidor que conectam a este banco.'
            : `${papel?.login ? 'Usuário' : 'Grupo'}${papel?.superusuario ? ' superusuário' : ''}${papel?.descricao ? `: ${papel.descricao}` : '.'}`}
        </p>
        {papel ? (
          <Botao
            variante="terciario"
            tamanho="sm"
            iconeDireita={ChevronRight}
            className={locais.abrirPapel}
            onClick={() => aoAbrirPapel(sujeito)}
          >
            Abrir {sujeito} em Papéis
          </Botao>
        ) : null}
      </div>

      {linha.situacoes.map((situacao) => (
        <Nota
          key={situacao}
          tom={tomDaSituacaoPermissao[situacao]}
          icone={tomDaSituacaoPermissao[situacao] === 'erro' ? OctagonAlert : TriangleAlert}
        >
          {fraseDaSituacao(situacao, acesso, indice)}
        </Nota>
      ))}

      {semUsage ? (
        <Nota tom="aviso" icone={TriangleAlert}>
          Sem USAGE no esquema {acesso.objeto.esquema}, nada disto funciona: o PostgreSQL recusa o acesso antes de olhar os
          privilégios do objeto.
        </Nota>
      ) : null}

      {comandos.map((comando, posicao) => (
        <SecaoCopiavel
          key={comando.situacao}
          id={`${idBase}-comando-${posicao}`}
          titulo={comando.rotulo}
          texto={comando.comando}
          copiado="Copiado"
          anuncio="Comando copiado para a área de transferência."
          tituloDoErro="Não foi possível copiar o comando"
          descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o texto do comando e copie por lá."
        >
          <p className={estilos.leitura}>{comando.explicacao}</p>
        </SecaoCopiavel>
      ))}

      <div className={locais.subsecao}>
        <h4 className={estilos.rotuloGrupo}>{comparando ? `O que ${rotuloDoSujeito(sujeito)} pode` : 'O que pode fazer'}</h4>
        {acesso.privilegios.length > 0 ? (
          <dl className={proprios.ajustes}>
            {acesso.privilegios.map((item) => (
              <div key={item.privilegio} className={proprios.ajuste}>
                <dt className={proprios.rotuloAjuste}>
                  <span className={locais.privilegio}>
                    <span className="codigo">{item.privilegio}</span>
                    {diferenca?.includes(item.privilegio) ? (
                      <Selo tom="destaque" titulo="O outro papel não tem este privilégio">
                        Só {rotuloDoSujeito(sujeito)}
                      </Selo>
                    ) : null}
                  </span>
                  {item.colunas ? <span className={`${proprios.parametro} codigo`}>{item.colunas.join(', ')}</span> : null}
                </dt>
                <dd className={proprios.efeitoAjuste}>
                  {efeitoDoPrivilegio(item.privilegio, acesso.objeto.tipo)}
                  {item.colunas ? ' Só nas colunas indicadas.' : ''}
                  <ul className={locais.origens}>
                    {item.origens.map((origem, posicao) => (
                      <li key={posicao}>{fraseDaOrigem(origem, sujeito)}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={estilos.leitura}>
            Nenhum privilégio neste objeto, nem por grupo nem por PUBLIC.
            {papel && !papel.membroDe.every((participacao) => participacao.herda)
              ? ' Os grupos de que participa sem herdar só valem depois de SET ROLE.'
              : ''}
          </p>
        )}
      </div>

      {formas.length > 0 ? (
        <div className={locais.subsecao}>
          <h4 className={estilos.rotuloGrupo}>Como tirar este acesso</h4>
          <ul className={locais.formas}>
            {formas.map((forma) => (
              <li key={forma.texto} className={locais.forma}>
                <Info size={14} strokeWidth={2} aria-hidden="true" className={locais.iconeForma} />
                <span>
                  {forma.texto}
                  {forma.comando ? (
                    <>
                      {' '}
                      <span className="codigo">{forma.comando}</span>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {conceder.length > 0 ? (
        <SecaoCopiavel
          id={`${idBase}-conceder`}
          titulo={conceder.length > 1 ? 'Comandos que concedem o acesso mínimo' : 'Comando que concede o acesso mínimo'}
          texto={conceder.join('\n')}
          copiado="Copiado"
          anuncio="Comando copiado para a área de transferência."
          tituloDoErro="Não foi possível copiar o comando"
          descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o texto do comando e copie por lá."
        >
          <p className={estilos.leitura}>
            {conceder.length > 1
              ? `Sem USAGE no esquema ${acesso.objeto.esquema}, o privilégio no objeto não funcionaria, por isso ele vem primeiro. `
              : ''}
            Conceda a um grupo, e não ao usuário, quando mais de um papel precisa do mesmo acesso. O Orynt não executa nada no
            banco.
          </p>
        </SecaoCopiavel>
      ) : null}
    </section>
  );
}
