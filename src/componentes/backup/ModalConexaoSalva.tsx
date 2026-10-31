import { Suspense, lazy, useEffect, useRef } from 'react';
import { FormularioConexao } from '@/componentes/conexao/FormularioConexao';
import { focarCampoConexao } from '@/componentes/conexao/identificadores';
import estilos from '@/componentes/conexao/ModalConexao.module.css';
import { Botao, Modal } from '@/componentes/ui';
import { ambiente } from '@/configuracoes/ambiente';
import { useFormularioConexaoSalva } from '@/ganchos/useFormularioConexaoSalva';
import type { ConexaoSalvaDTO } from '@/modelos/conexao';
import type { CamposDaUrl } from '@/regras/urlConexao';

const PainelSimulacao = ambiente.simulacaoControlavel ? lazy(() => import('@/componentes/conexao/PainelSimulacao')) : null;

const ID_FORMULARIO = 'formulario-conexao-salva';

interface ModalConexaoSalvaProps {
  conexao: ConexaoSalvaDTO | null;
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: (salva: ConexaoSalvaDTO) => void;
}

export function ModalConexaoSalva({ conexao, aberto, aoFechar, aoSalvar }: ModalConexaoSalvaProps) {
  const alertaRef = useRef<HTMLDivElement>(null);
  const testeRef = useRef<HTMLDivElement>(null);
  const fluxo = useFormularioConexaoSalva({ conexao, aoSalvar, aoEncontrarCampoInvalido: focarCampoConexao });
  const { fase, teste, enviando } = fluxo;
  const salvando = fase.tipo === 'ENVIANDO' && fase.operacao === 'SALVAR';
  const testando = fase.tipo === 'ENVIANDO' && fase.operacao === 'TESTAR';

  useEffect(() => {
    if (fase.tipo === 'ERRO') alertaRef.current?.focus();
  }, [fase]);

  useEffect(() => {
    if (teste) testeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [teste]);

  const fechar = () => {
    if (!enviando) aoFechar();
  };

  const preencherPelaUrl = (campos: CamposDaUrl) => {
    fluxo.preencher({ ...campos, nome: '' });
    focarCampoConexao(campos.senha ? 'nome' : 'senha');
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={fechar}
      titulo={conexao ? `Editar ${conexao.nome}` : 'Nova conexão'}
      descricao={
        conexao
          ? 'Corrija os dados de acesso. Os agendamentos desta conexão passam a usar os dados novos.'
          : 'A conexão fica salva na sua conta, sem trocar o banco que o Orynt está mostrando agora.'
      }
      tamanho="xl"
      rodape={
        <>
          <Botao variante="terciario" className={estilos.cancelar} onClick={enviando ? fluxo.cancelarTentativa : fechar}>
            Cancelar
          </Botao>
          <Botao variante="secundario" carregando={testando} disabled={salvando} onClick={fluxo.testar}>
            {testando ? 'Testando…' : 'Testar conexão'}
          </Botao>
          <Botao type="submit" form={ID_FORMULARIO} carregando={salvando} disabled={testando} className={estilos.conectar}>
            {salvando ? 'Salvando…' : 'Salvar conexão'}
          </Botao>
        </>
      }
    >
      <div className={estilos.conteudo}>
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
          aoConectar={fluxo.salvar}
          aoTestar={fluxo.testar}
          senhaOpcional={conexao !== null}
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
