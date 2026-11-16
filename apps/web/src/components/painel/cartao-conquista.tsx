/**
 * cartao-conquista.tsx — TEAM_016 · TEAM_018
 * ---------------------------------------------------------------------------
 * Cartão de conquista do painel: desenha um PNG 1080×1080 (quadrado, formato
 * Instagram) com o progresso do usuário — sequência de check-ins, total,
 * recorde, dias de check-in no mês e evolução de peso — e oferece três
 * formas de levar a imagem em diante:
 *
 *  1. COMPARTILHAR — navigator.share() com o arquivo PNG anexado. É o único
 *     caminho que manda a IMAGEM de verdade para WhatsApp/Instagram (mobile).
 *  2. Links por rede — wa.me e sharer do Facebook aceitam só texto+URL;
 *     Instagram não tem endpoint web → baixa a imagem e abre o app.
 *  3. SALVAR — download direto do PNG.
 *
 * A prévia do card é o próprio <canvas> escalado por CSS: o que o usuário vê
 * é exatamente o que sai no arquivo (WYSIWYG).
 *
 * TEAM_018: tema CLARO e festivo (gradiente pastel + confetes + ticket
 * branco) com foco em alegria e motivação — frase motivacional dinâmica e
 * a nova estatística "dias no mês" na grade 2×2.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Facebook, Instagram, Loader2, MessageCircle, Share2, Target, Trophy } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { Cartao, CartaoCabecalho, CartaoConteudo, CartaoDescricao, CartaoTitulo } from '@/components/ui/card';
import { formatarDecimal, rotuloDoObjetivo } from '@/lib/util';
import { hojeLocal } from '@/lib/checkin-util';
import type { Perfil, ResumoDeCheckins } from '@/lib/tipos';

/** Propriedades do cartão de conquista. */
interface PropriedadesDoCartaoConquista {
  /** Perfil vigente (objetivo e dados do plano). */
  perfil: Perfil;
  /** Resumo de check-ins (sequência, recorde e total). */
  checkins: ResumoDeCheckins;
  /** Variação de peso desde a primeira pesagem (kg; null se < 2 registros). */
  deltaDePeso: number | null;
  /** Primeiro nome do usuário, para a assinatura do card. */
  nome: string;
}

/** Dimensão do PNG gerado — 1080×1080 é o quadrado padrão das redes. */
const TAMANHO_DO_CARD = 1080;

/** URL pública exibida no card e nos textos de compartilhamento. */
const URL_DO_SITE = 'leostella97.github.io/ProtocolFit';

/** Nome do arquivo baixado. */
const NOME_DO_ARQUIVO = 'protocolfit-conquista.png';

/** Arredonda um retângulo no contexto do canvas (helper de desenho). */
function retanguloArredondado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  raio: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.arcTo(x + largura, y, x + largura, y + altura, raio);
  ctx.arcTo(x + largura, y + altura, x, y + altura, raio);
  ctx.arcTo(x, y + altura, x, y, raio);
  ctx.arcTo(x, y, x + largura, y, raio);
  ctx.closePath();
}

/** Paleta festiva dos confetes (verde, dourado, coral, céu e lilás). */
const CORES_DOS_CONFETES = ['#34d399', '#fbbf24', '#fb7185', '#38bdf8', '#a78bfa'];

/**
 * Espalha confetes por uma região do canvas em posições DETERMINÍSTICAS
 * (múltiplos primos módulo o tamanho — sem Math.random): a prévia é
 * redesenhada a cada mudança de dado e a festa não pode "dançar".
 */
