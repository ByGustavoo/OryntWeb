import { useRef, useState } from 'react';
import { Database, Pencil, Plus, Trash2 } from 'lucide-react';
import { descreverFalha } from '@/api/tratamentoErros';
import { Botao, BotaoIcone, CabecalhoPainel, DialogoConfirmacao, EstadoVazio, Painel, Selo } from '@/componentes/ui';
import { ambiente } from '@/configuracoes/ambiente';
import type { ConexaoSalvaDTO } from '@/modelos/conexao';
import { useConexao } from '@/provedores/ProvedorConexao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { useNovaConexao } from '@/provedores/ProvedorNovaConexao';
import { enderecoConexao } from '@/regras/conexoesSalvas';
import { formatarTempoRelativo } from '@/utilitarios/formatacao';
import { ModalRenomearConexao } from './ModalRenomearConexao';
import estilosSecao from './SecaoConexao.module.css';
import estilos from './SecaoConexoesSalvas.module.css';

interface AcaoSobreConexao {
  conexao: ConexaoSalvaDTO;
  aberta: boolean;
  vez: number;
}

const DESCRICAO = ambiente.dadosSimulados
  ? 'Ficam guardadas neste navegador, sem a senha.'
  : 'Ficam guardadas na sua conta. A senha fica no servidor e nunca volta para o navegador.';

export function SecaoConexoesSalvas() {
  const { situacao, conexao: conexaoAtiva, salvas, alvo, ativarConexao, renomearConexao, excluirConexao } = useConexao();
  const { abrir: abrirNovaConexao } = useNovaConexao();
  const notificacoes = useNotificacoes();
  const [renomeacao, setRenomeacao] = useState<AcaoSobreConexao | null>(null);
  const [exclusao, setExclusao] = useState<AcaoSobreConexao | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const vez = useRef(0);

  if (situacao === 'INDISPONIVEL' && salvas.length === 0) return null;

  const iniciar = (conexao: ConexaoSalvaDTO): AcaoSobreConexao => {
    vez.current += 1;
    return { conexao, aberta: true, vez: vez.current };
  };

  const renomear = async (nome: string) => {
    if (!renomeacao) return;
    await renomearConexao(renomeacao.conexao.id, nome);
    setRenomeacao({ ...renomeacao, aberta: false });
    notificacoes.sucesso('Conexão renomeada.');
  };

  const excluir = async () => {
    if (!exclusao) return;
    setExcluindo(true);
    try {
      await excluirConexao(exclusao.conexao.id);
      notificacoes.sucesso('Conexão excluída.');
    } catch (erro) {
      notificacoes.erro('Não foi possível excluir a conexão.', descreverFalha(erro));
    } finally {
      setExcluindo(false);
      setExclusao({ ...exclusao, aberta: false });
    }
  };

  const exclusaoDaAtiva = exclusao?.conexao.id === conexaoAtiva?.id;

  return (
    <Painel aria-labelledby="titulo-secao-conexoes-salvas" className={estilosSecao.secao}>
      <CabecalhoPainel
        titulo={<span id="titulo-secao-conexoes-salvas">Conexões salvas</span>}
        descricao={DESCRICAO}
        acao={
          <Botao tamanho="sm" variante="secundario" icone={Plus} onClick={abrirNovaConexao}>
            Nova conexão
          </Botao>
        }
      />

      {salvas.length === 0 ? (
        <EstadoVazio
          compacto
          className={estilosSecao.vazio}
          icone={Database}
          titulo="Nenhuma conexão salva"
          descricao="Ao conectar a um banco, ele aparece aqui para você voltar com um clique."
        />
      ) : (
        <ul className={estilos.lista}>
          {salvas.map((salva) => {
            const ativa = salva.id === conexaoAtiva?.id;
            const conectando = salva.id === alvo?.id;
            return (
              <li className={estilos.linha} key={salva.id}>
                <div className={estilos.dados}>
                  <p className={estilos.identificacao}>
                    <span className={estilos.nome}>{salva.nome}</span>
                    {ativa ? (
                      <Selo tom="destaque" ponto className={estilos.emUso}>
                        Em uso
                      </Selo>
                    ) : null}
                  </p>
                  <p className={`${estilos.endereco} codigo`}>{enderecoConexao(salva)}</p>
                  <p className={estilos.uso}>Usada {formatarTempoRelativo(salva.ultimoUsoEm)}</p>
                </div>

                <div className={estilos.acoes}>
                  {ativa ? null : (
                    <Botao
                      tamanho="sm"
                      variante="secundario"
                      className={estilos.conectar}
                      carregando={conectando}
                      disabled={alvo !== null && !conectando}
                      onClick={() => void ativarConexao(salva)}
                      aria-label={`Conectar a ${salva.nome}`}
                    >
                      {conectando ? 'Conectando…' : 'Conectar'}
                    </Botao>
                  )}
                  <BotaoIcone icone={Pencil} rotulo={`Renomear ${salva.nome}`} onClick={() => setRenomeacao(iniciar(salva))} />
                  <BotaoIcone
                    icone={Trash2}
                    rotulo={`Excluir ${salva.nome}`}
                    disabled={conectando}
                    onClick={() => setExclusao(iniciar(salva))}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {renomeacao ? (
        <ModalRenomearConexao
          key={renomeacao.vez}
          conexao={renomeacao.conexao}
          aberto={renomeacao.aberta}
          aoFechar={() => setRenomeacao({ ...renomeacao, aberta: false })}
          aoRenomear={renomear}
        />
      ) : null}

      {exclusao ? (
        <DialogoConfirmacao
          aberto={exclusao.aberta}
          titulo={`Excluir ${exclusao.conexao.nome}?`}
          descricao={
            exclusaoDaAtiva
              ? 'Esta conexão está em uso: o Orynt fica sem banco conectado até você escolher outra. Nada é alterado no banco de dados.'
              : 'A conexão sai da sua lista. Nada é alterado no banco de dados.'
          }
          textoConfirmar="Excluir"
          destrutivo
          carregando={excluindo}
          aoConfirmar={excluir}
          aoCancelar={() => setExclusao({ ...exclusao, aberta: false })}
        />
      ) : null}
    </Painel>
  );
}
