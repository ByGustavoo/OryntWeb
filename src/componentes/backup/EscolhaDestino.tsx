import { useState } from 'react';
import { ArrowRight, Database, Download, FolderOpen, HardDrive, Server } from 'lucide-react';
import { Botao } from '@/componentes/ui';
import { useBackupLocal } from '@/provedores/ProvedorBackupLocal';
import { descreverLocal } from '@/regras/acompanhamentoBackup';
import { escolherPasta, navegadorEscolhePasta } from '@/utilitarios/arquivoLocal';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './EscolhaDestino.module.css';

export function EscolhaDestino() {
  const { destino, escolherDestino } = useBackupLocal();
  const [escolhendo, setEscolhendo] = useState(false);
  const permitePasta = navegadorEscolhePasta();
  const emPasta = destino.modo === 'PASTA';

  const pedirPasta = async () => {
    setEscolhendo(true);
    const pasta = await escolherPasta();
    setEscolhendo(false);
    if (pasta) escolherDestino({ modo: 'PASTA', pasta });
  };

  return (
    <fieldset className={estilos.opcoes}>
      <legend className={estilos.legenda}>Onde salvar no seu computador</legend>

      <label className={juntarClasses(estilos.opcao, !emPasta && estilos.opcaoEscolhida)}>
        <input type="radio" name="destino-backup" className={estilos.radio} checked={!emPasta} onChange={() => escolherDestino({ modo: 'NAVEGADOR' })} />
        <Download size={16} strokeWidth={2} aria-hidden="true" className={estilos.iconeOpcao} />
        <span className={estilos.textos}>
          <span className={estilos.nome}>Baixar pelo navegador</span>
          <span className={estilos.descricao}>
            Ao terminar, é só clicar em Baixar backup. O arquivo vai para a pasta de downloads, ou o navegador pergunta onde salvar, conforme a configuração dele.
          </span>
        </span>
      </label>

      <label className={juntarClasses(estilos.opcao, emPasta && estilos.opcaoEscolhida, !permitePasta && estilos.opcaoIndisponivel)}>
        <input
          type="radio"
          name="destino-backup"
          className={estilos.radio}
          checked={emPasta}
          disabled={!permitePasta || escolhendo}
          onChange={() => void pedirPasta()}
        />
        <FolderOpen size={16} strokeWidth={2} aria-hidden="true" className={estilos.iconeOpcao} />
        <span className={estilos.textos}>
          <span className={estilos.nome}>Escolher uma pasta</span>
          <span className={estilos.descricao}>
            {permitePasta
              ? 'O arquivo é gravado direto na pasta ao terminar, sem precisar clicar. O navegador pede a sua permissão e a escolha vale até esta aba ser fechada ou recarregada.'
              : 'Este navegador não permite que um site escolha uma pasta. Disponível no Chrome e no Edge para computador.'}
          </span>
        </span>
      </label>

      {destino.modo === 'PASTA' ? (
        <div className={estilos.pastaEscolhida}>
          <p>
            Pasta escolhida: <strong className="codigo">{destino.pasta.name}</strong>
          </p>
          <Botao variante="secundario" tamanho="sm" icone={FolderOpen} carregando={escolhendo} onClick={() => void pedirPasta()}>
            Trocar pasta
          </Botao>
        </div>
      ) : null}
    </fieldset>
  );
}

export function CaminhoDoBackup() {
  const { localDoDestino } = useBackupLocal();
  return (
    <figure className={estilos.figura}>
      <ol className={estilos.caminhoDoDado}>
        <li className={estilos.etapa}>
          <span className={estilos.icone} aria-hidden="true">
            <Database size={16} strokeWidth={2} />
          </span>
          <span className={estilos.tituloEtapa}>Seu PostgreSQL</span>
          <span className={estilos.textoEtapa}>De onde os dados saem</span>
        </li>
        <li className={estilos.ligacao} aria-hidden="true">
          <ArrowRight size={16} strokeWidth={2} />
        </li>
        <li className={estilos.etapa}>
          <span className={estilos.icone} aria-hidden="true">
            <Server size={16} strokeWidth={2} />
          </span>
          <span className={estilos.tituloEtapa}>API do Orynt</span>
          <span className={estilos.textoEtapa}>Só repassa. Não grava nada</span>
        </li>
        <li className={estilos.ligacao} aria-hidden="true">
          <ArrowRight size={16} strokeWidth={2} />
        </li>
        <li className={juntarClasses(estilos.etapa, estilos.etapaFinal)}>
          <span className={estilos.icone} aria-hidden="true">
            <HardDrive size={16} strokeWidth={2} />
          </span>
          <span className={estilos.tituloEtapa}>Seu computador</span>
          <span className={estilos.textoEtapa}>{descreverLocal(localDoDestino).replace(', no seu computador', '')}</span>
        </li>
      </ol>
      <figcaption className={estilos.legenda}>
        O navegador não fala direto com o PostgreSQL, então a API faz a ponte: os dados passam por ela e seguem para o seu navegador, sem cópia no servidor. Por isso, o banco precisa estar acessível a partir da API.
      </figcaption>
    </figure>
  );
}
