# Créditos

## Código y motor
- [three.js](https://threejs.org/) 0.160 (licencia MIT), cargado desde jsDelivr.

## Modelos 3D
- **KayKit: Adventurers Character Pack** y **KayKit: Skeletons Character Pack**, de [Kay Lousberg](https://www.kaylousberg.com) (CC0). Son los modelos animados de los súbditos, en `models/kaykit/` (también están preparados para los héroes, desactivados: `HERO_MODELS` en `js/config.js`). Se recortaron las animaciones que no se usan y se comprimieron con meshopt; en el juego se recolorean y se estilizan las proporciones (ver `HERO_MODELS` en `js/config.js` y `SLIM` en `js/models.js`).
- Los 10 héroes son modelos originales de estilo anime hechos con formas básicas en `js/heroes.js`, con la cara pintada en el propio juego. Los tokens de la campaña solo sirvieron de guía de colores y rasgos.
- El resto de modelos (estructuras, Altar, monstruos de la jungla), el mapa y los efectos están hechos con formas básicas en `js/models.js` y `js/jungle.js` (originales).

## Iconos de habilidades
Iconos de [game-icons.net](https://game-icons.net), con licencia [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). En blanco y sin modificar, en `img/habilidades/`.

- **Lorc**: book-aura (yes_p), bull-horns (gri_q), candle-skull (cri_r), chained-arrow-heads (kou_p), charged-arrow (kou_q), crescent-blade (ika_q), crossed-pistols (ast_q), cubeforce (gri_r), double-dragon (ika_r), dripping-blade (cri_p), falling-leaf (kou_e), fluffy-flame (fot_p), frozen-block (cat_r), frozen-orb (cat_p), harpoon-chain (cri_e), holy-symbol (leg_e), ice-spear (cat_q), icicles-aura (ika_w), lightning-bow (kou_r), magic-shield (leg_w), prayer (gri_w), punch-blast (fot_q), sands-of-time (fot_r), snowing (cat_w), spark-spirit (kou_w), spiked-halo (jos_p), sun-radiations (leg_p), sunbeams (leg_q), supersonic-bullet (ast_r), whirlwind (ika_e), winged-sword (jos_q)
- **Delapouite**: armor-upgrade (cri_w), backward-time (fot_w), black-knight-helm (gri_p), charging-bull (ast_e), eye-target (ast_p), flower-emblem (ika_p), hand-of-god (jos_w), ice-skate (cat_e), knight-banner (jos_r), peace-dove (leg_r), shield-bash (jos_e), sparkles (yes_e), spell-book (yes_w), theater (fot_e), viking-helmet (ast_w)
- **John Colburn**: pistol-gun (yes_q)
- **Faithtoken**: dragon-head (yes_r)
- **Skoll**: mounted-knight (gri_e)
- **Sbed**: death-skull (cri_q)

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

## Tokens
Tokens de los personajes de la carpeta de la campaña (`Glory Lands/- IMAGES/1 -Tokens`), elegidos por la dueña del proyecto. **Origen y licencia por confirmar.**

## Lore y personajes
Glory Lands y sus personajes pertenecen a la campaña de rol de DMPichu.

## Material añadido después
Anota aquí cada archivo de terceros: qué es, autor, licencia y enlace.
