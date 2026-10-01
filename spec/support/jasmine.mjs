// TEAM_007: configuração do Jasmine — specs TypeScript rodando via tsx
// (o script "test" da raiz invoca `node --import=tsx`, que habilita .ts).
export default {
  spec_dir: "spec",
  spec_files: [
    "**/*[sS]pec.?(m)js",
    "**/*[sS]pec.?(m)ts"
  ],
  helpers: [
    "helpers/**/*.?(m)js"
  ],
  env: {
    stopSpecOnExpectationFailure: false,
    random: true,
    forbidDuplicateNames: true
  }
}
