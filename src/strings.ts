const de = {
  nav: {
    konsole: 'Konsole',
    bruch: 'Bruchstellen',
    grounding: 'Grounding',
    flotte: 'Flotte',
    fit: 'Fit',
    cta: 'Kontakt',
  },
  hero: {
    eyebrow: 'BEWERBUNG · AI OPERATIONS · BERLIN',
    eyebrowShort: 'AI OPERATIONS · BERLIN',
    titlePre: 'Eine Bewerbung, ',
    titleEm: 'die man anfassen kann.',
    sub: 'Ein kleiner Claims-Loop, der nicht beim Ergebnis aufhört: Entscheidung, QA, Human Review, Regression und Re-run. Anfassen erlaubt — kaputt machen ausdrücklich auch.',
    cta: 'Fehler-Loop testen',
    secondary: 'Erst die Fälle ansehen ↓',
    repo: 'Code: github.com/mikelninh/inca-demo',
  },
  interstitial: { pre: 'Nicht erzählt. ', em: 'Gebaut.' },
  console: {
    header: 'LOCAL OPS SIMULATION · DETERMINISTISCH',
    tabs: { faelle: 'Fälle', auswertung: 'Auswertung', benchmark: 'Harness' },
    caption: 'Der Code, nicht das Modell, trifft die Entscheidung.',
    breakBadge: '⚠ bricht bewusst',
    receiptHint: 'Receipt — jede Entscheidung nachvollziehbar',
    traceToggle: 'Agent-Trace aufklappen',
    evalDisclaimer: 'Handgeschriebene Fixtures — gezeigt wird die Methode, nicht Modellgüte.',
    evalWink: 'Acht synthetische Fälle sind kein Production-Beweis. Aber jeder Fehler ist sichtbar, reproduzierbar und testbar.',
    eval: {
      accuracy: 'Entscheidungs-Genauigkeit',
      fraudRecall: 'Fraud-Recall',
      fraudPrecision: 'Fraud-Precision',
      autoShare: 'Dunkel-Quote',
    },
    benchmark: {
      showPrompt: 'Prompt lesen',
      disclaimer:
        'Selbsttest auf synthetischen Fixtures — die Differenz v1→v2 ist projiziert, nicht gemessen. Echte Zahlen: --live mit Key.',
    },
  },
  bruch: {
    eyebrow: 'BRUCHSTELLEN',
    titlePre: 'Wo mein Loop ',
    titleEm: 'bricht.',
    intro:
      'Das Interessanteste beim Bauen war nicht, was funktioniert — sondern was bricht. Drei Stellen, alle direkt nachklickbar.',
    openCase: 'Fall in der Konsole öffnen ↑',
    openGrounding: 'Zum Grounding ↓',
    cards: [
      {
        title: 'Das übersehene Betrugssignal',
        body: 'Der teuerste Fehler ist nicht der False Positive — er kostet nur Zeit. Es ist der False Negative, der automatisch durchläuft. KFZ-2026-003 ist genau so gebaut, und der Harness fängt ihn.',
        caseId: 'KFZ-2026-003',
      },
      {
        title: 'Fehlende Angaben ≠ Ablehnung',
        body: 'Frische Police, kein Polizeibericht: Der Code blockt die Auszahlung und übergibt an einen Menschen — statt falsch zu automatisieren.',
        caseId: 'HR-2026-004',
      },
      {
        title: 'Klauseln nur aus dem Vertrag',
        body: 'Deckung wird gegen den mitgelieferten Vertragsauszug geprüft, nie aus Modellwissen — sonst entstehen Klauseln, die es nicht gibt.',
        caseId: null,
      },
    ],
  },
  grounding: {
    eyebrow: 'POLICY GROUNDING',
    titlePre: 'Keine Klausel ',
    titleEm: 'aus dem Modellgedächtnis.',
    intro:
      'Nicht „was denkt das Modell?", sondern „welche Klausel trägt die Entscheidung?". Mein GitLaw-MCP verifiziert Rechtszitate gegen 5.942 echte Gesetze — dieselbe Mechanik, die eure Deckungsprüfung zitierfest machen würde.',
    toolTitle: 'Die Tool-Schicht — echte Aufrufe, key-frei reproduzierbar',
    agentTitle: 'Der Agent-Lauf',
    agentNotRun:
      'Hier steht bewusst kein erfundener Chat: Der Agent-Lauf erscheint erst, wenn er wirklich gelaufen ist.',
    verified: 'verifiziert',
    notVerified: 'nicht verifiziert',
  },
  fleet: {
    eyebrow: 'FLOTTE',
    titlePre: 'Was sonst noch ',
    titleEm: 'fährt.',
    intro: 'Echte Tests, echte Beispiel-Outputs — Status und Zahlen aus Code-Sichtung.',
    deNote: '',
    tests: 'Tests',
    tools: 'Tools',
    moreGroups: 'Mehr zeigen: teilweise fahrbar & Fundament',
    lessGroups: 'Einklappen',
  },
  fit: {
    eyebrow: 'FIT',
    titlePre: 'Warum INCA, ',
    titleEm: 'warum ich.',
    points: [
      {
        title: 'Berlin, sofort',
        body: 'Vor Ort, deutschsprachig, DSGVO im Reflex — Legal-Tech für deutsche Nutzer baue ich seit Jahren.',
      },
      {
        title: 'Loop-Denke',
        body: 'Receipt, Eval, Benchmark — nicht weil es im Stellenprofil steht, sondern weil ich es für meine eigenen Projekte so baue.',
      },
      {
        title: 'Founder-Tempo',
        body: 'Scope klein schneiden, etwas Fahrbares shippen, ehrlich messen und so lange nachziehen, bis der Loop geschlossen ist.',
      },
    ],
    egg: {
      why: 'Gespräch empfohlen',
      fraudSignal: 'mag Eval-Harnesses — verdächtig glaubwürdig',
      blocked: 'überverkaufen',
      uncertainty: 'startet gelegentlich zu viele Projekte parallel',
    },
  },
  cta: {
    title: 'Mit Mikel ',
    titleEm: 'sprechen.',
    sub: 'Mir ist weniger wichtig, ob das beeindruckt, als ob es auf eurem Operator-Niveau standhält. Wo bricht so etwas bei euch in der Realität?',
    learnTitle: 'Was ich von euch lernen will',
    learnIntro:
      'Die Methode steht. Die Skalierungs-Narben holt man sich nur im Maschinenraum. Drei erste Fragen:',
    learn: [
      'Wie triagiert ihr Edge-Cases bei echtem Volumen — wer entscheidet, welcher von 250+ Agenten ein Update bekommt?',
      'Wie haltet ihr so viele Prompts im Team konsistent — Ownership, Review, Regressionsschutz?',
      'Was hat euch der Weg von der Demo zu 180.000 Schäden über Evals gelehrt, das in keinem Paper steht?',
    ],
    mail: 'Mail an Mikel',
    linkedin: 'LinkedIn',
    homage: 'Inoffizielle Bewerbungsseite — Design als Hommage an inca / ochi.design.',
  },
}

