// @ts-check
/**
 * Configuration Danger — plafond de taille des PR.
 *
 * Les grosses PR épuisent l'attention du relecteur. Cette règle budgète les
 * lignes *utiles* modifiées et, quand un budget est dépassé, poste un
 * commentaire suggérant comment découper le travail.
 *
 * Ce qui compte (budgets séparés pour qu'une PR chargée en tests ne fasse pas
 * sauter le plafond du code de production) :
 *   - Code de production : lignes ajoutées + supprimées, HORS fichiers générés,
 *     lockfiles et snapshots (voir IGNORED_PATTERNS) et hors fichiers de test
 *     (voir TEST_PATTERNS). Budget : MAX_PROD_LINES.
 *   - Code de test : lignes ajoutées + supprimées dans les fichiers qui
 *     correspondent à TEST_PATTERNS. Budget : MAX_TEST_LINES (plus généreux —
 *     le code de test se relit plus vite).
 *
 * Dérogation :
 *   - Ajouter le label `large-pr-justified` à la PR.
 *   - La dérogation ne prend effet que si le corps de la PR contient une
 *     justification non vide sous un titre « ## Large PR justification ».
 *     Sans cette note, la dérogation est refusée et l'alerte de taille
 *     se déclenche quand même.
 *
 * Exécuté en CI via `.github/workflows/danger.yml` sur les événements
 * pull_request.
 */

const { danger, warn, message, markdown, fail } = require("danger");

/** Nombre max de lignes utiles de code de PRODUCTION avant alerte. */
const MAX_PROD_LINES = 400;

/** Nombre max de lignes utiles de code de TEST avant alerte. */
const MAX_TEST_LINES = 800;

/** Label qui exempte une PR du plafond de taille. */
const OVERRIDE_LABEL = "large-pr-justified";

/**
 * Motifs (glob-ish) des fichiers qui NE doivent PAS compter dans un budget :
 * lockfiles, artefacts générés, snapshots de test, code vendored, etc.
 * Comparés au chemin du fichier relatif au dépôt.
 */
const IGNORED_PATTERNS = [
  // Lockfiles
  /(^|\/)package-lock\.json$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)bun\.lockb$/,
  // Snapshots de test
  /(^|\/)__snapshots__\//,
  /\.snap$/,
  // Déclarations de types / imports générées et sorties de build
  /(^|\/)auto-imports\.d\.ts$/,
  /(^|\/)components\.d\.ts$/,
  /(^|\/)typed-router\.d\.ts$/,
  /(^|\/)\.nuxt\//,
  /(^|\/)\.output\//,
  /(^|\/)dist\//,
  /(^|\/)coverage\//,
  /(^|\/)playwright-report\//,
  /(^|\/)test-results\//,
  // Changelog généré
  /(^|\/)CHANGELOG\.md$/,
  // Client Prisma généré / migrations mécaniques
  /(^|\/)prisma\/migrations\//,
  // Captures de référence design
  /(^|\/)docs\/design-reference\//,
];

/**
 * Motifs (glob-ish) des fichiers de TEST, comptés contre MAX_TEST_LINES au lieu
 * de MAX_PROD_LINES. Couvre les *.spec/*.test colocalisés, les dossiers
 * __tests__, les specs e2e et les dossiers `tests/`.
 */
const TEST_PATTERNS = [
  /\.(spec|test)\.[cm]?[jt]sx?$/,
  /\.e2e\.[cm]?[jt]sx?$/,
  /(^|\/)__tests__\//,
  /(^|\/)e2e\//,
  /(^|\/)tests?\//,
];

/** Vrai quand le chemin correspond à au moins un motif de la liste. */
function matchesAny(filePath, patterns) {
  return patterns.some((pattern) => pattern.test(filePath));
}

const isIgnored = (filePath) => matchesAny(filePath, IGNORED_PATTERNS);
const isTest = (filePath) => matchesAny(filePath, TEST_PATTERNS);

/**
 * Somme les lignes ajoutées + supprimées pour les fichiers donnés à partir des
 * métadonnées de diff par fichier de Danger. Retourne 0 pour les fichiers que
 * Danger ne peut pas diffuser (ex. binaires).
 */
async function countChangedLines(files) {
  let total = 0;
  for (const file of files) {
    const diff = await danger.git.diffForFile(file);
    if (!diff) continue;
    total += (diff.added || "")
      .split("\n")
      .filter((l) => l.startsWith("+")).length;
    total += (diff.removed || "")
      .split("\n")
      .filter((l) => l.startsWith("-")).length;
  }
  return total;
}

