# DSA5 – Die Ausgrabung

Foundry VTT V14 / DSA5 8.1.x. Grabungsspiel für die Ausgrabung in der Drachenchronik I, aufgebaut auf den Regeln des Bandes (S. 34–36 Ressourcen, S. 47–50 Verlauf der Ausgrabung).

## Installation

In Foundry unter *Module installieren* diese Manifest-URL eintragen:

```
https://raw.githubusercontent.com/saajid-antalar/dsa5-ausgrabung/main/module.json
```

Danach das Modul in der Welt aktivieren. Die Spielleitung öffnet über das Kellensymbol in der Token-Leiste oder das Makro **⛏️ Ausgrabung** das große Grabungsfenster und legt dort einmalig die Szene **Grabungsstätte im Khôm** an (Szenenordner „Drachenchronik“).

## Ablauf am Tisch

**Freigabe für Spieler:** Nach der Installation ist die Ausgrabung für Spieler gesperrt. Sie sehen weder die Werkzeuge in der Leiste noch das Makro „⛏️ Ausgrabung“, und Felder auf der Szene lassen sich nicht anklicken. Freigeben lässt sie sich im Fenster der Spielleitung (Reiter „Grabung“, Abschnitt „Graben“) oder in den Moduleinstellungen. Ein Spieler-Client reagiert sofort, ohne neu zu laden.

Auf der Grabungsszene sind alle abgesteckten Felder **direkt anklickbar**. Ein Klick fragt kurz nach („Abschnitt E4 graben?“) und schickt die Anfrage an die Spielleitung. Auf deren Rechner wird die Grabungsleitung mit dem **Zufallsgenerator des DSA5-Gruppenbogens** (Porträt-Karussell) unter den Helden vor Ort ausgelost, der Ereigniswurf gewürfelt und das Feld aufgedeckt: Die abgesteckte Kachel verwandelt sich in das, was darunter lag. Die Spielleitung kann die Leitung für den nächsten Abschnitt auch festlegen statt auszulosen.

**Ergebnisse sieht nur die Spielleitung:** Ergebniskarten, Ereignisse und Würfe werden ihr zugeflüstert, die Spieler sehen das aufgedeckte Feld und erfahren den Rest aus der Erzählung. In den Moduleinstellungen lässt sich das öffnen („Ergebniskarten auch den Spielern zeigen“, „Ausgelosten Grabungsleiter allen zeigen“).

Als Heldengruppe nimmt das Modul standardmäßig die Mitglieder der DSA5-Hauptgruppe; im Reiter *Spielleitung* änderbar.

Wer Tokens auf dem Grabungsfeld bewegen will, pausiert die Feldwahl über den Schalter in der Token-Leiste oder im Übersichtsfenster.

Spieler sehen ein kleines **Übersichtsfenster** (öffnet sich auf der Grabungsszene von selbst): Versorgung, Tag, Warnungen, Funde und ein knappes Grabungsbuch. Die Spielleitung hat ein großes Fenster: im Reiter *Grabung* Versorgung, Leitung, Helden vor Ort, letztes Ergebnis, Funde und Grabungsbuch; im Reiter *Spielleitung* Plan zum Einrichten, Beschaffung, Ereignisse, Durchbruch und Testmodus.

## Szene und Maßstab

Die Szene „Grabungsstätte im Khôm“ (4400 × 3600 px) zeigt die Grabung am Nordrand des Djurkaram als realistische Draufsicht: Lager mit Hilberts Novadizelt, Expeditions- und Heldenzelt, Küche, Werkzeuglager, Holzwerkstatt und 18 Arbeiterzelten in Gruppen um Feuerstellen, Wasserloch mit Palmen, Pferch, Förderrad und Weg nach Birscha.

Die Szene hat ein **unsichtbares Raster von 50 px = 1 Schritt**, an dem Gruppentoken und NSC einrasten; das Messwerkzeug misst in Schritt. Ein Grabungsfeld entspricht 4 × 4 Schritt, das ganze Grabungsfeld 40 × 40 Schritt. Eine Maßstabsleiste mit Nordpfeil steht unten links auf der Karte.

Szenen aus älteren Versionen stellt das Modul beim Laden der Welt durch die Spielleitung einmalig um (Größe, Raster, Bild, Lage des Grabungsfeldes); Tokens, Zeichnungen und Notizen wandern mit.

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

**Talentprobe bei Unruhe:** Würfelt ein Abschnitt „Unruhe unter den Arbeitern“, bleibt das Ereignis offen. Auf der Chatkarte wählt die Spielleitung Talent und Modifikator und klickt den Helden an. Beim Spieler dieses Helden öffnet sich der normale DSA5-Probendialog, das Ergebnis kommt automatisch zurück: gelungen, und alle bleiben; misslungen, und die Arbeiter gehen (bei Pechmagnet doppelt so viele). Ist kein Spieler des Helden online, würfelt die Spielleitung selbst. „✓ gehalten“ und „✗ Arbeiter gehen“ entscheiden ohne Probe. Setzt der Spieler auf seiner Probenkarte einen Schicksalspunkt ein oder korrigiert die SL die Würfel, rechnet die Grabung das neue Ergebnis automatisch um. Die Knöpfe „Ereignis neu würfeln (SchiP)“ auf der Grabungskarte wiederholen dagegen den W20 des ganzen Abschnitts. Wird weitergegraben, solange die Probe offen ist, gehen die Arbeiter. Die vorgeschlagenen Talente stehen in den Moduleinstellungen.

## Aus den Heldenbögen gelesen

Die Helden graben nicht selbst, sie leiten die Arbeiter. Unglücke treffen deshalb immer Arbeiter: 200 Arbeiter entsprechen 100 %, jeder Tote senkt den Arbeiterstand dauerhaft um 0,5 %.


| Bogeneintrag | Wirkung |
|---|---|
| Vorteil **Glück** | +2 je Stufe auf den Ereigniswurf, wenn der Held leitet |
| Nachteil **Pech** | −2 je Stufe, wenn der Held leitet |
| Nachteil **Pechmagnet** | leitet der Held, fallen Unglücke doppelt so schwer aus (Tote, Ausfälle, Verluste) |
| SF **Anführer** | steht bei Unruhe als Erster (★) auf der Chatkarte für die Talentprobe |
| **Herausragender Sinn**, **Aufmerksamkeit**, **Analytiker** | als Leitung immer Spuren erkennen (sonst 50 %) |
| Schicksalspunkte (`system.status.fatePoints.value`) | Neuwurf des Ereignisses |

Gewürfelt wird online im Chat (Dice So Nice wird unterstützt); der SL-Client verrechnet und postet eine Ergebniskarte. Gegraben wird nur, solange eine Spielleitung verbunden ist.

**Testmodus:** festlegbarer W20, Schicksalspunkte nur vorgemerkt, *Zurücksetzen* stellt den Stand vom Teststart wieder her (auch Beschaffung und Ereignisse) und löscht die Testnachrichten.

Grabungen aus Version 1.0 werden beim Laden der Welt durch die Spielleitung automatisch umgestellt; der Grabungsbereich bleibt erhalten.

## Release

Version in `module.json` (auch in der `download`-URL) erhöhen, committen und ein Tag `v<Version>` anlegen. Der Workflow prüft Version und Download-URL, baut das Archiv und legt das Release an.

Alle Grafiken (Szene und Kacheln) sind für dieses Modul prozedural erzeugt; die Skripte liegen unter `tools/`.
