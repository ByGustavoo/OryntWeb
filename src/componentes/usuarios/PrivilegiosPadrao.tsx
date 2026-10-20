import { FilePlus2 } from 'lucide-react';
import { CabecalhoPainel, Painel, Selo } from '@/componentes/ui';
import type { PrivilegioPadraoDTO } from '@/modelos/permissoes';
import { comandoDoPrivilegioPadrao, fraseDoPrivilegioPadrao, rotuloDoSujeito } from '@/regras/permissoes';
import estilos from './PrivilegiosPadrao.module.css';

interface PrivilegiosPadraoProps {
  padroes: PrivilegioPadraoDTO[];
  sujeito: string | null;
  alcanca: (padrao: PrivilegioPadraoDTO) => boolean;
}

export function PrivilegiosPadrao({ padroes, sujeito, alcanca }: PrivilegiosPadraoProps) {
  return (
    <Painel aria-labelledby="titulo-privilegios-padrao">
      <CabecalhoPainel
        titulo={<span id="titulo-privilegios-padrao">Privilégios padrão</span>}
        descricao="O que os objetos criados daqui em diante já recebem, definido com ALTER DEFAULT PRIVILEGES"
      />
      {padroes.length === 0 ? (
        <p className={estilos.vazio}>
          Nenhum privilégio padrão: cada objeto novo nasce só com o acesso do dono, até alguém conceder o resto.
        </p>
      ) : (
        <ul className={estilos.lista}>
          {padroes.map((padrao) => {
            const comando = comandoDoPrivilegioPadrao(padrao);
            return (
              <li key={comando} className={estilos.item}>
                <span className={estilos.icone} aria-hidden="true">
                  <FilePlus2 size={15} strokeWidth={2.25} />
                </span>
                <div className={estilos.textos}>
                  <p className={estilos.frase}>
                    {fraseDoPrivilegioPadrao(padrao)}
                    {sujeito && alcanca(padrao) ? (
                      <Selo tom="destaque" className={estilos.selo}>
                        Alcança {rotuloDoSujeito(sujeito)}
                      </Selo>
                    ) : null}
                  </p>
                  <p className={`${estilos.comando} codigo`}>{comando}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Painel>
  );
}