/**
 * Lit la note de justification dans le corps de la PR. On accepte tout texte
 * non vide suivant un titre « Large PR justification » (insensible à la casse).
 */
function getJustification(body) {
  if (!body) return "";
  const match = body.match(
    /#+\s*large pr justification\s*\n([\s\S]*?)(?:\n#+\s|$)/i,
  );
  if (!match) return "";
  return match[1].replace(/^\s*[-*]?\s*/, "").trim();
}

async function checkPrSize() {
  const pr = danger.github.pr;
  const allChanged = [
    ...danger.git.modified_files,
    ...danger.git.created_files,
  ];
  const considered = allChanged.filter((f) => !isIgnored(f));
  const ignored = allChanged.filter((f) => isIgnored(f));
  const testFiles = considered.filter(isTest);
  const prodFiles = considered.filter((f) => !isTest(f));

  const prodLines = await countChangedLines(prodFiles);
  const testLines = await countChangedLines(testFiles);

  const prodOver = prodLines > MAX_PROD_LINES;
  const testOver = testLines > MAX_TEST_LINES;

  const summary =
    `production **${prodLines}**/${MAX_PROD_LINES} · tests **${testLines}**/${MAX_TEST_LINES}` +
    (ignored.length
      ? ` · ${ignored.length} fichier(s) générés/lockfile/snapshot exclus`
      : "");

  if (!prodOver && !testOver) {
    message(`✅ Taille de la PR — ${summary}.`);
    return;
  }

  // Au-dessus d'au moins un budget — vérifier une dérogation justifiée.
  const labels = (danger.github.issue.labels || []).map((l) => l.name);
  const hasOverrideLabel = labels.includes(OVERRIDE_LABEL);
  const justification = getJustification(pr.body);

  if (hasOverrideLabel && justification) {
    message(
      `🟡 PR au-dessus du budget (${summary}) mais justifiée via le label ` +
        `\`${OVERRIDE_LABEL}\`.\n\n> ${justification}`,
    );
    return;
  }

  if (hasOverrideLabel && !justification) {
    fail(
      `Le label \`${OVERRIDE_LABEL}\` est posé mais aucune justification n'a été trouvée dans le corps de la PR. ` +
        "Ajoutez une note non vide sous un titre `## Large PR justification` expliquant pourquoi cette " +
        "PR ne peut pas être découpée, puis relancez la vérification.",
    );
  }

  const exceeded = [];
  if (prodOver)
    exceeded.push(`**${prodLines}** lignes de production (plafond ${MAX_PROD_LINES})`);
  if (testOver)
    exceeded.push(`**${testLines}** lignes de test (plafond ${MAX_TEST_LINES})`);

  warn(
    `🚨 Cette PR modifie ${exceeded.join(" et ")} — au-dessus du budget ` +
      "(les fichiers générés, lockfiles et snapshots sont déjà exclus). " +
      "Les grosses PR sont difficiles à relire correctement.",
  );

  markdown(
    [
      "### 📦 Cette PR est volumineuse — envisagez de la découper",
      "",
      `L'attention du relecteur est la ressource rare. Le code de production est budgété à ` +
        `**${MAX_PROD_LINES}** lignes et le code de test à **${MAX_TEST_LINES}**. Quelques pistes ` +
        "pour la décomposer :",
      "",
      "- **Séparer les refactos des changements de comportement** — livrer les déplacements/renommages mécaniques dans leur propre PR.",
      "- **Découper par couche** — les changements backend, frontend peuvent souvent être livrés indépendamment.",
      "- **Empiler les PR** — ouvrir une petite PR de base et empiler les suites dessus.",
      "- **Extraire le travail préparatoire** — sortir d'abord les nouveaux utils/composables ou l'échafaudage de test.",
      "",
      "#### Besoin de la livrer telle quelle ?",
      "",
      `Ajoutez le label \`${OVERRIDE_LABEL}\` **et** une note sous un titre \`## Large PR justification\` ` +
        "dans la description de la PR expliquant pourquoi elle ne peut pas être découpée. La vérification passera alors.",
    ].join("\n"),
  );
}

checkPrSize().catch((error) => {
  fail(
    `La vérification Danger de taille de PR a échoué : ${error && error.message ? error.message : error}`,
  );
});
