# ============================================================================
# teste-da-matriz.ps1 - Valida a MATRIZ COMPLETA de treinos do ProtocolFit
# Percorre as 36 combinacoes (2 modalidades x 3 objetivos x 6 quantidades de
# dias = 2..7) e confere, para cada uma:
#   1) o treino devolvido bate com a modalidade/objetivo/dias escolhidos;
#   2) o vinculo com o modelo mestre (treino.modelo_origem);
#   3) o vinculo com o USUARIO (o plano retornado e a copia do usuario,
#      identificada por treino.id e gravada no SQLite individual).
# Uso: suba a API (npm run dev:api) e execute este script.
# ============================================================================

# URL base da API.
$base = "http://localhost:3333/api"

# Lista dos dias da semana na ordem canonica (para montar dias_disponiveis).
$diasDaSemana = @("segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo")

# Cria um usuario unico para a execucao da matriz.
$email = "matriz" + (Get-Random -Minimum 10000 -Maximum 99999) + "@example.com"
$cadastro = Invoke-RestMethod -Uri "$base/auth/cadastro" -Method POST -ContentType "application/json" -Body (@{ nome = "Teste Matriz"; email = $email; senha = "senhaSegura123" } | ConvertTo-Json)
$token = $cadastro.token
$cabecalhos = @{ Authorization = "Bearer $token" }

# Contadores do relatorio final.
$total = 0
$falhas = 0

# Percorre todas as combinacoes da matriz do site.
foreach ($modalidade in @("academia", "pesocorporal")) {
    foreach ($objetivo in @("emagrecimento", "hipertrofia", "corrida")) {
        foreach ($quantidade in 2..7) {
            $total += 1
            # Monta o corpo do perfil com N dias disponiveis.
            $diasEscolhidos = $diasDaSemana[0..($quantidade - 1)]
            $corpo = @{
                sexo = "masculino"; faixa_etaria = "27-31"; peso_kg = 82.5; altura_cm = 178;
                objetivo = $objetivo; frequencia_semanal = $quantidade;
                dias_disponiveis = $diasEscolhidos; modalidade = $modalidade
            } | ConvertTo-Json -Depth 5

            try {
                # Salva o perfil e recebe os planos gerados para ESTE usuario.
                $resposta = Invoke-RestMethod -Uri "$base/perfil" -Method POST -Headers $cabecalhos -ContentType "application/json" -Body $corpo
            } catch {
                $falhas += 1
                Write-Output ("FALHA HTTP: " + $modalidade + "/" + $objetivo + "/" + $quantidade + "dias - " + $_.ErrorDetails.Message)
                continue
            }

            # 1) Modalidade e objetivo do treino.
            $okModalidade = $resposta.treino.modalidade -eq $modalidade
            $okObjetivo = $resposta.treino.objetivo -eq $objetivo
            # 2) Quantidade exata de dias.
            $okDias = $resposta.treino.dias -eq $quantidade
            # 3) Vinculo com o modelo mestre escolhido.
            $okOrigemTreino = $resposta.treino.modelo_origem -eq ("treinos/" + $modalidade + "/" + $objetivo)
            $okOrigemDieta = $resposta.dieta.modelo_origem -eq ("dietas/" + $objetivo)
            # 4) Vinculo com o usuario: a copia tem id proprio no SQLite.
            $okVinculoUsuario = $resposta.treino.id -gt 0 -and $resposta.dieta.id -gt 0

            if ($okModalidade -and $okObjetivo -and $okDias -and $okOrigemTreino -and $okOrigemDieta -and $okVinculoUsuario) {
                Write-Output ("OK     " + $modalidade + "/" + $objetivo + "/" + $quantidade + "dias -> " + $resposta.treino.nome)
            } else {
                $falhas += 1
                Write-Output ("FALHA  " + $modalidade + "/" + $objetivo + "/" + $quantidade + "dias | modalidade=" + $resposta.treino.modalidade + " objetivo=" + $resposta.treino.objetivo + " dias=" + $resposta.treino.dias + " origem=" + $resposta.treino.modelo_origem)
            }
        }
    }
}

# Relatorio final da matriz.
Write-Output ""
Write-Output "=== MATRIZ: $total combinacoes | $falhas falha(s) ==="
if ($falhas -eq 0) {
    Write-Output "RESULTADO: TODAS AS 36 COMBINACOES VINCULADAS CORRETAMENTE AO USUARIO."
} else {
    Write-Output "RESULTADO: EXISTEM FALHAS - revise os arquivos JSON e as rotas."
    exit 1
}
