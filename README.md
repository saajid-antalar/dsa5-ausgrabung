# DSA5 – Die Ausgrabung

Foundry VTT V14 / DSA5 8.1.x. Grabungsspiel für die Ausgrabung in der Drachenchronik I, aufgebaut auf den Regeln des Bandes (S. 34–36 Ressourcen, S. 47–50 Verlauf der Ausgrabung).

## Installation

In Foundry unter *Module installieren* diese Manifest-URL eintragen:

```
https://raw.githubusercontent.com/saajid-antalar/dsa5-ausgrabung/main/module.json
```

Danach das Modul in der Welt aktivieren. Die Spielleitung öffnet über das Kellensymbol in der Token-Leiste oder das Makro **⛏️ Ausgrabung** das große Grabungsfenster und legt dort einmalig die Szene **Grabungsstätte im Khôm** an (Szenenordner „Drachenchronik“).

## Ablauf am Tisch

1. **Feld wählen:** In der Token-Leiste den Schalter *Grabungsfeld auf der Karte wählen* einschalten. Die Felder leuchten beim Überfahren auf, ein Klick wählt den Abschnitt; alle sehen die Auswahl auf der Karte. Ist der Schalter aus, verhalten sich Tokens wie gewohnt.
2. **Leitung auslosen:** Im Übersichtsfenster *Leitung auslosen* klicken. Unter den anwesenden Helden wird im Chat gewürfelt, wer den Abschnitt leitet; dessen Glück oder Pech zählt für den Ereigniswurf. Pro Abschnitt wird einmal gelost; die Spielleitung kann neu losen oder jemanden festlegen.
3. **Graben und würfeln:** Der Ereigniswurf läuft im Chat, danach erscheint die Ergebniskarte und das Feld auf der Szene.

Spieler sehen ein kleines **Übersichtsfenster** (öffnet sich auf der Grabungsszene von selbst): Versorgung, Tag, gewählter Abschnitt mit Leitung, letztes Ergebnis, Funde und Grabungsbuch. Wer vor Ort mitarbeitet, sieht und ändert nur die Spielleitung.

## Versorgung (S. 34–36)

Sechs Ressourcen in Prozent: Wasser, Nahrung, Arbeiter, Holz, Werkzeug, Tiere. Ziel ist jeweils 100 %. Start mit der Unterstützung von Scheich Alim (Wasser 30, Nahrung 30, Arbeiter 40, Holz 5, Werkzeug 0, Tiere 30). Im Reiter **Spielleitung** stehen alle Angebote des Bandes zum Annehmen bereit: die drei Lösungen mit den Beni Schuf (schließen sich aus), Beni Achawi, Ruyad der Schmied, Serham ben Furka (Händler, Lasttiere, Arbeitssklaven) und die große Holz-Karawane. Dazu freie „kleinere Absprachen“. Kosten in Dukaten sind vor dem Annehmen anpassbar, der Tageslohn (1,6 D, also 192 D für vier Monate) läuft mit.

## Grabung

- 10×10-Plan in einer eigenen Wüstenszene mit Förderrad und Lager. Unter jedem Feld liegen verdeckt Gelände und ein Zufallsereignis; gegrabene Felder erscheinen als Kacheln.
- **Dauer** eines Abschnitts: Grundtage des Geländes, umgerechnet auf den Arbeiterstand (bei 40 % 2,5-mal so lang). Fehlen Holz, Werkzeug oder Tiere für das Gelände: +1 Tag und −2 auf den Ereigniswurf. Wasser und Nahrung unter 75 % geben Abzüge auf jeden Wurf. Steht das Förderrad still, dauert alles länger.
- **Altes Flussbett:** verborgen im Plan. Die Spurenzahl auf gegrabenen Feldern zählt Flussbett-Felder in der Nachbarschaft. Nach einigen freigelegten Flussbett-Feldern gewinnt die Expedition die Erkenntnis aus dem Band, dass tiefer gegraben werden muss: jeder weitere Abschnitt dauert einen Tag weniger, Flussbett-Abschnitte bekommen +2.
- **Erste Funde (S. 49)** liegen auf vorbelegten Fundstellen, darunter der Wachturm von Rohuls Orden.
- **Durchbruch (S. 50):** vom Band fest auf Anfang Tsa gesetzt (Standard Tag 120). Die Spielleitung löst ihn aus, das Portal erscheint auf der Szene. Gutes Spiel verkürzt die Grabung nicht, es spart Ressourcen und Unglück.

## Ereignisse (S. 48–50)

Im Reiter Spielleitung auslösbar, mit Chatkarte (SL-Hinweise nur an die Spielleitung): Pargonus' Werkzeugdiebstahl, Spion im Kartenzelt und Ausgräber auf eigener Spur (laut Band zuerst); Rohuls Aufruhr bei den Arbeitern, Sabotage am Förderrad und Feuer im Werkzeugzelt; die optionalen Zwischenfälle. Die Wirkungen auf die Ressourcen sind Vorschläge, der Band nennt keine Zahlen. Sie lassen sich aufheben, etwa wenn das gestohlene Werkzeug gefunden wird.

## Aus den Heldenbögen gelesen

| Bogeneintrag | Wirkung |
|---|---|
| Vorteil **Glück** | +2 je Stufe auf den Ereigniswurf, wenn der Held leitet |
| Nachteil **Pech** | −2 je Stufe, wenn der Held leitet |
| Nachteil **Pechmagnet** | trifft bei Unfällen immer diesen Helden |
| SF **Anführer** | hält die Arbeiter bei Unruhe auf der Baustelle |
| **Herausragender Sinn**, **Aufmerksamkeit**, **Analytiker** | als Leitung immer Spuren erkennen (sonst 50 %) |
| Schicksalspunkte (`system.status.fatePoints.value`) | Neuwurf des Ereignisses |

Gewürfelt wird online im Chat (Dice So Nice wird unterstützt); der SL-Client verrechnet und postet eine Ergebniskarte. Gegraben wird nur, solange eine Spielleitung verbunden ist.

**Testmodus:** festlegbarer W20, Schicksalspunkte nur vorgemerkt, *Zurücksetzen* stellt den Stand vom Teststart wieder her (auch Beschaffung und Ereignisse) und löscht die Testnachrichten.

Grabungen aus Version 1.0 werden beim Laden der Welt durch die Spielleitung automatisch umgestellt; der Grabungsbereich bleibt erhalten.

## Release

Version in `module.json` (auch in der `download`-URL) erhöhen, committen und ein Tag `v<Version>` anlegen. Der Workflow prüft Version und Download-URL, baut das Archiv und legt das Release an.
