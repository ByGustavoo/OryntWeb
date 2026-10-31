import { Dica } from '@/componentes/ui';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './ComoFuncionaSegundoPlano.module.css';

const situacoes: { situacao: string; efeito: string }[] = [
  { situacao: 'Outras telas', efeito: 'o backup continua, e o cartão no canto da tela acompanha.' },
  { situacao: 'Outra aba ou janela', efeito: 'continua, talvez mais devagar.' },
  { situacao: 'Recarregar ou fechar a aba', efeito: 'o backup para e nenhum arquivo é salvo. O navegador pergunta antes.' },
  { situacao: 'Computador em repouso ou sem rede', efeito: 'o backup falha, e é preciso fazer de novo.' },
];

export function ComoFuncionaSegundoPlano({ className }: { className?: string }) {
  return (
    <Dica
      focavel
      larga
      titulo="Você pode continuar usando o Orynt"
      conteudo={
        <>
          {situacoes.map(({ situacao, efeito }) => (
            <span key={situacao}>
              <span className={estilos.situacao}>{situacao}:</span> {efeito}
            </span>
          ))}
        </>
      }
    >
      <span className={juntarClasses(estilos.gatilho, className)}>Como funciona o segundo plano?</span>
    </Dica>
  );
}
