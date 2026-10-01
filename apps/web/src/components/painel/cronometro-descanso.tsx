/**
 * cronometro-descanso.tsx — TEAM_006
 * ---------------------------------------------------------------------------
 * Timer de descanso embutido em cada cartão de exercício do treino.
 *
 * Escolha do tempo: atalhos fixos de 1, 2 e 3 minutos, um atalho extra com o
 * descanso sugerido pelo plano (só quando difere dos fixos) e um campo de
 * tempo personalizado em segundos — Enter no campo também inicia.
 *
 * A contagem é guiada por timestamp de término (Date.now + duração) em vez de
 * decremento por intervalo: o tempo segue correto mesmo quando o navegador
 * reduz a frequência do setInterval em abas em segundo plano. Ao zerar, o
 * timer emite três bipes (Web Audio, sem arquivos de som), vibra o aparelho
 * onde houver suporte e exibe um aviso visual por alguns segundos.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { CampoDeEntrada } from '@/components/ui/input';
import { combinarClasses, formatarMinutosSegundos } from '@/lib/util';

/** Atalhos rápidos do timer, em segundos (1, 2 e 3 minutos). */
const ATALHOS_DE_DESCANSO = [60, 120, 180];

/** Limite inferior do tempo personalizado, em segundos. */
const MIN_SEGUNDOS = 5;

/** Limite superior do tempo personalizado, em segundos (1 hora). */
const MAX_SEGUNDOS = 3600;

/** Intervalo de atualização do visor, em milissegundos. */
const PASSO_DO_VISOR_MS = 250;

/** Tempo que o aviso "descanso concluído" fica na tela, em milissegundos. */
const DURACAO_DO_AVISO_MS = 5000;

/** Frequência dos bipes de aviso, em Hz. */
const FREQUENCIA_DO_BIPE_HZ = 880;

/** Fases do timer: parado (escolhendo tempo), rodando ou pausado. */
type FaseDoCronometro = 'parado' | 'rodando' | 'pausado';

/** Propriedades do cronômetro de descanso. */
interface PropriedadesDoCronometro {
  /** Descanso sugerido do exercício (segundos) — vira atalho extra. */
  descansoSugerido: number;
}

