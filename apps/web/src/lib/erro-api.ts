/**
 * erro-api.ts
 * ---------------------------------------------------------------------------
 * Erro padronizado do ProtocolFit com código HTTP — usado tanto pelo cliente
 * da API quanto pelo repositório local (modo navegador), garantindo que a
 * interface trate os dois modos exatamente da mesma forma.
 * ---------------------------------------------------------------------------
 */
export class ErroDaApi extends Error {
  /** Código de status equivalente ao HTTP (401, 403, 404, 409, 423...). */
  status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
    this.name = 'ErroDaApi';
  }
}
