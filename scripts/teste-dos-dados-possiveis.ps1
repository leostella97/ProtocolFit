# ============================================================================
# teste-dos-dados-possiveis.ps1 - Gera treino + dieta para TODOS os dados
# possiveis do site e confere que o sistema responde corretamente.
#
# Cobre: 2 sexos x 17 faixas etarias x 3 objetivos x 2 modalidades = 204
# combinacoes, mais casos-limite de peso (30 e 300 kg), altura (100 e 230 cm),
# quantidade de dias (2 e 7) e peso com decimal.
#
# Uso: suba a API (npm run dev:api) e execute este script.
# ============================================================================

# URL base da API.
$base = "http://localhost:3333/api"

# Faixas etarias oferecidas pelo site (todas as 17).
$faixas = @("15-19","19-23","23-27","27-31","31-35","35-39","39-43","43-47","47-51","51-55","55-59","59-63","63-67","67-71","71-75","75-79","79-83")

# Dias da semana (para montar dias_disponiveis).
$diasDaSemana = @("segunda","terca","quarta","quinta","sexta","sabado","domingo")

# Cria um usuario unico para a execucao.
$email = "dados" + (Get-Random -Minimum 100000 -Maximum 999999) + "@example.com"
$cadastro = Invoke-RestMethod -Uri "$base/auth/cadastro" -Method POST -ContentType "application/json" -Body (@{ nome = "Teste Dados"; email = $email; senha = "senhaSegura123" } | ConvertTo-Json)
$token = $cadastro.token
$cabecalhos = @{ Authorization = "Bearer $token" }

# Contadores do relatorio.
$total = 0
$falhas = 0

# Funcao: envia o perfil e valida o plano gerado.
function TestarPerfil {
    param([string]$rotulo, [string]$sexo, [string]$faixa, [double]$peso, [double]$altura, [string]$objetivo, [int]$quantidadeDias, [string]$modalidade)
    $script:total += 1
    $diasEscolhidos = $diasDaSemana[0..($quantidadeDias - 1)]
    $corpo = @{
        sexo = $sexo; faixa_etaria = $faixa; peso_kg = $peso; altura_cm = $altura;
        objetivo = $objetivo; frequencia_semanal = $quantidadeDias;
        dias_disponiveis = $diasEscolhidos; modalidade = $modalidade
    } | ConvertTo-Json -Depth 5
    try {
        $resposta = Invoke-RestMethod -Uri "$base/perfil" -Method POST -Headers $cabecalhos -ContentType "application/json" -Body $corpo
    } catch {
        $script:falhas += 1
        Write-Output ("FALHA  " + $rotulo + " -> HTTP: " + $_.ErrorDetails.Message)
        return
    }
    # Validacoes: treino com dias exatos, dieta montada e meta valida.
    $okTreino = $resposta.treino.dias -eq $quantidadeDias -and $resposta.treino.dias_da_semana.Count -eq $quantidadeDias
    $okDieta = $resposta.dieta.refeicoes.Count -gt 0 -and $resposta.dieta.refeicoes[0].itens.Count -gt 0
    $okMeta = $resposta.dieta.meta.meta_kcal -gt 0 -and $resposta.dieta.meta.proteinas_g -gt 0 -and $resposta.dieta.meta.agua_ml -gt 0
    if ($okTreino -and $okDieta -and $okMeta) {
        Write-Output ("OK     " + $rotulo + " -> " + $resposta.dieta.meta.meta_kcal + " kcal")
    } else {
        $script:falhas += 1
        Write-Output ("FALHA  " + $rotulo + " -> treino_dias=" + $resposta.treino.dias + " refeicoes=" + $resposta.dieta.refeicoes.Count + " kcal=" + $resposta.dieta.meta.meta_kcal)
    }
}

# ============================================================================
# 1) MATRIZ PRINCIPAL: 2 sexos x 17 faixas x 3 objetivos x 2 modalidades
# ============================================================================
foreach ($sexo in @("masculino", "feminino")) {
    # Peso/altura representativos por sexo.
    $pesoBase = 82.5; $alturaBase = 178
    if ($sexo -eq "feminino") { $pesoBase = 62.0; $alturaBase = 165 }
    foreach ($faixa in $faixas) {
        foreach ($objetivo in @("emagrecimento", "hipertrofia", "corrida")) {
            foreach ($modalidade in @("academia", "pesocorporal")) {
                TestarPerfil ("$sexo/$faixa/$objetivo/$modalidade") $sexo $faixa $pesoBase $alturaBase $objetivo 4 $modalidade
            }
        }
    }
}

# ============================================================================
# 2) CASOS-LIMITE: pesos, alturas e dias extremos
# ============================================================================
TestarPerfil "limite/peso-30kg"  "masculino" "15-19" 30.0 178 "hipertrofia"   4 "academia"
TestarPerfil "limite/peso-300kg" "masculino" "79-83" 300.0 178 "emagrecimento" 4 "pesocorporal"
TestarPerfil "limite/altura-100" "feminino"  "15-19" 45.0 100 "corrida"      4 "academia"
TestarPerfil "limite/altura-230" "masculino" "79-83" 90.0 230 "hipertrofia"   4 "pesocorporal"
TestarPerfil "limite/peso-decimal" "feminino" "27-31" 57.35 162 "emagrecimento" 4 "academia"
TestarPerfil "limite/2-dias"  "masculino" "27-31" 82.5 178 "hipertrofia"   2 "academia"
TestarPerfil "limite/7-dias"  "feminino"  "27-31" 62.0 165 "emagrecimento" 7 "pesocorporal"
TestarPerfil "limite/7-dias-corrida" "masculino" "51-55" 75.0 172 "corrida" 7 "academia"

# ============================================================================
# RELATORIO FINAL
# ============================================================================
Write-Output ""
Write-Output "=== DADOS POSSIVEIS: $total perfis testados | $falhas falha(s) ==="
if ($falhas -eq 0) {
    Write-Output "RESULTADO: TREINO E DIETA GERADOS PARA TODOS OS DADOS POSSIVEIS DO SITE."
} else {
    Write-Output "RESULTADO: EXISTEM FALHAS - revise as rotas e os modelos."
    exit 1
}
