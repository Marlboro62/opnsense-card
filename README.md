<p>
  ☕ <strong>Si cette carte vous est utile, vous pouvez soutenir le projet :</strong>
</p>

<div style="white-space: nowrap; line-height: 0;">
  <a
    href="https://www.buymeacoffee.com/Marlboro62"
    target="_blank"
    rel="noopener noreferrer"
    style="display: inline-block; text-decoration: none; vertical-align: middle;"
  ><img
    src="https://img.buymeacoffee.com/button-api/?text=Offrir%20un%20caf%C3%A9&emoji=%E2%98%95&slug=Marlboro62&button_colour=FF5F5F&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00"
    alt="Offrir un café sur Buy Me a Coffee"
    height="45"
    style="display: block; border: 0;"
  ></a>&nbsp;&nbsp;<a
    href="https://ko-fi.com/M4M2QL45X"
    target="_blank"
    rel="noopener noreferrer"
    style="display: inline-block; text-decoration: none; vertical-align: middle;"
  ><img
    src="https://storage.ko-fi.com/cdn/kofi6.png?v=6"
    alt="Soutenir le projet sur Ko-fi"
    height="45"
    style="display: block; border: 0;"
  ></a>
</div>

# Carte OPNsense

Carte Lovelace pour suivre un pare-feu **OPNsense** dans Home Assistant : passerelles, débits des interfaces, ressources, mise à jour, redémarrage. Elle a le style des cartes MyElectricalData new ([Carte Enedis Linky New](https://github.com/Marlboro62/content-card-linky-new)) et des [Cartes Serveur HA](https://github.com/Marlboro62/serveur-ha-card) : thème bleu nuit, version claire, ou thème Home Assistant.

**Aucune dépendance** : pas de button-card ni de card-mod. Les capteurs sont **détectés automatiquement**, et chaque élément sans capteur est simplement masqué.

| Normal | Chargé, mise à jour | WAN hors ligne |
| --- | --- | --- |
| ![OPNsense](https://raw.githubusercontent.com/Marlboro62/opnsense-card/main/images/opnsense.png) | ![OPNsense chargé](https://raw.githubusercontent.com/Marlboro62/opnsense-card/main/images/opnsense-charge.png) | ![WAN hors ligne](https://raw.githubusercontent.com/Marlboro62/opnsense-card/main/images/opnsense-wan.png) |

| Clair, sur PC | Sans intégration (package REST) |
| --- | --- |
| ![OPNsense clair](https://raw.githubusercontent.com/Marlboro62/opnsense-card/main/images/opnsense-clair.png) | ![Package REST](https://raw.githubusercontent.com/Marlboro62/opnsense-card/main/images/opnsense-rest.png) |

*Aperçus réalisés avec la démo et des valeurs fictives (noms, adresses IP et débits inventés).*

**[▶ Essayer la démo en ligne](https://marlboro62.github.io/opnsense-card/docs/demo.html)** : pare-feu normal, chargé avec une mise à jour, ou WAN hors ligne, avec l'intégration ou le package REST, en sombre ou clair, sur téléphone ou PC.

## Ce qu'elle affiche

- **En-tête** : nom et version, état d'Internet, voyants **Passerelles** (rouge si une passerelle est hors ligne), **Mise à jour** et **Alertes** (notifications en attente dans OPNsense). La carte prend une bordure rouge quand une passerelle tombe.
- **Informations** : uptime, version installée ou disponible, baux DHCP, charge du processeur.
- **Ressources** : CPU, RAM (utilisée / totale), disque, table d'états pf, tampons réseau (mbuf), swap, et les températures remontées par OPNsense.
- **Passerelles** : état en français (en ligne, latence, pertes, hors ligne), latence, pertes et gigue, le WAN en premier.
- **Interfaces** : débit reçu et envoyé de chaque interface, en kbit/s, Mbit/s ou Gbit/s, et interface déconnectée en rouge.
- **Actions** : **Redémarrer** et **Arrêter** le pare-feu, avec **un second clic dans les 5 secondes** pour confirmer.

Un clic sur un élément ouvre la fiche de l'entité dans Home Assistant.

## Deux façons d'obtenir les données

| | Intégration OPNsense (HACS) | Package REST, sans intégration |
| --- | --- | --- |
| Installation | depuis l'interface de Home Assistant, sans YAML | un fichier YAML et deux lignes dans `secrets.yaml` |
| Passerelles et interfaces | toutes, détectées | toutes, détectées |
| Températures | toutes les sondes | la première sonde |
| Baux DHCP, alertes | oui | non |
| Redémarrer, arrêter | oui (selon les privilèges) | en option (`rest_command`) |

**Conseil** : l'intégration est la plus simple et la plus complète. Le package sert si vous ne voulez pas, ou ne pouvez pas, installer d'intégration HACS. N'utilisez pas les deux en même temps (les capteurs seraient en double).

> La carte n'appelle pas l'API d'OPNsense elle-même : le navigateur bloquerait ces appels (CORS, certificat auto-signé), et la clé d'API serait lisible par tous ceux qui ouvrent le tableau de bord. C'est toujours Home Assistant qui interroge OPNsense.

## Installation de la carte

### Avec HACS (recommandé)

1. Dans HACS, menu **⋮** → **Dépôts personnalisés**.
2. Ajoutez `https://github.com/Marlboro62/opnsense-card` avec le type **Tableau de bord** (Dashboard).
3. Cherchez **Carte OPNsense**, installez, puis rechargez la page (Ctrl+F5).

### Manuellement

1. Téléchargez [`opnsense-card.js`](https://raw.githubusercontent.com/Marlboro62/opnsense-card/main/opnsense-card.js) (clic droit → Enregistrer sous) et copiez-le dans `/config/www/`.
2. **Paramètres → Tableaux de bord → ⋮ → Ressources → Ajouter une ressource** : URL `/local/opnsense-card.js`, type **Module JavaScript**.
3. Rechargez la page (Ctrl+F5).

Puis ajoutez la carte :

```yaml
type: custom:opnsense-card
```

La carte a un **éditeur visuel**.

## Avec l'intégration OPNsense (HACS)

1. Dans OPNsense, **Système → Accès → Utilisateurs** : créez un utilisateur pour Home Assistant et sa **clé d'API** (icône de clé). Les privilèges nécessaires sont décrits dans la [documentation de l'intégration](https://github.com/travisghansen/hass-opnsense#readme).
2. Dans HACS, installez **OPNsense** ([travisghansen/hass-opnsense](https://github.com/travisghansen/hass-opnsense)), puis redémarrez Home Assistant.
3. **Paramètres → Appareils et services → Ajouter une intégration → OPNsense** : adresse du pare-feu, clé et secret.

La carte trouve seule le pare-feu ; avec plusieurs pare-feu, choisissez-le dans l'éditeur (`device`). Les débits des interfaces et l'état des passerelles sont activés par défaut dans l'intégration ; les compteurs (octets, paquets, erreurs) et les autres disques sont désactivés par défaut, la carte n'en a pas besoin.

## Sans intégration : le package REST

Le fichier [`packages/opnsense.yaml`](packages/opnsense.yaml) crée les capteurs avec l'intégration REST de base de Home Assistant. **Seule l'adresse du pare-feu est à indiquer** : toutes les passerelles et toutes les interfaces sont lues automatiquement, et la carte calcule elle-même les débits.

1. **Dans OPNsense**, **Système → Accès → Utilisateurs** : créez un utilisateur dédié (par exemple `homeassistant`), avec ces privilèges (champ de recherche pour les trouver, les noms peuvent être traduits) :

   | Privilège | Pour |
   | --- | --- |
   | `Lobby: Dashboard` | mémoire, disque, table d'états, tampons, swap, température, uptime, charge |
   | `Diagnostics: System Activity` | CPU |
   | `Reporting: Traffic` | débits des interfaces |
   | `System: Gateways` | état, latence et pertes des passerelles |
   | `System: Firmware` (facultatif) | version et mise à jour |

   `System: Gateways` et `System: Firmware` permettent aussi de **modifier** les passerelles et de lancer une mise à jour : sans `System: Firmware`, retirez le bloc « Version d'OPNsense » du package. Créez ensuite la **clé d'API** de cet utilisateur (icône de clé) : OPNsense télécharge un fichier avec la clé et le secret.
2. **Dans `/config/secrets.yaml`** :

   ```yaml
   opnsense_api_key: "la clé"
   opnsense_api_secret: "le secret"
   ```

3. Copiez [`opnsense.yaml`](packages/opnsense.yaml) dans `/config/packages/`, et activez les packages dans `configuration.yaml` si ce n'est pas déjà fait :

   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```

4. Dans le fichier, remplacez partout `https://192.168.1.1` par l'adresse de votre OPNsense (« Remplacer tout »).
5. **Outils de développement → YAML → Vérifier la configuration**, puis redémarrez Home Assistant.

La carte trouve ces capteurs toute seule. Les débits s'affichent au deuxième relevé (15 secondes), ou tout de suite si l'historique du capteur `sensor.opnsense_traffic` existe déjà.

Latence, pertes et gigue d'une passerelle ne s'affichent que si sa **surveillance** est active dans OPNsense (**Système → Passerelles → Configuration**, décocher « Désactiver la surveillance de la passerelle » et indiquer une **IP de surveillance**, par exemple `1.1.1.1`) ; sinon la carte indique « sans surveillance ».

**Redémarrer et Arrêter** : les boutons n'apparaissent que si vous décommentez le bloc `rest_command` en bas du package et donnez à l'utilisateur les privilèges `Diagnostics: Reboot System` et `Diagnostics: Halt system`. Sans cela, l'utilisateur d'API ne peut pas couper le pare-feu.

Les adresses de l'API du package sont celles d'OPNsense 25.7 et plus récent ; pour une version plus ancienne, le haut du fichier indique les noms à changer.

## Options

| Option | Rôle | Défaut |
| --- | --- | --- |
| `title`, `icon`, `icon_color` | En-tête | nom du pare-feu, `mdi:wall-fire` |
| `device` | Pare-feu affiché (intégration) | le premier trouvé |
| `prefix` | Package REST : début du nom des capteurs, si vous les avez renommés | `opnsense` |
| `interfaces` | Interfaces affichées (nom, par exemple `WAN`, `LAN`) | toutes |
| `show_info`, `show_resources`, `show_gateways`, `show_interfaces`, `show_actions` | Afficher chaque partie | `true` |
| `theme` | `v2` (bleu nuit MyElectricalData), `auto` (clair ou sombre selon Home Assistant) ou `ha` (thème Home Assistant) | `v2` |

Exemple :

```yaml
type: custom:opnsense-card
title: Pare-feu
interfaces:
  - WAN
  - LAN
show_actions: false
```

## Support

Questions et problèmes : uniquement via les [issues GitHub](https://github.com/Marlboro62/opnsense-card/issues).

## Voir aussi

[Cartes Serveur HA](https://github.com/Marlboro62/serveur-ha-card) · [Carte Onduleur UPS](https://github.com/Marlboro62/onduleur-ups-card) · [Carte Enedis Linky New](https://github.com/Marlboro62/content-card-linky-new)

## Licence

MIT

## Nom du projet et forks

Ce dépôt est la seule source officielle de **Carte OPNsense** (releases, HACS, support),
maintenu par [Marlboro62](https://github.com/Marlboro62).

La licence MIT autorise à copier, modifier et redistribuer le code. Si vous publiez une version modifiée :

- gardez les mentions de copyright du fichier [`LICENSE`](https://github.com/Marlboro62/opnsense-card/blob/main/LICENSE) (© Marlboro62) ;
- **donnez-lui un autre nom** et d'autres types de carte (`custom:opnsense-card` sont ceux de ce dépôt) :
  Home Assistant ne peut pas charger deux cartes du même type, et personne ne doit confondre les deux versions dans HACS ;
- ne la présentez pas comme la version officielle et n'orientez pas vers ce dépôt les demandes
  de support qui concernent votre version.

Une correction ou une idée ? Les **pull requests** et les **issues** sont les bienvenues ici :
elles profitent à tous les utilisateurs.
