import { useMemo, useState } from 'react';
import { ChevronRight, DatabaseBackup, SearchX } from 'lucide-react';
import { Botao, CaixaMarcacao, CampoBusca, EstadoVazio, GrupoOpcoes, Nota } from '@/componentes/ui';
import type { ObjetoBackupDTO, SelecaoObjetos, TipoBackup } from '@/modelos/backup';
import { descricaoBancoInteiro } from '@/regras/backup';
import {
  MOTIVO_SEM_DADOS,
  agruparObjetos,
  alternarIds,
  descreverQuantidadesPorTipo,
  estadoDaMarcacao,
  filtrarObjetos,
  objetosAceitos,
  rotuloTipoObjetoBackup,
  tamanhoDaSelecao,
  tipoAceitaNoBackup,
} from '@/regras/selecaoObjetosBackup';
import { formatarNumero, formatarTamanho, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './ArvoreObjetos.module.css';

type ModoDaSelecao = SelecaoObjetos['modo'];

const opcoesDoModo: { valor: ModoDaSelecao; rotulo: string }[] = [
  { valor: 'BANCO_INTEIRO', rotulo: 'Banco inteiro' },
  { valor: 'ESCOLHIDOS', rotulo: 'Escolher objetos' },
];

interface ArvoreObjetosProps {
  objetos: ObjetoBackupDTO[];
  tipo: TipoBackup;
  selecao: SelecaoObjetos;
  erro?: string;
  aoMudar: (selecao: SelecaoObjetos) => void;
}

interface LinhaDoGrupoProps {
  rotulo: string;
  ids: string[];
  marcados: ReadonlySet<string>;
  aberto: boolean;
  motivo?: string | null;
  codigo?: boolean;
  aoAlternarAberto: () => void;
  aoMarcar: (marcar: boolean) => void;
}

function LinhaDoGrupo({ rotulo, ids, marcados, aberto, motivo, codigo, aoAlternarAberto, aoMarcar }: LinhaDoGrupoProps) {
  const estado = estadoDaMarcacao(ids, marcados);
  const quantos = ids.filter((id) => marcados.has(id)).length;
  return (
    <div className={estilos.linhaGrupo}>
      <button type="button" className={estilos.abrir} aria-expanded={aberto} aria-label={`${aberto ? 'Recolher' : 'Expandir'} ${rotulo}`} onClick={aoAlternarAberto}>
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" className={juntarClasses(estilos.seta, aberto && estilos.setaAberta)} />
      </button>
      <CaixaMarcacao
        className={estilos.caixaGrupo}
        marcada={estado === 'MARCADA'}
        parcial={estado === 'PARCIAL'}
        codigo={codigo}
        motivoDesabilitada={motivo}
        aoMudar={() => aoMarcar(estado !== 'MARCADA')}
      >
        {rotulo}
      </CaixaMarcacao>
      {motivo ? null : (
        <span className={`${estilos.contagem} numeros`}>
          {formatarNumero(quantos)} de {formatarNumero(ids.length)}
        </span>
      )}
    </div>
  );
}

export function ArvoreObjetos({ objetos, tipo, selecao, erro, aoMudar }: ArvoreObjetosProps) {
  const [busca, setBusca] = useState('');
  const [recolhidos, setRecolhidos] = useState<ReadonlySet<string>>(() => new Set());
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => new Set());
  const aceitos = useMemo(() => objetosAceitos(objetos, tipo), [objetos, tipo]);
  const visiveis = useMemo(() => filtrarObjetos(objetos, busca), [objetos, busca]);
  const grupos = useMemo(() => agruparObjetos(visiveis), [visiveis]);
  const procurando = busca.trim() !== '';
  const marcados = useMemo(() => new Set(selecao.modo === 'ESCOLHIDOS' ? selecao.objetos : []), [selecao]);
  const idsMarcados = selecao.modo === 'ESCOLHIDOS' ? selecao.objetos : aceitos.map((objeto) => objeto.id);
  const tamanho = tamanhoDaSelecao(selecao, objetos, tipo);
  const quantidade = idsMarcados.length;

  const marcar = (ids: string[], marcando: boolean) => {
    if (selecao.modo !== 'ESCOLHIDOS') return;
    aoMudar({ modo: 'ESCOLHIDOS', objetos: alternarIds(selecao.objetos, ids, marcando) });
  };

  const idsAceitos = (lista: ObjetoBackupDTO[]) => lista.filter((objeto) => tipoAceitaNoBackup(objeto.tipo, tipo)).map((objeto) => objeto.id);

  const mudarModo = (modo: ModoDaSelecao) => {
    if (modo === selecao.modo) return;
    aoMudar(modo === 'BANCO_INTEIRO' ? { modo } : { modo, objetos: [] });
  };

  const alternarEsquema = (esquema: string) =>
    setRecolhidos((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(esquema)) proximos.delete(esquema);
      else proximos.add(esquema);
      return proximos;
    });

  const alternarTipo = (chave: string) =>
    setAbertos((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(chave)) proximos.delete(chave);
      else proximos.add(chave);
      return proximos;
    });

  if (objetos.length === 0) {
    return <EstadoVazio compacto icone={DatabaseBackup} titulo="Este banco não tem objetos" descricao="Tabelas, views e funções aparecem aqui assim que existirem no banco." />;
  }

  return (
    <div className={estilos.arvore}>
      <GrupoOpcoes rotulo="O que entra no backup" opcoes={opcoesDoModo} valor={selecao.modo} aoMudar={mudarModo} />

      <p className={estilos.resumo} role="status">
        <strong className="numeros">
          {formatarNumero(quantidade)} {pluralizar(quantidade, 'objeto', 'objetos')}
        </strong>
        {quantidade > 0 ? ` · ${descreverQuantidadesPorTipo(idsMarcados, objetos)}` : ''}
        {tamanho > 0 ? ` · ${formatarTamanho(tamanho)} no banco` : ''}
      </p>

      {selecao.modo === 'BANCO_INTEIRO' ? (
        <Nota tom="info">{descricaoBancoInteiro[tipo]}</Nota>
      ) : (
        <>
          <div className={estilos.ferramentas}>
            <CampoBusca
              rotulo="Buscar objetos"
              placeholder="Nome do objeto ou do esquema"
              valor={busca}
              aoMudar={setBusca}
              className={estilos.busca}
            />
            <div className={estilos.atalhos}>
              <Botao variante="terciario" tamanho="sm" onClick={() => marcar(idsAceitos(visiveis), true)}>
                Marcar todos
              </Botao>
              <Botao variante="terciario" tamanho="sm" disabled={selecao.objetos.length === 0} onClick={() => aoMudar({ modo: 'ESCOLHIDOS', objetos: [] })}>
                Limpar
              </Botao>
            </div>
          </div>

          {grupos.length === 0 ? (
            <EstadoVazio compacto icone={SearchX} titulo="Nenhum objeto encontrado" descricao="Tente outra parte do nome." />
          ) : (
            <ul className={estilos.esquemas} aria-label="Objetos do banco por esquema">
              {grupos.map((grupo) => {
                const esquemaAberto = procurando || !recolhidos.has(grupo.esquema);
                return (
                  <li key={grupo.esquema} className={estilos.esquema}>
                    <LinhaDoGrupo
                      rotulo={grupo.esquema}
                      codigo
                      ids={idsAceitos(grupo.objetos)}
                      marcados={marcados}
                      aberto={esquemaAberto}
                      aoAlternarAberto={() => alternarEsquema(grupo.esquema)}
                      aoMarcar={(marcando) => marcar(idsAceitos(grupo.objetos), marcando)}
                    />
                    {esquemaAberto ? (
                      <ul className={estilos.tipos}>
                        {grupo.tipos.map(({ tipo: tipoDoObjeto, objetos: doTipo }) => {
                          const chave = `${grupo.esquema}-${tipoDoObjeto}`;
                          const aceito = tipoAceitaNoBackup(tipoDoObjeto, tipo);
                          const tipoAberto = aceito && (procurando || abertos.has(chave));
                          const ids = aceito ? doTipo.map((objeto) => objeto.id) : [];
                          return (
                            <li key={chave}>
                              <LinhaDoGrupo
                                rotulo={rotuloTipoObjetoBackup[tipoDoObjeto][1]}
                                ids={ids}
                                marcados={marcados}
                                aberto={tipoAberto}
                                motivo={aceito ? null : MOTIVO_SEM_DADOS}
                                aoAlternarAberto={() => alternarTipo(chave)}
                                aoMarcar={(marcando) => marcar(ids, marcando)}
                              />
                              {tipoAberto ? (
                                <ul className={estilos.objetos}>
                                  {doTipo.map((objeto) => (
                                    <li key={objeto.id} className={estilos.objeto}>
                                      <CaixaMarcacao
                                        className={estilos.caixaObjeto}
                                        codigo
                                        marcada={marcados.has(objeto.id)}
                                        aoMudar={(marcando) => marcar([objeto.id], marcando)}
                                      >
                                        {objeto.nome}
                                      </CaixaMarcacao>
                                      {objeto.tamanhoBytes !== null ? <span className={`${estilos.tamanho} numeros`}>{formatarTamanho(objeto.tamanhoBytes)}</span> : null}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {erro ? (
        <Nota tom="erro" role="alert">
          {erro}
        </Nota>
      ) : null}
    </div>
  );
}
