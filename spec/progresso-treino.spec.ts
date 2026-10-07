/**
 * progresso-treino.spec.ts — TEAM_008
 * ---------------------------------------------------------------------------
 * Testes da checklist persistente do treino (apps/web/src/lib/progresso-
 * treino.ts): a chave não tem data — as marcas sobrevivem entre visitas e
 * só zeram quando uma sessão CONCLUÍDA vira um dia novo.
 *
 * O Jasmine roda em Node, então o localStorage é substituído por um
 * armazenamento em memória com a mesma interface (get/set/remove/key).
 * ---------------------------------------------------------------------------
 */
import { gravarConcluidos, lerConcluidos } from '../apps/web/src/lib/progresso-treino';

/** localStorage mínimo em memória — a interface que o módulo usa. */
class ArmazenamentoEmMemoria {
  private dados = new Map<string, string>();

  get length(): number {
    return this.dados.size;
  }

  key(indice: number): string | null {
    return [...this.dados.keys()][indice] ?? null;
  }

  getItem(chave: string): string | null {
    return this.dados.get(chave) ?? null;
  }

  setItem(chave: string, valor: string): void {
    this.dados.set(chave, String(valor));
  }

  removeItem(chave: string): void {
    this.dados.delete(chave);
  }
}

const HOJE = '2025-06-10';
const ONTEM = '2025-06-09';

describe('checklist do treino (progresso-treino)', () => {
  beforeEach(() => {
    // Cada spec começa com um armazenamento limpo.
    (globalThis as Record<string, unknown>).localStorage = new ArmazenamentoEmMemoria();
  });

  it('grava e lê as marcas do mesmo dia', () => {
    gravarConcluidos(7, 0, [0, 2], HOJE);
    expect(lerConcluidos(7, 0, 5, HOJE)).toEqual([0, 2]);
  });

  it('mantém entre visitas uma sessão INCOMPLETA de outro dia', () => {
    // Marcou 2 de 5 ontem → na visita seguinte as marcas continuam.
    gravarConcluidos(7, 0, [1, 3], ONTEM);
    expect(lerConcluidos(7, 0, 5, HOJE)).toEqual([1, 3]);
  });

  it('zera uma sessão CONCLUÍDA de outro dia (treino feito, sessão nova)', () => {
    // Concluiu os 5 exercícios ontem → hoje a lista recomeça vazia.
    gravarConcluidos(7, 0, [0, 1, 2, 3, 4], ONTEM);
    expect(lerConcluidos(7, 0, 5, HOJE)).toEqual([]);
  });

  it('mantém sessão concluída HOJE (o usuário revê o dia que terminou)', () => {
    gravarConcluidos(7, 0, [0, 1, 2], HOJE);
    expect(lerConcluidos(7, 0, 3, HOJE)).toEqual([0, 1, 2]);
  });

  it('ignora índices fora da grade atual (o plano encolheu)', () => {
    gravarConcluidos(7, 0, [0, 4], HOJE);
    // O dia passou a ter só 3 exercícios — o índice 4 é descartado.
    expect(lerConcluidos(7, 0, 3, HOJE)).toEqual([0]);
  });

  it('descarta valores corrompidos no armazenamento', () => {
    localStorage.setItem('protocolfit_treino_concluido:7:0', '{"data":"x","indices":"não"}');
    expect(lerConcluidos(7, 0, 5, HOJE)).toEqual([]);
    localStorage.setItem('protocolfit_treino_concluido:7:0', '!!json quebrado');
    expect(lerConcluidos(7, 0, 5, HOJE)).toEqual([]);
  });

  it('isola o progresso por dia dentro do mesmo plano', () => {
    // Dias diferentes do mesmo plano não se misturam. (Chaves de OUTRO
    // plano são podadas na gravação — só existe um plano ativo por vez.)
    gravarConcluidos(7, 0, [0], HOJE);
    gravarConcluidos(7, 1, [2], HOJE);
    expect(lerConcluidos(7, 0, 5, HOJE)).toEqual([0]);
    expect(lerConcluidos(7, 1, 5, HOJE)).toEqual([2]);
  });

  it('lista vazia remove a chave', () => {
    gravarConcluidos(7, 0, [0], HOJE);
    gravarConcluidos(7, 0, [], HOJE);
    expect(localStorage.getItem('protocolfit_treino_concluido:7:0')).toBeNull();
    expect(lerConcluidos(7, 0, 5, HOJE)).toEqual([]);
  });

  it('poda chaves de outros planos e do formato legado (com data na chave)', () => {
    // Chave legada do TEAM_004: prefixo:planoId:data:dia (4 partes).
    localStorage.setItem('protocolfit_treino_concluido:7:2025-06-09:0', '[0]');
    localStorage.setItem('protocolfit_treino_concluido:9:0', '{"data":"2025-06-10","indices":[0]}');
    gravarConcluidos(7, 0, [1], HOJE);
    expect(localStorage.getItem('protocolfit_treino_concluido:7:2025-06-09:0')).toBeNull();
    expect(localStorage.getItem('protocolfit_treino_concluido:9:0')).toBeNull();
    // A chave do plano vigente sobrevive.
    expect(localStorage.getItem('protocolfit_treino_concluido:7:0')).not.toBeNull();
  });
});
