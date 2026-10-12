export interface ArquivoParaBaixar {
  nome: string;
  tipo: string;
  conteudo: string;
}

const INTERVALO_ENTRE_ARQUIVOS_MS = 250;
const TEMPO_PARA_LIBERAR_MS = 2000;

function esperar(milissegundos: number): Promise<void> {
  return new Promise((resolver) => window.setTimeout(resolver, milissegundos));
}

export function baixarArquivo({ nome, tipo, conteudo }: ArquivoParaBaixar): void {
  const endereco = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const ligacao = document.createElement('a');
  ligacao.href = endereco;
  ligacao.download = nome;
  ligacao.hidden = true;
  document.body.appendChild(ligacao);
  ligacao.click();
  ligacao.remove();
  window.setTimeout(() => URL.revokeObjectURL(endereco), TEMPO_PARA_LIBERAR_MS);
}

export async function baixarArquivos(arquivos: ArquivoParaBaixar[]): Promise<void> {
  for (const [indice, arquivo] of arquivos.entries()) {
    if (indice > 0) await esperar(INTERVALO_ENTRE_ARQUIVOS_MS);
    baixarArquivo(arquivo);
  }
}

export function medirArquivo(conteudo: string): number {
  return new Blob([conteudo]).size;
}
