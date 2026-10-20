import { useId, useState } from 'react';
import { OctagonAlert } from 'lucide-react';
import { ErroApi } from '@/api/ErroApi';
import { descreverFalha } from '@/api/tratamentoErros';
import { Botao, CampoTexto, Modal, Nota } from '@/componentes/ui';
import type { ContaDTO } from '@/modelos/administracao';
import { consequenciasDaExclusao } from '@/regras/contas';
import { servicoAdministracao } from '@/servicos';
import estilos from './ModalExclusaoConta.module.css';

interface ModalExclusaoContaProps {
  conta: ContaDTO;
  aberto: boolean;
  aoFechar: () => void;
  aoExcluir: (conta: ContaDTO) => void;
}

export function ModalExclusaoConta({ conta, aberto, aoFechar, aoExcluir }: ModalExclusaoContaProps) {
  const id = useId();
  const [confirmacao, setConfirmacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const confirmado = confirmacao.trim().toLowerCase() === conta.email.toLowerCase();

  const excluir = async () => {
    if (!confirmado || enviando) return;
    setEnviando(true);
    setFalha(null);
    try {
      await servicoAdministracao.excluirConta(conta.id);
      aoExcluir(conta);
    } catch (erro) {
      setFalha(erro instanceof ErroApi && erro.resposta?.detail ? erro.resposta.detail : descreverFalha(erro));
      setEnviando(false);
    }
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={enviando ? () => undefined : aoFechar}
      titulo={`Excluir a conta de ${conta.nome}?`}
      descricao="A exclusão não tem desfazer. Se a pessoa só precisa ficar sem acesso por um tempo, desative a conta."
      tamanho="md"
      papel="alertdialog"
      focarPrimeiroCampo
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao variante="perigo" carregando={enviando} disabled={!confirmado} onClick={() => void excluir()}>
            Excluir conta
          </Botao>
        </>
      }
    >
      <div className={estilos.corpo}>
        {falha ? (
          <Nota tom="erro" icone={OctagonAlert} titulo="A conta não foi excluída.">
            {falha}
          </Nota>
        ) : null}
        <div>
          <p className={estilos.titulo}>O que acontece</p>
          <ul className={estilos.consequencias}>
            {consequenciasDaExclusao(conta).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <CampoTexto
          id={`${id}-confirmacao`}
          rotulo={`Digite ${conta.email} para confirmar`}
          autoComplete="off"
          spellCheck={false}
          value={confirmacao}
          onChange={(evento) => setConfirmacao(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') void excluir();
          }}
        />
      </div>
    </Modal>
  );
}
