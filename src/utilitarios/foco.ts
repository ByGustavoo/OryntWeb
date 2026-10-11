const SELETOR_FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focaveisVisiveis(conteiner: HTMLElement): HTMLElement[] {
  return [...conteiner.querySelectorAll<HTMLElement>(SELETOR_FOCAVEIS)].filter(
    (elemento) => elemento.offsetParent !== null || elemento === document.activeElement,
  );
}

export function manterTabDentro(evento: KeyboardEvent, conteiner: HTMLElement): void {
  if (evento.key !== 'Tab') return;

  const focaveis = focaveisVisiveis(conteiner);
  const primeiro = focaveis[0];
  const ultimo = focaveis[focaveis.length - 1];
  if (!primeiro || !ultimo) return;

  if (!conteiner.contains(document.activeElement)) {
    evento.preventDefault();
    (evento.shiftKey ? ultimo : primeiro).focus();
  } else if (evento.shiftKey && document.activeElement === primeiro) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault();
    primeiro.focus();
  }
}

export function focarConteudoPrincipal(): void {
  document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
}

export function devolverFoco(origem: HTMLElement | null): void {
  if (origem?.isConnected && origem !== document.body) {
    origem.focus();
    return;
  }
  focarConteudoPrincipal();
}