/** Cronômetro de descanso por exercício (client component — usa timers e áudio). */
export function CronometroDeDescanso({ descansoSugerido }: PropriedadesDoCronometro) {
  // Texto do campo de tempo personalizado (em segundos).
  const [personalizado, definirPersonalizado] = useState('');
  // Segundos restantes mostrados no visor.
  const [restante, definirRestante] = useState(0);
  // Fase atual do timer (parado/rodando/pausado).
  const [fase, definirFase] = useState<FaseDoCronometro>('parado');
  // Erro de validação do tempo personalizado.
  const [erroDoTempo, definirErroDoTempo] = useState<string | null>(null);
  // Aviso "descanso concluído" exibido por alguns segundos após zerar.
  const [avisandoConclusao, definirAvisandoConclusao] = useState(false);
  // Timestamp (ms) em que a contagem termina — null quando pausado/parado.
  const terminaEmRef = useRef<number | null>(null);
  // Handle do setInterval que atualiza o visor.
  const intervaloRef = useRef<number | null>(null);
  // Contexto de áudio criado sob demanda (o navegador exige gesto do usuário).
  const audioRef = useRef<AudioContext | null>(null);
  // Handle do timeout que apaga o aviso de conclusão.
  const avisoRef = useRef<number | null>(null);

  /** Para o intervalo do visor, se existir. */
  function pararIntervalo() {
    if (intervaloRef.current !== null) {
      window.clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  }

  /** Emite três bipes via Web Audio e vibra o aparelho, onde houver suporte. */
  function avisarFimDoDescanso() {
    // Vibração em celulares (ignorada silenciosamente onde não há suporte).
    navigator.vibrate?.([150, 80, 150]);
    try {
      // Safari antigo expõe o construtor com o prefixo webkit.
      const ConstrutorDeAudio =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      // Sem Web Audio: o aviso visual e a vibração já cumprem o papel.
      if (!ConstrutorDeAudio) {
        return;
      }
      audioRef.current ??= new ConstrutorDeAudio();
      const contexto = audioRef.current;
      void contexto.resume();
      // Três bipes curtos espaçados por 0,28 s.
      [0, 0.28, 0.56].forEach((deslocamento) => {
        const oscilador = contexto.createOscillator();
        const ganho = contexto.createGain();
        const inicio = contexto.currentTime + deslocamento;
        oscilador.type = 'sine';
        oscilador.frequency.value = FREQUENCIA_DO_BIPE_HZ;
        // Envelope curto: ataque rápido e queda até o fim do bipe.
        ganho.gain.setValueAtTime(0.0001, inicio);
        ganho.gain.exponentialRampToValueAtTime(0.2, inicio + 0.02);
        ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.22);
        oscilador.connect(ganho).connect(contexto.destination);
        oscilador.start(inicio);
        oscilador.stop(inicio + 0.25);
      });
    } catch {
      // Áudio bloqueado pelo navegador: o aviso visual já avisa o usuário.
    }
  }

  /** Recalcula o restante a partir do alvo; ao zerar, encerra e avisa. */
  function sincronizarRestante() {
    if (terminaEmRef.current === null) {
      return;
    }
    const restanteMs = terminaEmRef.current - Date.now();
    if (restanteMs <= 0) {
      pararIntervalo();
      terminaEmRef.current = null;
      definirRestante(0);
      definirFase('parado');
      definirAvisandoConclusao(true);
      // Apaga o aviso depois de alguns segundos.
      if (avisoRef.current !== null) {
        window.clearTimeout(avisoRef.current);
      }
      avisoRef.current = window.setTimeout(() => definirAvisandoConclusao(false), DURACAO_DO_AVISO_MS);
      avisarFimDoDescanso();
      return;
    }
    definirRestante(Math.ceil(restanteMs / 1000));
  }

  /** Inicia a contagem com a duração informada (segundos). */
  function iniciar(segundos: number) {
    pararIntervalo();
    definirErroDoTempo(null);
    definirAvisandoConclusao(false);
    terminaEmRef.current = Date.now() + segundos * 1000;
    definirRestante(segundos);
    definirFase('rodando');
    intervaloRef.current = window.setInterval(sincronizarRestante, PASSO_DO_VISOR_MS);
  }

  /** Pausa a contagem (congela o restante) ou retoma de onde parou. */
  function alternarPausa() {
    if (fase === 'rodando') {
      // Guarda o restante congelado e solta o timestamp alvo.
      if (terminaEmRef.current !== null) {
        definirRestante(Math.max(0, Math.ceil((terminaEmRef.current - Date.now()) / 1000)));
      }
      terminaEmRef.current = null;
      pararIntervalo();
      definirFase('pausado');
      return;
    }
    if (fase === 'pausado') {
      // Novo alvo = agora + o restante congelado.
      terminaEmRef.current = Date.now() + restante * 1000;
      intervaloRef.current = window.setInterval(sincronizarRestante, PASSO_DO_VISOR_MS);
      definirFase('rodando');
    }
  }

  /** Zera o timer e volta à escolha de tempo. */
  function zerar() {
    pararIntervalo();
    terminaEmRef.current = null;
    definirRestante(0);
    definirFase('parado');
  }

  /** Valida e inicia o tempo personalizado digitado no campo. */
  function iniciarPersonalizado() {
    const segundos = Number(personalizado);
    if (!Number.isInteger(segundos) || segundos < MIN_SEGUNDOS || segundos > MAX_SEGUNDOS) {
      definirErroDoTempo(`Informe um tempo de ${MIN_SEGUNDOS} a ${MAX_SEGUNDOS} segundos.`);
      return;
    }
    iniciar(segundos);
  }

  // Limpeza ao desmontar o cartão: intervalo, timeout do aviso e áudio.
  useEffect(() => {
    return () => {
      pararIntervalo();
      if (avisoRef.current !== null) {
        window.clearTimeout(avisoRef.current);
      }
      void audioRef.current?.close();
    };
  }, []);

  return (
    // Bloco discreto dentro do cartão: atalhos OU visor com controles.
    <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
      {/* Título do timer + descanso sugerido pelo plano. */}
      <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
        <Timer className="size-4 shrink-0 text-primary" /> Timer de descanso
        {descansoSugerido > 0 ? (
          <span className="font-normal text-muted-foreground">
            — sugerido: {formatarMinutosSegundos(descansoSugerido)}
          </span>
        ) : null}
      </p>

      {fase === 'parado' ? (
        // Escolha do tempo: atalhos de 1/2/3 min + sugerido + personalizado.
        <div className="flex flex-wrap items-center gap-2">
          {ATALHOS_DE_DESCANSO.map((segundos) => (
            <Botao
              key={segundos}
              variante="contorno"
              tamanho="pequeno"
              onClick={() => iniciar(segundos)}
              aria-label={`Iniciar descanso de ${segundos / 60} minuto${segundos === 60 ? '' : 's'}`}
            >
              {segundos / 60} min
            </Botao>
          ))}
          {/* Atalho com o descanso sugerido pelo plano — só quando difere
              dos atalhos fixos, para não duplicar um botão. */}
          {descansoSugerido > 0 && !ATALHOS_DE_DESCANSO.includes(descansoSugerido) ? (
            <Botao variante="secundario" tamanho="pequeno" onClick={() => iniciar(descansoSugerido)}>
              Sugerido {formatarMinutosSegundos(descansoSugerido)}
            </Botao>
          ) : null}
          {/* Tempo personalizado em segundos (Enter também inicia). */}
          <div className="flex items-center gap-1.5">
            <CampoDeEntrada
              type="number"
              inputMode="numeric"
              min={MIN_SEGUNDOS}
              max={MAX_SEGUNDOS}
              step={5}
              placeholder="s"
              value={personalizado}
              onChange={(evento) => definirPersonalizado(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter') {
                  iniciarPersonalizado();
                }
              }}
              className="h-8 w-20"
              aria-label="Tempo de descanso personalizado em segundos"
            />
            <Botao variante="secundario" tamanho="pequeno" onClick={iniciarPersonalizado}>
              <Play /> Iniciar
            </Botao>
          </div>
        </div>
      ) : (
        // Visor em contagem (ou pausado): mm:ss + pausar/retomar + zerar.
        <div className="flex flex-wrap items-center gap-3">
          <span
            role="timer"
            aria-label="Tempo de descanso restante"
            className={combinarClasses(
              'font-display text-2xl font-bold tabular-nums',
              fase === 'rodando' ? 'text-primary' : 'text-foreground',
            )}
          >
            {formatarMinutosSegundos(restante)}
          </span>
          <Botao variante="contorno" tamanho="pequeno" onClick={alternarPausa}>
            {fase === 'rodando' ? (
              <>
                <Pause /> Pausar
              </>
            ) : (
              <>
                <Play /> Retomar
              </>
            )}
          </Botao>
          <Botao variante="fantasma" tamanho="pequeno" onClick={zerar}>
            <RotateCcw /> Zerar
          </Botao>
        </div>
      )}

      {/* Erro de validação do campo personalizado. */}
      {erroDoTempo ? <p className="text-sm font-medium text-destructive">{erroDoTempo}</p> : null}
      {/* Aviso visual ao final da contagem (soma-se ao som e à vibração). */}
      {avisandoConclusao ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <CheckCircle2 className="size-4" /> Descanso concluído — próxima série!
        </p>
      ) : null}
    </div>
  );
}