function espalharConfetes(
  ctx: CanvasRenderingContext2D,
  quantidade: number,
  alfa: number,
  regiao: { x: number; y: number; largura: number; altura: number },
) {
  ctx.globalAlpha = alfa;
  for (let i = 0; i < quantidade; i += 1) {
    // Posição pseudo-aleatória estável dentro da região informada.
    const x = regiao.x + ((i * 173 + 97) % Math.round(regiao.largura));
    const y = regiao.y + ((i * 269 + 41) % Math.round(regiao.altura));
    ctx.fillStyle = CORES_DOS_CONFETES[i % CORES_DOS_CONFETES.length];
    if (i % 3 === 0) {
      // Fitinha retangular rotacionada.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(i * 0.7);
      ctx.fillRect(-9, -3, 18, 6);
      ctx.restore();
    } else {
      // Confete circular.
      ctx.beginPath();
      ctx.arc(x, y, 4 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Desenha o card completo no contexto 2D informado.
 * Recebe os dados já formatados para manter a função pura de desenho.
 * TEAM_018: tema claro — gradiente pastel, confetes e ticket branco.
 */
function desenharCardDeConquista(
  ctx: CanvasRenderingContext2D,
  dados: {
    destaque: string;
    rotuloDoDestaque: string;
    fraseMotivacional: string;
    estatisticas: { rotulo: string; valor: string; emoji: string; cor: string }[];
    nome: string;
    dataFormatada: string;
    rotuloDoObjetivo: string;
  },
) {
  const S = TAMANHO_DO_CARD;

  // Fundo: gradiente diagonal pastel (pêssego → menta → céu) — leve e alegre.
  const gradienteFundo = ctx.createLinearGradient(0, 0, S, S);
  gradienteFundo.addColorStop(0, '#fff7ed');
  gradienteFundo.addColorStop(0.5, '#ecfdf5');
  gradienteFundo.addColorStop(1, '#f0f9ff');
  ctx.fillStyle = gradienteFundo;
  ctx.fillRect(0, 0, S, S);

  // Confetes em todo o canvas — os do centro ficam escondidos sob o ticket.
  espalharConfetes(ctx, 70, 0.55, { x: 0, y: 0, largura: S, altura: S });

  // ── Ticket branco interno com sombra suave ─────────────────────────────
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#ffffff';
  retanguloArredondado(ctx, 56, 56, S - 112, S - 112, 48);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(5, 150, 105, 0.18)';
  ctx.lineWidth = 3;
  retanguloArredondado(ctx, 56, 56, S - 112, S - 112, 48);
  ctx.stroke();

  // Confetes suaves nos cantos internos do ticket (fora do eixo do conteúdo).
  espalharConfetes(ctx, 12, 0.3, { x: 80, y: 80, largura: 270, altura: 300 });
  espalharConfetes(ctx, 12, 0.3, { x: S - 350, y: 80, largura: 270, altura: 300 });
  espalharConfetes(ctx, 8, 0.3, { x: 80, y: 860, largura: 240, altura: 140 });
  espalharConfetes(ctx, 8, 0.3, { x: S - 320, y: 860, largura: 240, altura: 140 });

  // ── Cabeçalho: troféu + wordmark centrados ─────────────────────────────
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '54px "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText('🏆', S / 2 - 200, 130);
  ctx.fillStyle = '#065f46';
  ctx.font = '800 56px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ProtocolFit', S / 2 - 140, 132);

  // Tagline festiva em caixa alta (espaçamento manual entre letras).
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d97706';
  ctx.font = '700 27px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('S U A   J O R N A D A   E M   N Ú M E R O S', S / 2, 186);

  // Divisor fino sob o cabeçalho (verde bem suave).
  ctx.strokeStyle = 'rgba(5, 150, 105, 0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 222);
  ctx.lineTo(S - 160, 222);
  ctx.stroke();

  // ── Destaque central: brilho dourado + número gigante em gradiente ─────
  const brilho = ctx.createRadialGradient(S / 2, 400, 40, S / 2, 400, 330);
  brilho.addColorStop(0, 'rgba(251, 191, 36, 0.32)');
  brilho.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = brilho;
  ctx.fillRect(0, 0, S, S);

  // Faíscas decorativas flanqueando o número de destaque.
  ctx.font = '46px "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText('✨', S / 2 - 300, 330);
  ctx.fillText('✨', S / 2 + 300, 330);

  // Número de destaque com gradiente verde (identidade) e sombra suave.
  const gradienteNumero = ctx.createLinearGradient(0, 290, 0, 520);
  gradienteNumero.addColorStop(0, '#34d399');
  gradienteNumero.addColorStop(1, '#059669');
  ctx.save();
  ctx.shadowColor = 'rgba(5, 150, 105, 0.30)';
  ctx.shadowBlur = 26;
  ctx.fillStyle = gradienteNumero;
  ctx.font = '800 230px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(dados.destaque, S / 2, 410);
  ctx.restore();

  // Rótulo do destaque + frase motivacional da jornada.
  ctx.fillStyle = '#334155';
  ctx.font = '700 48px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(dados.rotuloDoDestaque.toUpperCase(), S / 2, 532);
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 600 33px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(dados.fraseMotivacional, S / 2, 584);

  // ── Grade 2×2 de estatísticas (cada uma com emoji e cor própria) ────────
  const larguraDaCaixa = 400;
  const alturaDaCaixa = 130;
  const espacoX = 56;
  const espacoY = 22;
  const xInicial = (S - (larguraDaCaixa * 2 + espacoX)) / 2;
  const yInicial = 614;

  dados.estatisticas.forEach((estatistica, indice) => {
    const coluna = indice % 2;
    const linha = Math.floor(indice / 2);
    const x = xInicial + coluna * (larguraDaCaixa + espacoX);
    const y = yInicial + linha * (alturaDaCaixa + espacoY);

    // Caixa tingida com a cor da estatística (fundo ~9%, borda ~33%).
    ctx.fillStyle = `${estatistica.cor}17`;
    retanguloArredondado(ctx, x, y, larguraDaCaixa, alturaDaCaixa, 26);
    ctx.fill();
    ctx.strokeStyle = `${estatistica.cor}55`;
    ctx.lineWidth = 2;
    retanguloArredondado(ctx, x, y, larguraDaCaixa, alturaDaCaixa, 26);
    ctx.stroke();

    // Emoji + valor colorido + rótulo em caixa alta.
    ctx.font = '30px "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText(estatistica.emoji, x + larguraDaCaixa / 2, y + 30);
    ctx.fillStyle = estatistica.cor;
    ctx.font = '800 46px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(estatistica.valor, x + larguraDaCaixa / 2, y + 78);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 23px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(estatistica.rotulo.toUpperCase(), x + larguraDaCaixa / 2, y + 112);
  });

  // ── Rodapé: nome · objetivo · data · site ──────────────────────────────
  const assinatura = dados.nome ? `${dados.nome} · ` : '';
  ctx.fillStyle = '#334155';
  ctx.font = '600 36px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`${assinatura}${dados.rotuloDoObjetivo} · ${dados.dataFormatada}`, S / 2, 950);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(URL_DO_SITE, S / 2, 998);
}

/** Cartão que gera e compartilha a imagem de conquista do usuário. */
export function CartaoConquista({ perfil, checkins, deltaDePeso, nome }: PropriedadesDoCartaoConquista) {
  // Canvas que serve de prévia (elemento visível) e de origem do PNG.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Indica que o navegador aceita navigator.share com arquivos (mobile).
  const [compartilhaArquivos, definirCompartilhaArquivos] = useState(false);
  // Estado de geração do arquivo para compartilhar/baixar.
  const [gerando, definirGerando] = useState(false);
  // Dica exibida após o fluxo do Instagram (download + abrir o site/app).
  const [dicaDoInstagram, definirDicaDoInstagram] = useState(false);

  // Número de destaque do card: sequência atual → total → "1º" (jornada nova).
  const destaque = checkins.sequencia_atual > 0 ? String(checkins.sequencia_atual)
    : checkins.total > 0 ? String(checkins.total)
    : '1º';
  const rotuloDoDestaque = checkins.sequencia_atual > 0
    ? (checkins.sequencia_atual === 1 ? 'dia seguido de treino' : 'dias seguidos de treino')
    : checkins.total > 0 ? 'check-ins concluídos' : 'da jornada';

  // TEAM_018: dias com check-in no mês corrente — a nova estatística do card.
  const diasNoMes = useMemo(() => {
    // Prefixo AAAA-MM do dia civil local (mesmo recorte de data do sistema).
    const mesAtual = hojeLocal().slice(0, 7);
    // Conta os registros do mês — mesma semântica da estatística "check-ins".
    return checkins.registros.filter((registro) => registro.data.startsWith(mesAtual)).length;
  }, [checkins.registros]);

  // TEAM_018: frase motivacional muda conforme o momento da jornada.
  const fraseMotivacional =
    checkins.sequencia_atual >= 7
      ? 'Uma semana de foco — você está imparável! 🚀'
      : checkins.sequencia_atual > 0
        ? 'Sua sequência está em chamas — continue! 🔥'
        : checkins.total > 0
          ? 'Cada check-in é uma vitória — celebre! 🎉'
          : 'O primeiro passo é o mais corajoso — bora! 💪';

  // Quarta estatística: kg evoluído quando há delta, senão o objetivo.
  // Memoizada — a identidade do objeto entra nas deps do efeito de desenho.
  const estatisticaDePeso = useMemo(
    () =>
      deltaDePeso !== null && deltaDePeso !== 0
        ? { rotulo: 'kg evoluídos', valor: `${deltaDePeso > 0 ? '+' : '−'}${formatarDecimal(Math.abs(deltaDePeso))}`, emoji: '⚖️', cor: '#e11d48' }
        : { rotulo: 'objetivo', valor: rotuloDoObjetivo(perfil.objetivo), emoji: '🎯', cor: '#e11d48' },
    [deltaDePeso, perfil.objetivo],
  );

  // Frase motivacional baseada no progresso do usuário.
  const fraseMotivacional = useMemo(() => {
    const seq = checkins.sequencia_atual;
    const rec = checkins.sequencia_maxima;
    if (seq > rec && rec > 0) return 'Novo recorde pessoal! ⚡';
    if (seq === rec && rec > 0) return 'Você igualou seu recorde! 🎯';
    if (seq >= 30) return 'Lenda da constância! 👑';
    if (seq >= 14) return 'Duas semanas de foco total! 🔥';
    if (seq >= 7) return 'Uma semana inteira! Incrível! 💪';
    if (seq >= 3) return 'A constância é sua aliada! 🚀';
    if (seq >= 1) return 'O primeiro passo é o mais importante! 🌱';
    return 'Sua jornada começa hoje! ✨';
  }, [checkins.sequencia_atual, checkins.sequencia_maxima]);

  // Meta à vista: quantos dias faltam para bater o recorde.
  const metaAVista = useMemo(() => {
    const seq = checkins.sequencia_atual;
    const rec = checkins.sequencia_maxima;
    if (rec === 0) return null; // sem recorde ainda
    if (seq > rec) return `Novo recorde: ${seq} dias!`;
    if (seq === rec) return 'Você está no seu recorde!';
    const faltam = rec - seq;
    return `Falta${faltam > 1 ? 'm' : ''} ${faltam} dia${faltam > 1 ? 's' : ''} para bater seu recorde de ${rec}d`;
  }, [checkins.sequencia_atual, checkins.sequencia_maxima]);

  // Redesenha a prévia sempre que os dados da conquista mudam.
  useEffect(() => {
    const contexto = canvasRef.current?.getContext('2d');
    if (contexto) {
      desenharCardDeConquista(contexto, {
        destaque,
        rotuloDoDestaque,
        fraseMotivacional,
        estatisticas: [
          { rotulo: 'check-ins', valor: String(checkins.total), emoji: '✅', cor: '#059669' },
          { rotulo: 'recorde', valor: `${checkins.sequencia_maxima}d`, emoji: '🏅', cor: '#d97706' },
          // TEAM_018: dias de check-in no mês corrente.
          { rotulo: 'dias no mês', valor: String(diasNoMes), emoji: '📅', cor: '#0284c7' },
          estatisticaDePeso,
        ],
        nome,
        dataFormatada: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        rotuloDoObjetivo: rotuloDoObjetivo(perfil.objetivo),
      });
    }
  }, [destaque, rotuloDoDestaque, fraseMotivacional, estatisticaDePeso, diasNoMes, checkins.total, checkins.sequencia_maxima, nome, perfil.objetivo]);

  // Detecta suporte a compartilhamento de arquivo (guard: navigator existe só no cliente).
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'canShare' in navigator && 'share' in navigator) {
      try {
        const arquivoDeTeste = new File([new Blob()], 'teste.png', { type: 'image/png' });
        definirCompartilhaArquivos(navigator.canShare({ files: [arquivoDeTeste] }));
      } catch {
        definirCompartilhaArquivos(false);
      }
    }
  }, []);

  /** Frase de compartilhamento usada nos links de texto. */
  const textoDeCompartilhamento = useCallback(() => {
    const quem = nome ? `${nome} está` : 'Estou';
    const parteDaSequencia =
      checkins.sequencia_atual > 0
        ? `há ${checkins.sequencia_atual} dia${checkins.sequencia_atual === 1 ? '' : 's'} seguido${checkins.sequencia_atual === 1 ? '' : 's'} de treino`
        : `com ${checkins.total} check-in${checkins.total === 1 ? '' : 's'} concluído${checkins.total === 1 ? '' : 's'}`;
    const parteDoPeso =
      deltaDePeso !== null && deltaDePeso !== 0
        ? ` e ${formatarDecimal(Math.abs(deltaDePeso))} kg ${deltaDePeso < 0 ? 'a menos' : 'a mais'}`
        : '';
    return `${quem} ${parteDaSequencia}${parteDoPeso} no ProtocolFit! 💪 Objetivo: ${rotuloDoObjetivo(perfil.objetivo)}. ${URL_DO_SITE}`;
  }, [nome, checkins.sequencia_atual, checkins.total, deltaDePeso, perfil.objetivo]);

  /** Extrai o PNG do canvas como Blob (promessa sobre o callback do toBlob). */
  function gerarBlob(): Promise<Blob> {
    return new Promise((resolver, rejeitar) => {
      canvasRef.current?.toBlob((blob) => {
        if (blob) {
          resolver(blob);
        } else {
          rejeitar(new Error('Falha ao gerar a imagem.'));
        }
      }, 'image/png');
    });
  }

  /** Dispara o download do PNG no dispositivo do usuário. */
  async function baixarImagem() {
    definirGerando(true);
    try {
      const blob = await gerarBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = NOME_DO_ARQUIVO;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      definirGerando(false);
    }
  }

  /** Compartilha o PNG via planilha nativa (mobile cobre WhatsApp/Instagram). */
  async function compartilharImagem() {
    definirGerando(true);
    try {
      const blob = await gerarBlob();
      const arquivo = new File([blob], NOME_DO_ARQUIVO, { type: 'image/png' });
      await navigator.share({
        files: [arquivo],
        title: 'Minha conquista no ProtocolFit',
        text: textoDeCompartilhamento(),
      });
    } catch {
      // Usuário cancelou a planilha ou o navegador recusou — não é erro de tela.
    } finally {
      definirGerando(false);
    }
  }

  /** WhatsApp web/app: texto + link (o URL scheme não anexa imagem). */
  function compartilharNoWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(textoDeCompartilhamento())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /** Facebook sharer: link do site + frase da conquista. */
  function compartilharNoFacebook() {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://${URL_DO_SITE}`)}&quote=${encodeURIComponent(textoDeCompartilhamento())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /** Instagram não tem API web de post: baixa o PNG e abre o app/site. */
  async function compartilharNoInstagram() {
    await baixarImagem();
    definirDicaDoInstagram(true);
    window.open('https://www.instagram.com', '_blank', 'noopener,noreferrer');
  }

  return (
    <Cartao>
      <CartaoCabecalho>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-primary shrink-0" />
              <CartaoTitulo>Card de conquista</CartaoTitulo>
            </div>
            <CartaoDescricao>
              Gere sua imagem de progresso e compartilhe nas redes
            </CartaoDescricao>
          </div>
          {/* Frase motivacional + Meta à vista (lado direito do cabeçalho) */}
          <div className="hidden sm:flex flex-col items-end gap-1 text-right shrink-0">
            <p className="text-sm font-medium text-primary italic leading-snug">
              &ldquo;{fraseMotivacional}&rdquo;
            </p>
            {metaAVista ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="size-3" />
                {metaAVista}
              </p>
            ) : null}
          </div>
        </div>
      </CartaoCabecalho>
      <CartaoConteudo className="space-y-4">
        {/* Prévia do PNG exportado — exibida 5x menor na tela (216px) que o arquivo (1080px). */}
        <canvas
          ref={canvasRef}
          width={TAMANHO_DO_CARD}
          height={TAMANHO_DO_CARD}
          className="w-[216px] h-[216px] rounded-xl border border-border"
          aria-label="Prévia do card de conquista"
        />

        {/* Ações principais: compartilhar (nativo, quando há) e salvar. */}
        <div className="flex flex-wrap gap-2">
          {compartilhaArquivos ? (
            <Botao tamanho="pequeno" onClick={() => void compartilharImagem()} disabled={gerando}>
              {gerando ? <Loader2 className="animate-spin" /> : <Share2 />}
              Compartilhar
            </Botao>
          ) : null}
          <Botao
            tamanho="pequeno"
            variante={compartilhaArquivos ? 'contorno' : 'padrao'}
            onClick={() => void baixarImagem()}
            disabled={gerando}
          >
            {gerando && !compartilhaArquivos ? <Loader2 className="animate-spin" /> : <Download />}
            Salvar imagem
          </Botao>
        </div>

        {/* Atalhos por rede (texto+link; imagem vai só no share nativo). */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Compartilhar em
          </p>
          <div className="flex flex-wrap gap-2">
            <Botao tamanho="pequeno" variante="contorno" onClick={compartilharNoWhatsApp}>
              <MessageCircle />
              WhatsApp
            </Botao>
            <Botao tamanho="pequeno" variante="contorno" onClick={compartilharNoFacebook}>
              <Facebook />
              Facebook
            </Botao>
            <Botao tamanho="pequeno" variante="contorno" onClick={() => void compartilharNoInstagram()}>
              <Instagram />
              Instagram
            </Botao>
          </div>
          <p className="text-xs text-muted-foreground">
            {dicaDoInstagram
              ? 'Imagem baixada! No Instagram, poste pelo feed ou story.'
              : 'No Instagram, a imagem é baixada e você posta no feed ou story.'}
          </p>
        </div>
      </CartaoConteudo>
    </Cartao>
  );
}
