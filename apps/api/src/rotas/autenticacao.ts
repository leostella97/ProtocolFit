/**
 * autenticacao.ts
 * ---------------------------------------------------------------------------
 * Rotas de cadastro e login do ProtocolFit.
 *
 * Segurança:
 *  - Senhas armazenadas SOMENTE como hash bcrypt (nunca em texto puro).
 *  - Após 3 tentativas de login falhas, a conta é bloqueada por 5 horas.
 *  - O contador zera automaticamente após um login bem-sucedido.
 * ---------------------------------------------------------------------------
 */
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import {
  buscarUsuarioPorEmail,
  criarUsuario,
  limparTentativasFalhas,
  registrarTentativaFalha,
  type LinhaUsuario,
} from '../bd/banco.js';
import { HORAS_DE_BLOQUEIO, LIMITE_TENTATIVAS_LOGIN } from '../util/constantes.js';
import { enviarErro } from '../util/respostas.js';

/** Custo do hash bcrypt (12 rounds = equilíbrio entre segurança e latência). */
const CUSTO_HASH = 12;

/** Corpo esperado na rota de cadastro. */
interface CorpoCadastro {
  nome: string;
  email: string;
  senha: string;
}

/** Corpo esperado na rota de login. */
interface CorpoLogin {
  email: string;
  senha: string;
}

/** Máscara pública do usuário (nunca expõe hash de senha ou bloqueio). */
function usuarioPublico(usuario: LinhaUsuario): { id: number; nome: string; email: string; criado_em: string } {
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, criado_em: usuario.criado_em };
}

/** Milissegundos contidos em uma hora. */
const UMA_HORA_EM_MS = 60 * 60 * 1000;

/** Registra as rotas de autenticação (prefixo /api/auth). */
export async function rotasAutenticacao(app: FastifyInstance): Promise<void> {
  /** POST /api/auth/cadastro — cria a conta do usuário. */
  app.post('/cadastro', async (requisicao, resposta) => {
    const { nome, email, senha } = (requisicao.body ?? {}) as Partial<CorpoCadastro>;

    // Validação do nome: obrigatório e com pelo menos 3 caracteres.
    if (!nome || nome.trim().length < 3) {
      return enviarErro(resposta, 400, 'Informe seu nome completo (mínimo de 3 caracteres).');
    }

    // Normaliza o e-mail (minúsculas e sem espaços nas bordas).
    const emailLimpo = (email ?? '').trim().toLowerCase();

    // Validação do formato de e-mail com expressão regular simples.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      return enviarErro(resposta, 400, 'Informe um e-mail válido.');
    }

    // Validação da senha: mínimo de 8 caracteres.
    if (!senha || senha.length < 8) {
      return enviarErro(resposta, 400, 'A senha precisa ter pelo menos 8 caracteres.');
    }

    // Verifica se o e-mail já está cadastrado (unicidade no banco).
    if (buscarUsuarioPorEmail(emailLimpo)) {
      return enviarErro(resposta, 409, 'Este e-mail já está cadastrado. Faça login para continuar.');
    }

    // Gera o hash bcrypt da senha — a senha pura nunca toca o disco.
    const senhaHash = await bcrypt.hash(senha, CUSTO_HASH);

    // Cria o usuário no SQLite e obtém o id gerado.
    const idUsuario = criarUsuario(nome.trim(), emailLimpo, senhaHash);

    // Emite o token JWT de acesso (7 dias) com o id do usuário no `sub`.
    const token = app.jwt.sign({ sub: String(idUsuario), email: emailLimpo });

    // Responde com o token e os dados públicos do usuário.
    return resposta.code(201).send({
      token,
      usuario: { id: idUsuario, nome: nome.trim(), email: emailLimpo },
    });
  });

  /** POST /api/auth/login — autentica com bloqueio após 3 falhas. */
  app.post('/login', async (requisicao, resposta) => {
    const { email, senha } = (requisicao.body ?? {}) as Partial<CorpoLogin>;

    // Normaliza o e-mail antes da consulta.
    const emailLimpo = (email ?? '').trim().toLowerCase();
    if (!emailLimpo || !senha) {
      return enviarErro(resposta, 400, 'Informe e-mail e senha.');
    }

    // Busca o usuário no banco.
    const usuario = buscarUsuarioPorEmail(emailLimpo);

    // Não revela se o e-mail existe: resposta genérica evita enumeração.
    if (!usuario) {
      return enviarErro(resposta, 401, 'Credenciais inválidas.');
    }

    // Timestamp atual em milissegundos.
    const agoraMs = Date.now();

    // Verifica se a conta está dentro do período de bloqueio de 5 horas.
    if (usuario.bloqueado_ate !== null && usuario.bloqueado_ate > agoraMs) {
      const horasRestantes = Math.ceil((usuario.bloqueado_ate - agoraMs) / UMA_HORA_EM_MS);
      return enviarErro(
        resposta,
        423,
        `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${horasRestantes} hora(s).`,
      );
    }

    // Compara a senha informada com o hash armazenado.
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    // Senha incorreta: registra a tentativa falha.
    if (!senhaValida) {
      const novasTentativas = usuario.tentativas_falhas + 1;

      // Ao atingir o limite, bloqueia a conta por 5 horas e zera o contador.
      if (novasTentativas >= LIMITE_TENTATIVAS_LOGIN) {
        registrarTentativaFalha(usuario.id, 0, agoraMs + HORAS_DE_BLOQUEIO * UMA_HORA_EM_MS);
        return enviarErro(
          resposta,
          423,
          `Conta bloqueada por ${HORAS_DE_BLOQUEIO} horas após ${LIMITE_TENTATIVAS_LOGIN} tentativas inválidas.`,
        );
      }

      // Ainda há tentativas restantes: apenas incrementa o contador.
      registrarTentativaFalha(usuario.id, novasTentativas, usuario.bloqueado_ate);
      const restantes = LIMITE_TENTATIVAS_LOGIN - novasTentativas;
      return enviarErro(resposta, 401, `Senha incorreta. Tentativas restantes: ${restantes}.`);
    }

    // Senha correta: zera o contador de falhas e libera a conta.
    limparTentativasFalhas(usuario.id);

    // Emite um novo token JWT de acesso.
    const token = app.jwt.sign({ sub: String(usuario.id), email: usuario.email });

    // Responde com o token e os dados públicos do usuário.
    return resposta.send({ token, usuario: usuarioPublico(usuario) });
  });
}
