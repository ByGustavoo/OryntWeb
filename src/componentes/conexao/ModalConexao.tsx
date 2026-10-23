import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Botao, Modal, Nota } from '@/componentes/ui';
import { ambiente } from '@/configuracoes/ambiente';
import { useFluxoConexao } from '@/ganchos/useFluxoConexao';
import type { ConexaoDTO } from '@/modelos/conexao';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { CamposDaUrl } from '@/regras/urlConexao';
import { FormularioConexao } from './FormularioConexao';
import { focarCampoConexao } from './identificadores';
import estilos from './ModalConexao.module.css';

const PainelSimulacao = ambiente.simulacaoControlavel ? lazy(() => import('./PainelSimulacao')) : null;

const ID_FORMULARIO = 'formulario-conexao';

interface ModalConexaoProps {
  aberto: boolean;
  aoFechar: () => void;
  aoConectar: (conexao: ConexaoDTO) => void;
}

export default function ModalConexao({ aberto, aoFechar, aoConectar }: ModalConexaoProps) {
  const { conexao: conexaoAtiva, salvas } = useConexao();
  const [primeiraConexao] = useState(() => conexaoAtiva === null && salvas.length === 0);
  const alertaRef = useRef<HTMLDivElement>(null);
  const testeRef = useRef<HTMLDivElement>(null);

  const fluxo = useFluxoConexao({ aoConectar, aoEncontrarCampoInvalido: focarCampoConexao });
  const { fase, teste, enviando, descartarSenha } = fluxo;
  const conectando = fase.tipo === 'ENVIANDO' && fase.operacao === 'CONECTAR';
  const testando = fase.tipo === 'ENVIANDO' && fase.operacao === 'TESTAR';
  const conexaoSubstituida = fase.tipo === 'SUCESSO' ? null : conexaoAtiva;

  useEffect(() => {
    if (fase.tipo === 'ERRO') alertaRef.current?.focus();
  }, [fase]);

  useEffect(() => {
    if (teste) testeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [teste]);

  const fechar = useCallback(() => {
    if (enviando) return;
    descartarSenha();
    aoFechar();
  }, [enviando, descartarSenha, aoFechar]);

  const preencherPelaUrl = (campos: CamposDaUrl) => {
    fluxo.preencher({ ...campos, nome: '' });
    focarCampoConexao(campos.senha ? 'nome' : 'senha');
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={fechar}
      titulo={primeiraConexao ? 'Conectar ao banco de dados' : 'Nova conexão'}
      descricao="Informe os dados de acesso do seu PostgreSQL ou cole a URL de conexão para preencher os campos."
      tamanho="xl"
      rodape={
        <>
          <Botao variante="terciario" className={estilos.cancelar} onClick={enviando ? fluxo.cancelarTentativa : fechar}>
            Cancelar
          </Botao>
          <Botao variante="secundario" carregando={testando} disabled={conectando} onClick={fluxo.testar}>
            {testando ? 'Testando…' : 'Testar conexão'}
          </Botao>
          <Botao type="submit" form={ID_FORMULARIO} carregando={conectando} disabled={testando} className={estilos.conectar}>
            {conectando ? 'Conectando…' : 'Conectar'}
          </Botao>
        </>
      }
    >
      <div className={estilos.conteudo}>
        {conexaoSubstituida ? (
          <div className={estilos.avisos}>
            <Nota tom="info">
              Você está conectado a <strong>{conexaoSubstituida.nome}</strong>. Ao conectar, o Orynt passa a mostrar o novo
              banco, e a conexão atual continua salva.
            </Nota>
          </div>
        ) : null}

        <FormularioConexao
          id={ID_FORMULARIO}
          campos={fluxo.campos}
          erros={fluxo.erros}
          operacaoEmAndamento={fase.tipo === 'ENVIANDO' ? fase.operacao : null}
          falha={fase.tipo === 'ERRO' ? { falha: fase.falha, operacao: fase.operacao } : null}
          teste={teste}
          alertaRef={alertaRef}
          testeRef={testeRef}
          aoAlterar={fluxo.alterarCampo}
          aoSair={fluxo.validarAoSair}
          aoPreencherPelaUrl={preencherPelaUrl}
          aoConectar={fluxo.conectar}
          aoTestar={fluxo.testar}
        >
          {PainelSimulacao ? (
            <Suspense fallback={null}>
              <PainelSimulacao />
            </Suspense>
          ) : null}
        </FormularioConexao>
      </div>
    </Modal>
  );
}
