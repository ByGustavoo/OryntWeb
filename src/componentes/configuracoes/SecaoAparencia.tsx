import { useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { CabecalhoPainel, Painel } from '@/componentes/ui';
import type { ModoTema, TemaAplicado } from '@/provedores/ProvedorTema';
import { useTema } from '@/provedores/ProvedorTema';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './SecaoConfiguracao.module.css';
import estilosAparencia from './SecaoAparencia.module.css';

interface OpcaoTema {
  modo: ModoTema;
  rotulo: string;
  icone: LucideIcon;
  descricao: (temaDoSistema: TemaAplicado) => string;
}

const opcoesTema: OpcaoTema[] = [
  { modo: 'claro', rotulo: 'Claro', icone: Sun, descricao: () => 'Ideal para ambientes bem iluminados.' },
  { modo: 'escuro', rotulo: 'Escuro', icone: Moon, descricao: () => 'Menos brilho para uso noturno.' },
  {
    modo: 'sistema',
    rotulo: 'Automático',
    icone: Monitor,
    descricao: (temaDoSistema) => `Acompanha o seu aparelho, agora no ${temaDoSistema === 'escuro' ? 'escuro' : 'claro'}.`,
  },
];

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
          const Icone = opcao.icone;
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
              <span className={estilosAparencia.icone} aria-hidden="true">
                <Icone size={18} strokeWidth={1.75} />
              </span>
              <span className={estilosAparencia.textos}>
                <span className={estilosAparencia.rotulo}>{opcao.rotulo}</span>
                <span className={estilosAparencia.descricao}>{opcao.descricao(temaDoSistema)}</span>
              </span>
              {selecionada ? <Check className={estilosAparencia.marca} size={16} strokeWidth={2.5} aria-hidden="true" /> : null}
            </label>
          );
        })}
      </fieldset>
    </Painel>
  );
}