const en: typeof de = {
  nav: {
    konsole: 'Console',
    bruch: 'Breaks',
    grounding: 'Grounding',
    flotte: 'Fleet',
    fit: 'Fit',
    cta: 'Contact',
  },
  hero: {
    eyebrow: 'APPLICATION · AI OPERATIONS · BERLIN',
    eyebrowShort: 'AI OPERATIONS · BERLIN',
    titlePre: 'A job application ',
    titleEm: 'you can poke at.',
    sub: 'A small claims loop that does not stop at the answer: decision, QA, human review, regression and rerun. Touching allowed — breaking is encouraged.',
    cta: 'Test the failure loop',
    secondary: 'inspect the cases first ↓',
    repo: 'Code: github.com/mikelninh/inca-demo',
  },
  interstitial: { pre: 'Not told. ', em: 'Built.' },
  console: {
    header: 'LOCAL OPS SIMULATION · DETERMINISTIC',
    tabs: { faelle: 'Cases', auswertung: 'Evaluation', benchmark: 'Harness' },
    caption: 'The code, not the model, makes the decision.',
    breakBadge: '⚠ breaks on purpose',
    receiptHint: 'Receipt — every decision traceable',
    traceToggle: 'expand agent trace',
    evalDisclaimer: 'Hand-written fixtures — this shows the method, not model quality.',
    evalWink: "Eight synthetic cases are not production proof. But every failure is visible, reproducible and testable.",
    eval: {
      accuracy: 'decision accuracy',
      fraudRecall: 'fraud recall',
      fraudPrecision: 'fraud precision',
      autoShare: 'auto-resolved share',
    },
    benchmark: {
      showPrompt: 'read the prompt',
      disclaimer:
        'Self-test on synthetic fixtures — the v1→v2 delta is projected, not measured. Real numbers: --live with a key.',
    },
  },
  bruch: {
    eyebrow: 'BREAKING POINTS',
    titlePre: 'Where my loop ',
    titleEm: 'breaks.',
    intro:
      'The most interesting part of building was not what works — it is what breaks. Three spots, each one click away.',
    openCase: 'open the case in the console ↑',
    openGrounding: 'jump to grounding ↓',
    cards: [
      {
        title: 'The overlooked fraud signal',
        body: 'The most expensive error is not the false positive — that only costs time. It is the false negative that sails through automatically. KFZ-2026-003 is built exactly that way, and the harness catches it.',
        caseId: 'KFZ-2026-003',
      },
      {
        title: 'Missing information ≠ rejection',
        body: 'Fresh policy, no police report: the code blocks the payout and hands over to a human — instead of automating a wrong decision.',
        caseId: 'HR-2026-004',
      },
      {
        title: 'Clauses only from the contract',
        body: 'Coverage is checked against the contract excerpt that was provided, never from model memory — otherwise clauses appear that do not exist.',
        caseId: null,
      },
    ],
  },
  grounding: {
    eyebrow: 'POLICY GROUNDING',
    titlePre: 'No clause ',
    titleEm: 'from model memory.',
    intro:
      'Not "what does the model think?" but "which clause supports the decision?". My GitLaw MCP verifies legal citations against 5,942 real statutes — the same mechanics that would make your coverage checks citation-proof.',
    toolTitle: 'The tool layer — real calls, reproducible without a key',
    agentTitle: 'The agent run',
    agentNotRun:
      'Deliberately no invented chat here: the agent run only appears once it has actually run.',
    verified: 'verified',
    notVerified: 'not verified',
  },
  fleet: {
    eyebrow: 'FLEET',
    titlePre: 'What else is ',
    titleEm: 'running.',
    intro: 'Real tests, real sample outputs — status and numbers from actual code review.',
    deNote: 'Tool descriptions are in German — the sources are German-language projects.',
    tests: 'tests',
    tools: 'tools',
    moreGroups: 'Show more: partly running & foundations',
    lessGroups: 'Collapse',
  },
  fit: {
    eyebrow: 'FIT',
    titlePre: 'Why INCA, ',
    titleEm: 'why me.',
    points: [
      {
        title: 'Berlin, now',
        body: 'On site, German-speaking, GDPR as a reflex — I have been building legal tech for German users for years.',
      },
      {
        title: 'Loop thinking',
        body: 'Receipt, eval, benchmark — not because the job ad says so, but because that is how I build my own projects.',
      },
      {
        title: 'Founder pace',
        body: 'Cut scope until something ships, measure it honestly, then iterate until the loop is closed.',
      },
    ],
    egg: {
      why: 'conversation recommended',
      fraudSignal: 'claims to enjoy eval harnesses — suspiciously credible',
      blocked: 'overselling',
      uncertainty: 'occasionally starts too many projects in parallel',
    },
  },
  cta: {
    title: 'Talk to ',
    titleEm: 'Mikel.',
    sub: 'I care less about whether this impresses you than whether it holds up at your operator level. Where does something like this break in your reality?',
    learnTitle: 'What I want to learn from you',
    learnIntro:
      'The method is in place. Scaling scars you only earn in the engine room. Three first questions:',
    learn: [
      'How do you triage edge cases at real volume — who decides which of 250+ agents gets an update?',
      'How do you keep that many prompts consistent across a team — ownership, review, regression protection?',
      'What did the road from demo to 180,000 claims teach you about evals that is in no paper?',
    ],
    mail: 'Email Mikel',
    linkedin: 'LinkedIn',
    homage: 'Unofficial application page — the design is an homage to inca / ochi.design.',
  },
}

export const strings = { de, en }
export type Lang = keyof typeof strings
