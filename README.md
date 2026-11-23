# DSA5 – Die Ausgrabung

Foundry VTT V14 / DSA5 8.1.x. Grabungsspiel für den Abschnitt der Drachenchronik I, in dem die Helden selbst graben.

## Installation

In Foundry unter *Module installieren* diese Manifest-URL eintragen:

```
https://raw.githubusercontent.com/saajid-antalar/dsa5-ausgrabung/main/module.json
```

Danach das Modul in der Welt aktivieren. Über das Kellensymbol in der Token-Leiste oder das Makro **⛏️ Ausgrabung** öffnet sich das Grabungsfenster. Die Spielleitung legt dort einmalig die Szene **Grabungsstätte im Khôm** an (Szenenordner „Drachenchronik“).

## Spiel

- 10×10-Grabungsplan in einer eigenen Wüstenszene. Unter jedem Feld liegen verdeckt Gelände, Kosten (Tage, Arbeiter, Lohn, Stützbalken) und ein Zufallsereignis. Gegrabene Felder erscheinen als Kacheln auf der Szene, mit Spurenzahl und Ereignismarke.
- Der Ereigniswurf wird online im Chat gewürfelt (Dice So Nice wird unterstützt). Der SL-Client verrechnet Kosten und Ereignis und postet eine Ergebniskarte. Gegraben wird nur, solange eine Spielleitung verbunden ist.
- Bei schlechtem Ergebnis kann jeder anwesende Held einen **Schicksalspunkt** für einen Neuwurf einsetzen (Knopf in der Chatkarte, nur für den Besitzer).

### Aus den Heldenbögen gelesen

| Bogeneintrag | Wirkung |
|---|---|
| Vorteil **Glück** | +2 je Stufe auf den Ereigniswurf, wenn der Held leitet |
| Nachteil **Pech** | −2 je Stufe, wenn der Held leitet |
| Nachteil **Pechmagnet** | trifft bei Einsturz und Skorpionen immer diesen Helden |
| SF **Anführer** | kein Mehrlohn bei „Murren der Arbeiter“ |
| **Herausragender Sinn**, **Aufmerksamkeit**, **Analytiker** | als Leitung immer Spuren erkennen (sonst 50 %) |
| Schicksalspunkte (`system.status.fatePoints.value`) | Neuwurf des Ereignisses |

Namen und Bonushöhe sind in den Moduleinstellungen änderbar.

### Spielleitung

Im Reiter **Spielleitung**: Kasse, Lohn, Balkenpreis, Arbeiter, Geländetabelle, Schlüsselfunde (Texte aus dem Abenteuer eintragen), Heldengruppe und ein Pinsel für Grabungsbereich, gesperrte Felder, Schlüsselfunde und Gelände.

**Testmodus:** festlegbarer W20, Schicksalspunkte werden nur vorgemerkt (Bögen bleiben unverändert), *Zurücksetzen* stellt den Stand vom Teststart wieder her und löscht die Testnachrichten.

Kosten und Ereignisse sind Vorschläge, nicht die Werte des Abenteuerbandes. Alle Grafiken sind für dieses Modul prozedural erzeugt.

## Release

Version in `module.json` (auch in der `download`-URL) erhöhen, committen und ein Tag `v<Version>` pushen. Der Workflow prüft Version und Download-URL, baut das Archiv und legt das Release automatisch an. Ein von Hand in GitHub veröffentlichtes Release funktioniert ebenfalls; dann hängt der Workflow das Archiv dort an.
