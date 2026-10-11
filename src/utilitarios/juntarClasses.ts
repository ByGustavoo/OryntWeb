type ValorClasse = string | false | null | undefined;

export function juntarClasses(...valores: ValorClasse[]): string {
  return valores.filter(Boolean).join(' ');
}
