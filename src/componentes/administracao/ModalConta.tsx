import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Mail, OctagonAlert, UserRound } from 'lucide-react';
import { ErroApi } from '@/api/ErroApi';
import { descreverFalha, errosDeCampo } from '@/api/tratamentoErros';
import { Botao, CampoTexto, Interruptor, Modal, Nota } from '@/componentes/ui';
import { useEscolhaDePermissoes } from '@/ganchos/useEscolhaDePermissoes';
import type { CodigoPermissao, ContaDTO } from '@/modelos/administracao';
import type { CampoConta, ErrosConta } from '@/regras/contas';
import { ORDEM_CAMPOS_CONTA, emailJaUsado, montarNovaConta, validarCampoConta, validarConta } from '@/regras/contas';
import { permissoesDoPerfil } from '@/regras/permissoesConta';
import { servicoAdministracao } from '@/servicos';
import { EditorDePermissoes } from './EditorDePermissoes';
import estilos from './ModalConta.module.css';

export type ModoDaConta = { tipo: 'NOVA' } | { tipo: 'EDITAR'; conta: ContaDTO };

interface ModalContaProps {
  modo: ModoDaConta;
  aberto: boolean;
  ator: { id: string; permissoes: CodigoPermissao[] };
  contas: ContaDTO[];
  aoFechar: () => void;
  aoSalvar: (conta: ContaDTO) => void;
}

const PERFIL_INICIAL = 'LEITOR' as const;

export function ModalConta({ modo, aberto, ator, contas, aoFechar, aoSalvar }: ModalContaProps) {
  const idFormulario = useId();
  const editando = modo.tipo === 'EDITAR' ? modo.conta : null;
  const [campos, setCampos] = useState<Record<CampoConta, string>>({
    nome: editando?.nome ?? '',
    email: editando?.email ?? '',
  });
  const [erros, setErros] = useState<ErrosConta>({});
  const [tocados, setTocados] = useState<Partial<Record<CampoConta, boolean>>>({});
  const [ativa, setAtiva] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const referencias = { nome: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null) };
  const permissoes = useEscolhaDePermissoes(ator, null, contas, { perfil: PERFIL_INICIAL, permissoes: permissoesDoPerfil(PERFIL_INICIAL) });

  const validarCampo = (campo: CampoConta, valor: string): string | undefined => {
    const erro = validarCampoConta(campo, valor);
    if (erro) return erro;
    if (campo === 'email' && emailJaUsado(contas, valor, editando?.id ?? null)) return 'Já existe uma conta com este e-mail.';
    return undefined;
  };

  const mudar = (campo: CampoConta, valor: string) => {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }));
    if (tocados[campo] && erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: validarCampo(campo, valor) }));
  };

  const sair = (campo: CampoConta) => {
    if (!campos[campo].trim()) return;
    setTocados((atuais) => ({ ...atuais, [campo]: true }));
    setErros((atuais) => ({ ...atuais, [campo]: validarCampo(campo, campos[campo]) }));
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (enviando) return;
    const encontrados: ErrosConta = validarConta(campos);
    for (const campo of ORDEM_CAMPOS_CONTA) encontrados[campo] ??= validarCampo(campo, campos[campo]);
    setErros(encontrados);
    setTocados({ nome: true, email: true });
    const primeiro = ORDEM_CAMPOS_CONTA.find((campo) => encontrados[campo]);
    if (primeiro) {
      referencias[primeiro].current?.focus();
      return;
    }

    setEnviando(true);
    setFalha(null);
    try {
      const salva = editando
        ? await servicoAdministracao.editarConta(editando.id, { nome: campos.nome.trim(), email: campos.email.trim().toLowerCase() })
        : await servicoAdministracao.criarConta(
            montarNovaConta({ ...campos, perfil: permissoes.escolha.perfil, permissoes: permissoes.escolha.permissoes, ativa }),
          );
      aoSalvar(salva);
    } catch (erro) {
      const doCampo = errosDeCampo<CampoConta>(erro);
      if (doCampo.nome || doCampo.email) {
        setErros((atuais) => ({ ...atuais, ...doCampo }));
        (doCampo.nome ? referencias.nome : referencias.email).current?.focus();
      } else {
        setFalha(erro instanceof ErroApi && erro.resposta?.detail ? erro.resposta.detail : descreverFalha(erro));
      }
      setEnviando(false);
    }
  };

  const textoDoBotao = editando ? 'Salvar' : ativa ? 'Criar e enviar convite' : 'Criar conta';

  return (
    <Modal
      aberto={aberto}
      aoFechar={enviando ? () => undefined : aoFechar}
      titulo={editando ? `Editar ${editando.nome}` : 'Novo usuário'}
      descricao={
        editando
          ? 'O perfil, as permissões e a situação da conta mudam no detalhe.'
          : 'A pessoa recebe um convite por e-mail e define a própria senha. Ninguém além dela conhece a senha.'
      }
      tamanho={editando ? 'md' : 'lg'}
      focarPrimeiroCampo
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao type="submit" form={idFormulario} carregando={enviando}>
            {textoDoBotao}
          </Botao>
        </>
      }
    >
      <form id={idFormulario} className={estilos.formulario} noValidate onSubmit={(evento) => void enviar(evento)}>
        {falha ? (
          <Nota tom="erro" icone={OctagonAlert} titulo="A conta não foi salva.">
            {falha}
          </Nota>
        ) : null}
        <div className={estilos.campos}>
          <CampoTexto
            ref={referencias.nome}
            id={`${idFormulario}-nome`}
            rotulo="Nome"
            icone={UserRound}
            autoComplete="off"
            required
            maxLength={80}
            value={campos.nome}
            erro={erros.nome}
            onChange={(evento) => mudar('nome', evento.target.value)}
            onBlur={() => sair('nome')}
          />
          <CampoTexto
            ref={referencias.email}
            id={`${idFormulario}-email`}
            rotulo="E-mail"
            type="email"
            icone={Mail}
            autoComplete="off"
            inputMode="email"
            spellCheck={false}
            required
            maxLength={254}
            value={campos.email}
            erro={erros.email}
            dica={editando?.convite ? 'Trocar o e-mail envia um convite novo para o endereço novo.' : 'É o e-mail que a pessoa usa para entrar.'}
            onChange={(evento) => mudar('email', evento.target.value)}
            onBlur={() => sair('email')}
          />
        </div>

        {editando ? null : (
          <>
            <div className={estilos.situacao}>
              <Interruptor ligado={ativa} aoMudar={setAtiva}>
                Ativar a conta e enviar o convite agora
              </Interruptor>
              <p className={estilos.dica}>
                {ativa
                  ? 'O convite vale por 7 dias. Até a pessoa definir a senha, a conta aparece como “Convite pendente”.'
                  : 'A conta fica guardada como “Desativada”, e o convite só sai quando ela for ativada.'}
              </p>
            </div>

            <section className={estilos.permissoes} aria-labelledby={`${idFormulario}-titulo-permissoes`}>
              <h3 className={estilos.titulo} id={`${idFormulario}-titulo-permissoes`}>
                Permissões iniciais
              </h3>
              <EditorDePermissoes
                idBase={idFormulario}
                escolha={permissoes.escolha}
                original={null}
                bloqueio={permissoes.bloqueio}
                aoMarcar={permissoes.marcar}
                aoTrocarPerfil={permissoes.trocarPerfil}
                aoVoltarAoPerfil={permissoes.voltarAoPerfil}
                foraDoAlcance={permissoes.foraDoAlcance}
                desabilitado={enviando}
              />
            </section>
          </>
        )}

      </form>
    </Modal>
  );
}
