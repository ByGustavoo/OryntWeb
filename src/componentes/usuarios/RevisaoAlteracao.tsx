import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, FlaskConical, Info, Minus, OctagonAlert, Plus, TriangleAlert, Undo2 } from 'lucide-react';
import { SecaoCopiavel } from '@/componentes/objetos/DetalheObjeto';
import { CampoTexto, Nota } from '@/componentes/ui';
import { descreverOperacao, tituloDaAlteracao } from '@/regras/descricaoAlteracoes';
import { calcularEfeito } from '@/regras/efeitoAlteracoes';
import type { TomDoEfeito } from '@/regras/efeitoAlteracoes';
import type { FalhaAlteracao } from '@/regras/falhaAlteracao';
import { comandosDasOperacoes } from '@/regras/sqlAlteracoes';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import type { EstadoDaAlteracao, RevisaoPedida } from './formularioAlteracao';
import estilos from './RevisaoAlteracao.module.css';

interface RevisaoAlteracaoProps {
  revisao: RevisaoPedida;
  estado: EstadoDaAlteracao;
  simulada: boolean;
  falha: FalhaAlteracao | null;
  confirmar: string | null;
  confirmacao: string;
  aoConfirmar: (valor: string) => void;
  desfazendo: boolean;
}

const iconeDoTom: Record<TomDoEfeito, LucideIcon> = {
  GANHA: Plus,
  PERDE: Minus,
  MANTEM: ArrowRight,
  NEUTRO: Info,
};

const rotuloDoTom: Record<TomDoEfeito, string> = {
  GANHA: 'Ganha',
  PERDE: 'Perde',
  MANTEM: 'Continua',
  NEUTRO: 'Muda',
};

export function RevisaoAlteracao({
  revisao,
  estado,
  simulada,
  falha,
  confirmar,
  confirmacao,
  aoConfirmar,
  desfazendo,
}: RevisaoAlteracaoProps) {
  const { operacoes } = revisao;
  const efeito = useMemo(() => calcularEfeito(operacoes, estado), [operacoes, estado]);
  const comandos = useMemo(() => comandosDasOperacoes(operacoes), [operacoes]);
  const comSenha = operacoes.some(
    (operacao) => (operacao.tipo === 'CRIAR_PAPEL' || operacao.tipo === 'ALTERAR_PAPEL') && operacao.senha?.tipo === 'VERIFICADOR',
  );

  return (
    <div className={estilos.revisao}>
      <div className={estilos.resumo}>
        {desfazendo ? (
          <p className={estilos.desfazer}>
            <Undo2 size={16} strokeWidth={2} aria-hidden="true" />
            Desfaz a alteração anterior com os comandos inversos.
          </p>
        ) : null}
        <p className={estilos.titulo}>{tituloDaAlteracao(operacoes, 'INFINITIVO')}</p>
        {operacoes.length > 1 ? (
          <ol className={estilos.passos}>
            {operacoes.map((operacao, posicao) => (
              <li key={posicao}>{descreverOperacao(operacao, 'INFINITIVO')}</li>
            ))}
          </ol>
        ) : null}
      </div>

      {falha ? (
        <Nota tom="erro" icone={OctagonAlert} titulo={`${falha.titulo}.`} role="alert">
          {falha.descricao}
          {falha.doBanco ? (
            <>
              {' '}
              O banco respondeu: <span className="codigo">{falha.doBanco}</span>
            </>
          ) : null}
        </Nota>
      ) : null}

      {efeito.avisos.map((aviso) => (
        <Nota key={aviso.texto} tom={aviso.tom} icone={aviso.tom === 'erro' ? OctagonAlert : aviso.tom === 'aviso' ? TriangleAlert : Info}>
          {aviso.texto}
        </Nota>
      ))}

      <section className={estilos.secao} aria-labelledby="titulo-efeito-alteracao">
        <h3 className={estilos.tituloSecao} id="titulo-efeito-alteracao">
          O que muda
        </h3>
        {efeito.linhas.length > 0 ? (
          <ul className={estilos.efeitos}>
            {efeito.linhas.map((linha) => {
              const Icone = iconeDoTom[linha.tom];
              return (
                <li key={linha.chave} className={estilos.efeito}>
                  <span className={juntarClasses(estilos.icone, estilos[linha.tom])} aria-hidden="true">
                    <Icone size={14} strokeWidth={2.5} />
                  </span>
                  <span>
                    <span className="visualmente-oculto">{rotuloDoTom[linha.tom]}: </span>
                    {linha.texto}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={estilos.leitura}>Nada muda no acesso de nenhum papel: os comandos não alteram o que cada um já pode.</p>
        )}
      </section>

      <SecaoCopiavel
        id="titulo-comandos-alteracao"
        titulo={comandos.length === 1 ? 'Comando' : `Comandos, na ordem em que rodam`}
        texto={comandos.join('\n')}
        copiado="Copiado"
        anuncio="Comandos copiados para a área de transferência."
        tituloDoErro="Não foi possível copiar os comandos"
        descricaoDoErro="O navegador bloqueou a área de transferência. Selecione o texto dos comandos e copie por lá."
      >
        <p className={estilos.leitura}>
          {comandos.length > 1 ? 'Rodam numa transação só: se um falhar, nenhum é aplicado. ' : ''}
          {comSenha
            ? 'A senha não aparece: o navegador calculou o verificador SCRAM-SHA-256, que é o que vai ao banco, e o histórico guarda só um marcador no lugar dele.'
            : 'A alteração fica registrada em Alterações, com quem fez e quando.'}
        </p>
      </SecaoCopiavel>

      {simulada ? (
        <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
          Nenhum banco real é alterado: o simulador aplica a mudança aos dados fictícios desta conexão.
        </Nota>
      ) : null}

      {confirmar ? (
        <div className={estilos.confirmacao}>
          <CampoTexto
            rotulo={`Para confirmar, digite ${confirmar}`}
            value={confirmacao}
            onChange={(evento) => aoConfirmar(evento.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            dica="A alteração tira acesso ou remove algo que o comando inverso não devolve por inteiro."
          />
        </div>
      ) : null}
    </div>
  );
}
