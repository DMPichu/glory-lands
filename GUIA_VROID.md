# Guía: héroes con VRoid Studio

El juego ya sabe cargar personajes hechos con **VRoid Studio** (archivos `.vrm`). Al cargarlos:
- Conservan su estilo anime, y el pelo y la ropa se mueven con física.
- El juego los anima: reposo con respiración, correr, golpe, parpadeo y caída al morir.
- Les pone en la mano el arma que ya lleva el héroe en el juego (espada, bastón, dagas, libro…), así que **no hace falta hacer armas**.

## 0. Atajo: partir de una muestra CC0

Hay 11 modelos de muestra de VRoid con licencia **CC0** (uso libre) en [OpenGameArt](https://opengameart.org/content/vroid-studio-cc0-models): cinco avatares (D, D oscura, E, F, G), dos cuerpos base, dos muestras de pelo y dos personajes con nombre. Funcionan tal cual en el juego, y abrir uno en VRoid Studio y cambiarle el pelo, los colores y la ropa con el token delante es mucho más rápido que empezar de cero. Claude los tiene descargados en su PC (`_entrada/vroid_cc0/`, sin subir al repositorio por su peso).

## 1. Instalar VRoid Studio

Es gratis: https://vroid.com/studio (también está en Steam). Funciona en Windows y Mac.

## 2. Crear el personaje

1. **Nuevo** → elige el modelo base femenino o masculino.
2. Abre el token del héroe al lado (están en la carpeta `tokens/` del juego o en tu carpeta de la campaña) y ve pestaña por pestaña:
   - **Cara:** forma de los ojos, **color del iris**, cejas, boca. En «Orejas» puedes alargarlas y hacerlas puntiagudas (elfas como Zeflie y Zestari).
   - **Peinado:** elige la plantilla más parecida y cambia el **color**. Puedes añadir mechones sueltos, coletas o moños.
   - **Cuerpo:** altura, proporciones y **color de piel** (por ejemplo, verde para Slinxi o morena para Zestari).
   - **Ropa:** elige prendas de las plantillas y cambia sus **colores**. Con la herramienta de pintura puedes dibujar adornos, ribetes y bordados encima.
   - **Accesorios:** gafas (Vrizahl), lazos, diademas o tiaras. Los sombreros se hacen como un «mechón» con forma de sombrero; hay muchos ejemplos en la comunidad.
3. Con 20 o 30 minutos por personaje se consigue un resultado muy bueno. Si quieres más detalle, en BOOTH (https://booth.pm) hay ropa y peinados gratuitos para VRoid.

**Qué no hace bien VRoid:** personajes que no son humanos. Hermes (león), Candle y Konta (felinos), Fotsor (esqueleto) y Cabbo (yelmo completo) es mejor dejarlos con su modelo actual. Los cuernos (Yeslie, Xeluna, Grimdarkus) se pueden imitar con mechones, pero cuesta más.

## 3. Exportar

1. Arriba a la derecha: **Exportar** → **Exportar como VRM**. Sirven **VRM 0.0 y VRM 1.0**: los dos están probados (las muestras CC0 de VRoid son 0.0).
2. En los ajustes de exportación, para que el juego vaya ligero:
   - **Reducción de polígonos:** actívala (pelo y ropa al 50 % suele bastar).
   - **Materiales:** reduce el número de materiales y usa un **atlas de texturas de 2048** (o de 1024 si pesa mucho).
   - El archivo debería quedar por debajo de **10 MB**.
3. Rellena los datos que pide (nombre y autor; el modelo es tuyo).
4. Guárdalo con el **identificador del héroe** como nombre: `belian.vrm`, `emmeline.vrm`, `zestari.vrm`…
   Identificadores: josephine, fotsor, yeslie, astrid, kouji, grimdarkus, ikaruus, crixus, legna, catarina, hermes, polett, belian, vallentine, emmeline, lucille, esperanza, fuyumi, slinxi, umi, zeflie, zestari, xeluna, vrizahl, candle, cabbo, konta.

## 4. Subirlo y probarlo

1. En GitHub, en el repositorio `glory-lands`, entra en la carpeta `_entrada` → **Add file** → **Upload files** → arrastra el `.vrm` → **Commit changes**.
2. En uno o dos minutos puedes verlo sin cambiar nada del juego:
   - **Galería** (junto a su token; añade `&anim=correr` o `&anim=atacar` para ver las animaciones):
     `https://dmpichu.github.io/glory-lands/tools/galeria.html?ids=belian&vrm=_entrada/belian.vrm`
   - **En una partida:**
     `https://dmpichu.github.io/glory-lands/?hero=belian&vrm=_entrada/belian.vrm`
   Cambia `belian` por el héroe que sea.
3. Si te gusta, pídele a Claude: «conecta el VRM de belian». Lo moverá a `models/heroes/`, lo conectará al héroe y comprobará que funciona. Si algo no queda bien (tamaño, el arma en la mano…), díselo y lo ajusta.

Consejo: empieza con **un solo héroe**, pruébalo en la partida y, cuando te guste cómo queda, sigue con los demás.
