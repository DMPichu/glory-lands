# Créditos

## Código y motor
- [three.js](https://threejs.org/) 0.160 (licencia MIT), cargado desde jsDelivr.

## Modelos 3D
- **KayKit: Adventurers Character Pack** y **KayKit: Skeletons Character Pack**, de [Kay Lousberg](https://www.kaylousberg.com) (CC0). Son los modelos animados de los súbditos, en `models/kaykit/` (también están preparados para los héroes, desactivados: `HERO_MODELS` en `js/config.js`). Se recortaron las animaciones que no se usan y se comprimieron con meshopt; en el juego se recolorean y se estilizan las proporciones (ver `HERO_MODELS` en `js/config.js` y `SLIM` en `js/models.js`).
- Los 10 héroes son modelos originales de estilo anime hechos con formas básicas en `js/heroes.js`, con la cara pintada en el propio juego. Los tokens de la campaña solo sirvieron de guía de colores y rasgos.
- El resto de modelos (estructuras, Altar, monstruos de la jungla), el mapa y los efectos están hechos con formas básicas en `js/models.js` y `js/jungle.js` (originales).

## Iconos de habilidades
Iconos de [game-icons.net](https://game-icons.net), con licencia [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). En blanco y sin modificar, en `img/habilidades/` (sacados del paquete de la carpeta `Astralith/Web/_recursos/iconos game-icons`).

- **Lorc**: angel-outfit (fuy_e), angel-wings (bel_r), beech (bel_p), book-aura (yes_p), breastplate (val_w), bright-explosion (emm_r), bubble-field (umi_w), bull-horns (gri_q), candle-light (can_p), candle-skull (cri_r), chained-arrow-heads (kou_p), charged-arrow (kou_q), cloak-dagger (esp_w), crescent-blade (ika_q), crescent-blade (zes_q), crossed-pistols (ast_q), crossed-slashes (pol_q), crossed-swords (her_w), cubeforce (gri_r), cubeforce (vri_e), curvy-knife (esp_q), decapitation (cat_r), diamond-hard (luc_w), double-dragon (ika_r), dripping-blade (cri_p), earth-crack (val_r), eclipse (esp_r), electrical-crescent (can_w), falling-leaf (kou_e), fire-dash (kon_e), fire-ray (umi_q), fist (fuy_r), flame-spin (zef_w), flat-hammer (val_q), fluffy-flame (fot_p), frozen-arrow (luc_q), ground-sprout (xel_q), half-heart (esp_p), harpoon-chain (cri_e), heart-tower (cab_r), holy-symbol (leg_e), icicles-aura (ika_w), lightning-arc (vri_q), lightning-bow (kou_r), lightning-frequency (can_r), lightning-helix (her_p), lightning-storm (vri_w), lightning-tree (vri_r), lotus (umi_r), magic-shield (leg_w), magic-shield (zes_e), meditation (umi_p), moon (zes_p), moon-claws (zes_r), piercing-sword (cat_p), prayer (gri_w), punch (cab_q), punch-blast (fot_q), sands-of-time (fot_r), scales (her_r), screaming (xel_r), shadow-follower (esp_e), sinusoidal-beam (bel_q), snowflake-2 (luc_r), spark-spirit (kou_w), spiked-halo (jos_p), spinning-blades (pol_r), sprint (sli_e), sun (zef_p), sun-radiations (leg_p), sun-radiations (zef_r), sunbeams (leg_q), supersonic-bullet (ast_r), sword-clash (cat_e), teleport (emm_e), thrown-daggers (kon_q), tornado (sli_q), turtle-shell (sli_w), whirlwind (ika_e), whirlwind (sli_p), wind-slap (umi_e), winged-sword (jos_q)
- **Delapouite**: armor-upgrade (cri_w), backward-time (fot_w), black-knight-helm (gri_p), card-joker (kon_p), cavalry (her_q), charging (sli_r), charging-bull (ast_e), charging-bull (xel_e), chest-armor (cab_e), drum (pol_p), enrage (pol_w), eye-target (ast_p), fencer (cat_q), flower-emblem (ika_p), hand-of-god (jos_w), healing (bel_w), healing-shield (bel_e), high-heel (luc_e), ice-spell-cast (cat_w), ice-spell-cast (luc_p), invisible (fuy_w), jump-across (pol_e), knight-banner (jos_r), light-sabers (fuy_q), magick-trick (kon_r), moon-orbit (zes_w), mountain-road (val_p), peace-dove (leg_r), prism (emm_w), shield-bash (jos_e), shoulder-armor (val_e), sparkles (yes_e), sparkles (zef_q), spell-book (yes_w), stone-wall (xel_w), sun-priest (fuy_p), sunrise (zef_e), templar-shield (her_e), theater (fot_e), viking-helmet (ast_w)
- **Sbed**: battery-pack (vri_p), death-skull (cri_q), electric (can_e), health-increase (cab_w)
- **Skoll**: blood (xel_p), mounted-knight (gri_e), sound-waves (emm_p)
- **Willdabeast**: chain-lightning (can_q), orb-wand (emm_q)
- **John Colburn**: pistol-gun (yes_q)
- **Faithtoken**: dragon-head (yes_r)
- **Zeromancer**: heart-plus (cab_p)
- **DarkZaitzev**: hooded-figure (kon_w)

## Iconos de objetos
También de [game-icons.net](https://game-icons.net) (CC BY 3.0), en `img/objetos/`.

- **Lorc**: broadsword (sword), crystal-growth (crystal), feather (feather), gears (trigger), leather-boot (boots), moon (moon), spiked-armor (thorns), spyglass (scope), winged-shield (aegis), wizard-staff (staff)
- **Delapouite**: book-cover (tome), cape (cloak), fire-gem (ember), health-potion (potion), katana (katana)
- **Sbed**: shield (shield), water-drop (tear)
- **Skoll**: fangs (fang)
- **Zeromancer**: heart-plus (heart)

## Sonido
Música y efectos de la carpeta `Glory Lands/Sonidos` de la campaña, recortados y convertidos a `.ogg` (efectos de 3 s como máximo, música de 3 min). **Origen y licencia por confirmar**: son los sonidos que se usaban en la mesa y algunos pueden venir de juegos o bancos de sonido comerciales (los de Ikaruus llevan nombres de técnicas de otro juego).

- `menu` ← Glory Lands - Peaceful Travel.mp3
- `batalla` ← Ambience.mp3
- `lorik` ← Lamentos.mp3
- `golpe_espada` ← Jos/JosAttSw.mp3
- `disparo_flecha` ← Kouji/KoujiNormalBow.mp3
- `disparo_magia` ← Jos/JosMagMiss.mp3
- `disparo_arma_fuego` ← Astrid/AstridPistola1.mp3
- `critico` ← Fuyumi/FuyumiCritical.wav
- `pocion` ← Eris/ErisPoti.wav
- `torre_destruida` ← Cosas rompíendose.wav
- `heroe_muere` ← Huesos.wav
- `josephine_ataque` ← Jos/JosAttSw.mp3
- `josephine_q` ← Jos/JosWord.mp3
- `josephine_w` ← Eris/ErisHeal.wav
- `josephine_r` ← Jos/JosIniciativa.mp3
- `kouji_ataque` ← Kouji/KoujiNormalBow.mp3
- `kouji_critico` ← Kouji/KoujiCritical.wav
- `kouji_q` ← Kouji/SeekingArrow.wav
- `kouji_w` ← Kouji/HealingSpirit-Signal Arrow.mp3
- `kouji_e` ← Kouji/ReactAbjur.mp3
- `kouji_r` ← Kouji/ThorArrow.wav
- `ikaruus_q` ← Ikaruus/Gekko.mp3
- `ikaruus_w` ← Ikaruus/Yukikaze.mp3
- `ikaruus_e` ← Ikaruus/Kasha.mp3
- `ikaruus_r` ← Ikaruus/Midare setsugekka.mp3
- `astrid_ataque` ← Astrid/AstridRifle1.mp3
- `astrid_q` ← Astrid/AstridPistola1.mp3
- `astrid_e` ← Astrid/AstridHacha.mp3
- `astrid_r` ← Astrid/AstridRifle1.mp3
- `legna_q` ← Fuyumi/LightDrive.wav
- `legna_r` ← Eris/ErisMassCW.wav
- `catarina_q` ← Kouji/BorealShot.wav
- `fuyumi_ataque` ← Fuyumi/Thrown.wav
- `fuyumi_critico` ← Fuyumi/FuyumiCritical.wav
- `audio/banco/` (sin asignar): Fuyumi/*, Vallentine/* y Eris/ErisCuraBaculo y ErisGarras1-3 con el nombre en minúsculas.

## Tokens
Tokens de los personajes de la carpeta de la campaña (`Glory Lands/- IMAGES/1 -Tokens`), elegidos por la dueña del proyecto (los de los 17 héroes nuevos, por Claude; ver `HEROES_NUEVOS.md`). Los de Zeflie, Zestari y Konta están recortados de sus ilustraciones (`- IMAGES/Zeflie and Zestari.png`, `ALIADOS/Zestari.png`, `ALIADOS/Konta.jpg`), que también están en `img/arte/`. **Origen y licencia por confirmar.**

## Lore y personajes
Glory Lands y sus personajes pertenecen a la campaña de rol de DMPichu.

## Material añadido después
Anota aquí cada archivo de terceros: qué es, autor, licencia y enlace.
