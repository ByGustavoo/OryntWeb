import type { ArquivoParaBaixar } from './download';

interface OpcoesDaPasta {
  id: string;
  mode: 'readwrite';
  startIn: 'downloads';
}

type JanelaComPasta = Window & {
  showDirectoryPicker?: (opcoes: OpcoesDaPasta) => Promise<FileSystemDirectoryHandle>;
};

const ID_DA_ESCOLHA = 'orynt-backups';

export function navegadorEscolhePasta(): boolean {
  return typeof (window as JanelaComPasta).showDirectoryPicker === 'function';
}

export async function escolherPasta(): Promise<FileSystemDirectoryHandle | null> {
  const escolher = (window as JanelaComPasta).showDirectoryPicker;
  if (!escolher) return null;
  try {
    return await escolher.call(window, { id: ID_DA_ESCOLHA, mode: 'readwrite', startIn: 'downloads' });
  } catch {
    return null;
  }
}

export async function gravarNaPasta(pasta: FileSystemDirectoryHandle, { nome, tipo, conteudo }: ArquivoParaBaixar): Promise<void> {
  const arquivo = await pasta.getFileHandle(nome, { create: true });
  const escrita = await arquivo.createWritable();
  await escrita.write(new Blob([conteudo], { type: tipo }));
  await escrita.close();
}
