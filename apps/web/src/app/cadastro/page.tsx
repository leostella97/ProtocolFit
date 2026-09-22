'use client';

// Hooks do React: efeitos e estado.
import { useEffect, useState } from 'react';
// Tipo do evento de envio de formulário.
import type { FormEvent } from 'react';
// Navegação declarativa entre páginas do Next.js.
import Link from 'next/link';
// Roteador para redirecionamentos programáticos.
import { useRouter } from 'next/navigation';
// Animação de entrada do cartão.
import { motion } from 'framer-motion';
// Ícones da interface.
import { AlertCircle, ArrowLeft, Eye, EyeOff, HeartPulse, Loader2 } from 'lucide-react';
// Cadastro e erro tipado da API.
import { cadastrarUsuario, ErroDaApi } from '@/lib/api';
// Gestão da sessão no navegador (token e dados do usuário).
import { guardarToken, guardarUsuario, possuiSessao } from '@/lib/armazenamento';
// Constantes de animação do design system.
import { ANIMACAO_DE_ENTRADA, TRANSICAO_SUAVE } from '@/lib/constantes';
// Utilitário de classes condicionais.
import { combinarClasses } from '@/lib/util';
// Componentes de interface prontos do projeto.
import { Botao } from '@/components/ui/button';
import {
  Cartao,
  CartaoCabecalho,
  CartaoConteudo,
  CartaoDescricao,
  CartaoRodape,
  CartaoTitulo,
} from '@/components/ui/card';
import { CampoDeEntrada } from '@/components/ui/input';
import { Rotulo } from '@/components/ui/label';

/** Erros de validação local, organizados por campo. */
interface ErrosDoFormulario {
  nome?: string;
  email?: string;
  senha?: string;
  confirmarSenha?: string;
}

