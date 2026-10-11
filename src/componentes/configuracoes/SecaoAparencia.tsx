import { useId } from 'react';
import { CabecalhoPainel, Painel } from '@/componentes/ui';
import type { ModoTema, TemaAplicado } from '@/provedores/ProvedorTema';
import { useTema } from '@/provedores/ProvedorTema';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './SecaoConfiguracao.module.css';
import estilosAparencia from './SecaoAparencia.module.css';

interface OpcaoTema {
  modo: ModoTema;
  rotulo: string;
  descricao: (temaDoSistema: TemaAplicado) => string;
}

const opcoesTema: OpcaoTema[] = [
  { modo: 'claro', rotulo: 'Claro', descricao: () => 'Fundo claro o tempo todo.' },
  { modo: 'escuro', rotulo: 'Escuro', descricao: () => 'Fundo escuro o tempo todo.' },
  {
    modo: 'sistema',
    rotulo: 'Automático',
    descricao: (temaDoSistema) => `Acompanha o seu aparelho. Agora está ${temaDoSistema === 'escuro' ? 'escuro' : 'claro'}.`,
  },
];

function Miniatura({ tema }: { tema: TemaAplicado }) {
  return (
    <span
      className={juntarClasses(
        estilosAparencia.miniatura,
        tema === 'escuro' ? estilosAparencia.miniaturaEscura : estilosAparencia.miniaturaClara,
      )}
    >
      <span className={estilosAparencia.miniMenu}>
        <span className={estilosAparencia.miniMarca} />
        <span className={estilosAparencia.miniItemAtivo} />
        <span className={estilosAparencia.miniItem} />
        <span className={estilosAparencia.miniItem} />
      </span>
      <span className={estilosAparencia.miniConteudo}>
        <span className={estilosAparencia.miniTitulo} />
        <span className={estilosAparencia.miniCartoes}>
          <span className={estilosAparencia.miniCartao}>
            <span className={estilosAparencia.miniNumero} />
            <span className={estilosAparencia.miniLinha} />
          </span>
          <span className={estilosAparencia.miniCartao}>
            <span className={estilosAparencia.miniNumero} />
            <span className={estilosAparencia.miniLinha} />
          </span>
        </span>
        <span className={juntarClasses(estilosAparencia.miniCartao, estilosAparencia.miniCartaoLargo)}>
          <span className={estilosAparencia.miniLinha} />
          <span className={estilosAparencia.miniLinhaCurta} />
        </span>
      </span>
    </span>
  );
}

export interface SecaoConfiguracaoProps {
  id: string;
  idTitulo: string;
}

export function SecaoAparencia({ id, idTitulo }: SecaoConfiguracaoProps) {
  const { modo, temaDoSistema, definirModo } = useTema();
  const nomeGrupo = useId();

  return (
    <Painel id={id} aria-labelledby={idTitulo} className={juntarClasses(estilos.secao, estilosAparencia.secao)}>
      <CabecalhoPainel
        titulo={
          <span id={idTitulo} tabIndex={-1} className={estilos.ancora}>
            Aparência
          </span>
        }
        descricao="Escolha como o Orynt aparece para você. A mudança vale na hora e fica salva neste navegador."
      />

      <fieldset className={estilosAparencia.grupo}>
        <legend className="visualmente-oculto">Tema</legend>
        {opcoesTema.map((opcao) => {
          const selecionada = modo === opcao.modo;
          return (
            <label key={opcao.modo} className={juntarClasses(estilosAparencia.opcao, selecionada && estilosAparencia.selecionada)}>
              <input
                type="radio"
                name={nomeGrupo}
                value={opcao.modo}
                checked={selecionada}
                onChange={() => definirModo(opcao.modo)}
                className={estilosAparencia.entrada}
              />
              <span className={estilosAparencia.previa} aria-hidden="true">
                {opcao.modo === 'sistema' ? (
                  <span className={estilosAparencia.previaDividida}>
                    <Miniatura tema="claro" />
                    <span className={estilosAparencia.metadeEscura}>
                      <Miniatura tema="escuro" />
                    </span>
                  </span>
                ) : (
                  <Miniatura tema={opcao.modo} />
                )}
              </span>
              <span className={estilosAparencia.textos}>
                <span className={estilosAparencia.marcador} aria-hidden="true" />
                <span className={estilosAparencia.rotulo}>{opcao.rotulo}</span>
                <span className={estilosAparencia.descricao}>{opcao.descricao(temaDoSistema)}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
    </Painel>
  );
}
