export interface ConviteNaCaixa {
  contaId: string;
  nome: string;
  destinatario: string;
  token: string;
  enviadoEm: string;
  expiraEm: string;
}

const convites = new Map<string, ConviteNaCaixa>();
const ouvintes = new Set<() => void>();
let versao = 0;

function avisar(): void {
  versao += 1;
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function entregarConviteSimulado(convite: ConviteNaCaixa): void {
  convites.set(convite.contaId, convite);
  avisar();
}

export function descartarConviteSimulado(contaId: string): void {
  if (convites.delete(contaId)) avisar();
}

export function lerConviteSimulado(contaId: string): ConviteNaCaixa | null {
  return convites.get(contaId) ?? null;
}

export function versaoDosConvitesSimulados(): number {
  return versao;
}

export function assinarConvitesSimulados(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function reiniciarConvitesSimulados(): void {
  convites.clear();
  avisar();
}