/** Padrão básico de e-mail válido (nome@domínio.extensão). */
const PADRAO_DE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Página de cadastro — cria a conta e segue para o onboarding. */
export default function PaginaDeCadastro() {
  // Roteador usado para redirecionar após o cadastro.
  const roteador = useRouter();
  // Nome completo digitado pelo usuário.
  const [nome, definirNome] = useState('');
  // E-mail digitado pelo usuário.
  const [email, definirEmail] = useState('');
  // Senha e confirmação digitadas pelo usuário.
  const [senha, definirSenha] = useState('');
  const [confirmarSenha, definirConfirmarSenha] = useState('');
  // Controla a exibição das senhas (olho aberto/fechado).
  const [mostrandoSenha, definirMostrandoSenha] = useState(false);
  const [mostrandoConfirmacao, definirMostrandoConfirmacao] = useState(false);
  // Indica o envio em andamento (desabilita o botão).
  const [carregando, definirCarregando] = useState(false);
  // Erros de validação local, um por campo.
  const [erros, definirErros] = useState<ErrosDoFormulario>({});
  // Mensagem de erro vinda da API (ou de conexão).
  const [erro, definirErro] = useState<string | null>(null);

  // Ao montar a página: quem já tem sessão ativa vai direto ao painel.
  useEffect(() => {
    // Verifica o token salvo no navegador.
    if (possuiSessao()) {
      // Substitui a rota para não deixar o cadastro no histórico.
      roteador.replace('/painel');
    }
  }, [roteador]);

  /** Valida os campos localmente e devolve true quando tudo está certo. */
  function validarFormulario(): boolean {
    // Acumula os erros encontrados em cada campo.
    const novosErros: ErrosDoFormulario = {};
    // Nome completo precisa ter pelo menos 3 letras.
    if (nome.trim().length < 3) {
      novosErros.nome = 'Informe seu nome completo (mínimo de 3 letras).';
    }
    // E-mail precisa bater com o padrão básico de endereço.
    if (!PADRAO_DE_EMAIL.test(email.trim())) {
      novosErros.email = 'Informe um e-mail válido (ex.: voce@exemplo.com).';
    }
    // Senha precisa ter no mínimo 8 caracteres.
    if (senha.length < 8) {
      novosErros.senha = 'A senha precisa ter pelo menos 8 caracteres.';
    }
    // A confirmação precisa ser idêntica à senha.
    if (confirmarSenha !== senha) {
      novosErros.confirmarSenha = 'As senhas não conferem.';
    }
    // Publica os erros no estado.
    definirErros(novosErros);
    // Formulário válido somente quando nenhum erro foi coletado.
    return Object.keys(novosErros).length === 0;
  }

  /** Envia o cadastro, guarda a sessão e leva ao onboarding. */
  async function aoEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    // Impede o recarregamento da página.
    evento.preventDefault();
    // Aborta o envio quando a validação local falha.
    if (!validarFormulario()) {
      return;
    }
    // Liga o estado de carregamento e limpa erros anteriores.
    definirCarregando(true);
    definirErro(null);
    try {
      // Cria a conta na API com os dados do formulário.
      const resposta = await cadastrarUsuario({ nome: nome.trim(), email: email.trim(), senha });
      // Persiste o token e os dados públicos do usuário.
      guardarToken(resposta.token);
      guardarUsuario(resposta.usuario);
      // Segue para o wizard de onboarding (o perfil ainda não existe).
      roteador.replace('/onboarding');
      roteador.refresh();
    } catch (erroCapturado) {
      // Erros da API exibem a mensagem já traduzida pelo servidor.
      definirErro(
        erroCapturado instanceof ErroDaApi
          ? erroCapturado.message
          : 'Não foi possível criar a conta agora. Tente novamente em instantes.',
      );
    } finally {
      // Encerra o estado de carregamento em qualquer desfecho.
      definirCarregando(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Seta para a esquerda: volta para a página inicial. */}
      <Link
        href="/"
        aria-label="Voltar para a página inicial"
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Início
      </Link>
      {/* Brilho decorativo atrás do cartão. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      {/* Cartão centralizado com animação de entrada padrão. */}
      <motion.div
        initial={ANIMACAO_DE_ENTRADA.escondido}
        animate={ANIMACAO_DE_ENTRADA.visivel}
        transition={TRANSICAO_SUAVE}
        className="relative w-full max-w-md"
      >
        <Cartao className="sombra-suave">
          <CartaoCabecalho className="items-center gap-3 text-center">
            {/* Logo da marca em gradiente. */}
            <span className="gradiente-marca mx-auto flex size-12 items-center justify-center rounded-xl text-white">
              <HeartPulse className="size-6" />
            </span>
            <CartaoTitulo className="text-2xl">Crie sua conta grátis</CartaoTitulo>
            <CartaoDescricao>Leva menos de 2 minutos para gerar seu primeiro plano.</CartaoDescricao>
          </CartaoCabecalho>
          <CartaoConteudo>
            {/* noValidate: a validação fica por conta da nossa lógica amigável. */}
            <form onSubmit={aoEnviar} className="flex flex-col gap-4" noValidate>
              {/* Campo de nome completo. */}
              <div className="flex flex-col gap-2">
                <Rotulo htmlFor="nome">Nome completo</Rotulo>
                <CampoDeEntrada
                  id="nome"
                  type="text"
                  autoComplete="name"
                  placeholder="Maria da Silva"
                  value={nome}
                  onChange={(evento) => {
                    // Atualiza o valor e limpa o erro do campo enquanto digita.
                    definirNome(evento.target.value);
                    definirErros((atuais) => ({ ...atuais, nome: undefined }));
                  }}
                  aria-invalid={Boolean(erros.nome)}
                  className={combinarClasses(erros.nome && 'border-destructive')}
                />
                {/* Mensagem de erro específica do campo. */}
                {erros.nome && <p className="text-xs text-destructive">{erros.nome}</p>}
              </div>
              {/* Campo de e-mail. */}
              <div className="flex flex-col gap-2">
                <Rotulo htmlFor="email">E-mail</Rotulo>
                <CampoDeEntrada
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(evento) => {
                    // Atualiza o valor e limpa o erro do campo enquanto digita.
                    definirEmail(evento.target.value);
                    definirErros((atuais) => ({ ...atuais, email: undefined }));
                  }}
                  aria-invalid={Boolean(erros.email)}
                  className={combinarClasses(erros.email && 'border-destructive')}
                />
                {erros.email && <p className="text-xs text-destructive">{erros.email}</p>}
              </div>
              {/* Campo de senha com botão de olho. */}
              <div className="flex flex-col gap-2">
                <Rotulo htmlFor="senha">Senha</Rotulo>
                <div className="relative">
                  <CampoDeEntrada
                    id="senha"
                    type={mostrandoSenha ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Mínimo de 8 caracteres"
                    value={senha}
                    onChange={(evento) => {
                      // Atualiza o valor e limpa o erro do campo enquanto digita.
                      definirSenha(evento.target.value);
                      definirErros((atuais) => ({ ...atuais, senha: undefined }));
                    }}
                    aria-invalid={Boolean(erros.senha)}
                    className={combinarClasses('pr-11', erros.senha && 'border-destructive')}
                  />
                  {/* Alterna entre olho aberto (ocultar) e fechado (mostrar). */}
                  <button
                    type="button"
                    onClick={() => definirMostrandoSenha((atual) => !atual)}
                    aria-label={mostrandoSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {mostrandoSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {erros.senha && <p className="text-xs text-destructive">{erros.senha}</p>}
              </div>
              {/* Campo de confirmação de senha com botão de olho. */}
              <div className="flex flex-col gap-2">
                <Rotulo htmlFor="confirmar-senha">Confirmar senha</Rotulo>
                <div className="relative">
                  <CampoDeEntrada
                    id="confirmar-senha"
                    type={mostrandoConfirmacao ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repita a senha"
                    value={confirmarSenha}
                    onChange={(evento) => {
                      // Atualiza o valor e limpa o erro do campo enquanto digita.
                      definirConfirmarSenha(evento.target.value);
                      definirErros((atuais) => ({ ...atuais, confirmarSenha: undefined }));
                    }}
                    aria-invalid={Boolean(erros.confirmarSenha)}
                    className={combinarClasses('pr-11', erros.confirmarSenha && 'border-destructive')}
                  />
                  {/* Alterna entre olho aberto (ocultar) e fechado (mostrar). */}
                  <button
                    type="button"
                    onClick={() => definirMostrandoConfirmacao((atual) => !atual)}
                    aria-label={mostrandoConfirmacao ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {mostrandoConfirmacao ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {erros.confirmarSenha && (
                  <p className="text-xs text-destructive">{erros.confirmarSenha}</p>
                )}
              </div>
              {/* Alerta de erro vindo da API. */}
              {erro && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}
              {/* Botão de envio com spinner durante o carregamento. */}
              <Botao type="submit" variante="gradiente" tamanho="grande" disabled={carregando} className="mt-2 w-full">
                {carregando ? (
                  <>
                    <Loader2 className="animate-spin" /> Criando conta…
                  </>
                ) : (
                  'Criar conta e começar'
                )}
              </Botao>
            </form>
          </CartaoConteudo>
          <CartaoRodape className="justify-center text-sm text-muted-foreground">
            Já tenho conta?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Entrar
            </Link>
          </CartaoRodape>
        </Cartao>
      </motion.div>
    </div>
  );
}
