# Budget Coding Delegation – Skill für ChatGPT / Coding-Agenten

Der Skill weist einen Agenten an, bei geeigneten Implementierungen **OpenCode** mit **DeepSeek V4.1 Flash (Free bevorzugt)** zu verwenden und die Planung und Prüfung beim Hauptmodell zu belassen.

## Dateien

- `.agents/skills/budget-coding-delegation/SKILL.md` – portabler Agent-Skill
- `CHATGPT-INSTRUCTIONS.md` – kurzer Text für ChatGPT-Projektanweisungen oder Custom Instructions
- `opencode.example.json` – optionale Beispielkonfiguration für einen OpenCode-Implementierungsagenten (nicht blind über eine vorhandene Konfiguration kopieren)

## Installation

1. Kopiere `.agents/skills/budget-coding-delegation/` in den gleichnamigen Pfad im Root deines Git-Projekts. Alternativ lege ihn unter `~/.agents/skills/budget-coding-delegation/` ab, falls dein Coding-Agent diesen globalen Pfad einliest. OpenCode unterstützt diese Pfade.
2. Starte OpenCode und richte den Provider über `/connect` ein. Prüfe die tatsächlich verfügbaren Modelle mit `opencode models` oder `/models`.
3. Bevorzugte IDs: `opencode/deepseek-v4.1-flash-free`, sonst `opencode/deepseek-v4.1-flash`, sofern verfügbar. Das kostenlose Angebot ist konten- und providerabhängig.
4. Um das Verhalten für **ChatGPT** anzuregen, übernimm den Text aus `CHATGPT-INSTRUCTIONS.md` in die Projektanweisungen oder gib die `SKILL.md` bei deiner Coding-Aufgabe als Kontext mit. Das bloße Ablegen einer Datei gewährt einer normalen ChatGPT-Unterhaltung **keinen** Terminalzugriff und lädt nicht zwingend automatisch einen Skill.
5. Stelle sicher, dass die Umgebung, in der ChatGPT arbeitet, die OpenCode-CLI tatsächlich ausführen darf. Ohne diesen Zugriff kann der Skill nur eine Kopiervorlage ausgeben, aber nicht selbst delegieren.

## Schnelltest im Repository

```sh
opencode models
opencode run --model opencode/deepseek-v4.1-flash-free \
  "Erkläre in maximal 5 Sätzen die Projektstruktur. Ändere keine Dateien."
```

Nur ausführen, wenn der Modellname in der realen OpenCode-Liste auftaucht. Für den ersten Durchlauf eine unkritische, freigegebene Codebasis verwenden.

## Wichtiger Hinweis

Dieser Skill ist kein automatisches ChatGPT→OpenCode-Plugin. Er beschreibt den Ablauf für Coding-Agenten **mit vorhandener Tool-Ausführung**. Ob Tokens/Kosten sinken, hängt von der Aufgabenlänge, Modellverfügbarkeit, Prüfaufwand und dem Preismodell ab. Vertraulichen Code nicht ohne Freigabe an externe Modelle übertragen.

## Dokumentation (geprüft am 10.11.2026)

- OpenCode Skills: https://opencode.ai/docs/skills
- OpenCode Modelle: https://opencode.ai/docs/models
- OpenCode Console-Modellkatalog: https://opencode.ai/docs/console/models
- OpenCode CLI: https://opencode.ai/docs/cli/commands
