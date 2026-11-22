/**
 * checkin-cardio-local.spec.ts — TEAM_019
 * ---------------------------------------------------------------------------
 * Regressão do check-in de cardio no modo navegador (localStorage):
 *
 *   - salvar o cardio com modalidade/tempo/km persiste os detalhes;
 *   - submits PARCIAIS posteriores (concluir treino, dieta, líquido) — que
 *     não enviam campos de cardio — NÃO podem apagar os detalhes;
 *   - desmarcar o cardio limpa os detalhes (dia sem cardio não carrega
 *     modalidade/tempo/km órfãos);
 *   - a atualização de um registro ANTIGO (sem chaves cardio_*, formato
 *     anterior à feature) grava os detalhes normalmente.
 *
 * O Jasmine roda em Node, então `window`/`localStorage` são substituídos por
 * um armazenamento em memória (mesmo padrão de progresso-treino.spec.ts).
 * ---------------------------------------------------------------------------
 */
import { buscarCheckinsLocal, salvarCheckinLocal } from '../apps/web/src/lib/repositorio-local';
import { hojeLocal } from '../apps/web/src/lib/checkin-util';

/** localStorage mínimo em memória — a interface que os módulos usam. */
class ArmazenamentoEmMemoria {
  private dados = new Map<string, string>();

  getItem(chave: string): string | null {
    return this.dados.get(chave) ?? null;
  }

  setItem(chave: string, valor: string): void {
    this.dados.set(chave, String(valor));
  }

  removeItem(chave: string): void {
    this.dados.delete(chave);
  }

  clear(): void {
    this.dados.clear();
  }
}

const CHAVE_BANCO = 'protocolfit_banco_local';
const CHAVE_TOKEN = 'protocolfit_token';

/** Semeia o banco local com uma conta logada e uma lista de check-ins dada. */
function semearBanco(checkins: unknown[]): void {
  localStorage.setItem(
    CHAVE_BANCO,
    JSON.stringify({
      versao: 1,
      contas: [
        {
          id: 1,
          nome: 'Teste Cardio',
          email: 'cardio@teste.dev',
          senha_hash: 'x',
          tentativas_falhas: 0,
          bloqueado_ate: null,
          criado_em: '2025-01-01T00:00:00Z',
        },
      ],
      perfis: [],
      planos: [],
      evolucao: [],
      checkins,
      proximoId: 10,
    }),
  );
  localStorage.setItem(CHAVE_TOKEN, 'local:1');
}

describe('check-in de cardio no modo navegador', () => {
  beforeEach(() => {
    // Armazenamento limpo + stubs de navegador para cada spec.
    const armazenamento = new ArmazenamentoEmMemoria();
    (globalThis as Record<string, unknown>).localStorage = armazenamento;
    (globalThis as Record<string, unknown>).window = {
      localStorage: armazenamento,
      crypto: globalThis.crypto,
    };
  });

  it('persiste modalidade, tempo e km no submit completo', async () => {
    semearBanco([]);
    await salvarCheckinLocal({
      cardio_feito: true,
      cardio_modalidade: 'corrida',
      cardio_tempo_min: 30,
      cardio_km: 5.2,
    });
    const resumo = await buscarCheckinsLocal();
    expect(resumo.hoje?.cardio_feito).toBe(true);
    expect(resumo.hoje?.cardio_modalidade).toBe('corrida');
    expect(resumo.hoje?.cardio_tempo_min).toBe(30);
    expect(resumo.hoje?.cardio_km).toBe(5.2);
  });

  it('preserva os detalhes quando submits parciais omitem cardio', async () => {
    semearBanco([]);
    // 1) O cartão salva o cardio com detalhes.
    await salvarCheckinLocal({
      cardio_feito: true,
      cardio_modalidade: 'bicicleta',
      cardio_tempo_min: 45,
      cardio_km: 12,
    });
    // 2) Submits parciais de outros fluxos (treino, dieta e líquido do treino).
    await salvarCheckinLocal({ treino_feito: true });
    await salvarCheckinLocal({ dieta_seguida: true });
    await salvarCheckinLocal({ agua_ml: 2500 });

    const resumo = await buscarCheckinsLocal();
    expect(resumo.hoje?.treino_feito).toBe(true);
    expect(resumo.hoje?.dieta_seguida).toBe(true);
    expect(resumo.hoje?.agua_ml).toBe(2500);
    // Os detalhes do cardio NÃO podem ter sido apagados.
    expect(resumo.hoje?.cardio_feito).toBe(true);
    expect(resumo.hoje?.cardio_modalidade).toBe('bicicleta');
    expect(resumo.hoje?.cardio_tempo_min).toBe(45);
    expect(resumo.hoje?.cardio_km).toBe(12);
  });

  it('grava os detalhes ao atualizar um registro ANTIGO (sem chaves cardio)', async () => {
    // Formato anterior à TEAM_019: objeto sem nenhuma chave cardio_*.
    semearBanco([
      {
        id: 9,
        usuario_id: 1,
        data: hojeLocal(),
        treino_feito: true,
        dieta_seguida: false,
        agua_ml: 1500,
        peso_kg: 80,
        observacao: null,
      },
    ]);
    await salvarCheckinLocal({
      cardio_feito: true,
      cardio_modalidade: 'natacao',
      cardio_tempo_min: 20,
      cardio_km: 1.5,
    });
    const resumo = await buscarCheckinsLocal();
    expect(resumo.hoje?.cardio_modalidade).toBe('natacao');
    expect(resumo.hoje?.cardio_tempo_min).toBe(20);
    expect(resumo.hoje?.cardio_km).toBe(1.5);
  });

  it('limpa os detalhes quando o cardio é desmarcado', async () => {
    semearBanco([]);
    await salvarCheckinLocal({
      cardio_feito: true,
      cardio_modalidade: 'corrida',
      cardio_tempo_min: 30,
      cardio_km: 5,
    });
    await salvarCheckinLocal({
      cardio_feito: false,
      cardio_modalidade: null,
      cardio_tempo_min: null,
      cardio_km: null,
    });
    const resumo = await buscarCheckinsLocal();
    expect(resumo.hoje?.cardio_feito).toBe(false);
    expect(resumo.hoje?.cardio_modalidade).toBeNull();
    expect(resumo.hoje?.cardio_tempo_min).toBeNull();
    expect(resumo.hoje?.cardio_km).toBeNull();
  });
});
