"""Sintetiza los efectos de sonido propios del juego (sin grabaciones de terceros).

Uso:  python tools/sintetizar_sonidos.py            (crea los que faltan)
      python tools/sintetizar_sonidos.py --todos    (los rehace todos)
      python tools/sintetizar_sonidos.py josephine_w oro   (solo esos)

Necesita numpy y ffmpeg. Escribe .ogg en audio/efectos/. Los sonidos se construyen
con osciladores, ruido filtrado y envolventes: campanillas para la luz, crujidos
para el hielo, zumbidos para el rayo, etc. Licencia: propios del proyecto (CC0).
"""
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'audio', 'efectos')
rng = np.random.default_rng(7)


# ------------------------------------------------------------------ piezas básicas
def t(d):
    return np.arange(int(SR * d)) / SR


def env(n, a=0.005, d=0.2, curve=4.0):
    """Ataque lineal y caída exponencial (n muestras)."""
    x = np.arange(n) / SR
    e = np.minimum(1, x / max(a, 1e-4)) * np.exp(-np.maximum(0, x - a) * curve / max(d, 1e-3))
    return e


def sine(f, d, phase=0.0):
    return np.sin(2 * np.pi * f * t(d) + phase)


def sweep(f0, f1, d, kind='exp'):
    tt = t(d)
    if kind == 'exp':
        f = f0 * (f1 / f0) ** (tt / d)
    else:
        f = f0 + (f1 - f0) * tt / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def noise(d):
    return rng.uniform(-1, 1, int(SR * d))


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def bandpass(x, lo, hi):
    return lowpass(highpass(x, lo), hi)


def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[:len(p)] += p
    return out


def delay(x, secs, gain=0.4, times=3):
    out = np.copy(x)
    for k in range(1, times + 1):
        s = int(secs * k * SR)
        out = np.concatenate([out, np.zeros(max(0, s + len(x) - len(out)))])
        out[s:s + len(x)] += x * gain ** k
    return out


def at(x, secs):
    return np.concatenate([np.zeros(int(secs * SR)), x])


def norm(x, peak=0.85):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


# ------------------------------------------------------------------ recetas
def bell(f, d=1.2, bright=1.0):
    """Campana: parciales inarmónicos con caída."""
    n = int(SR * d)
    s = np.zeros(n)
    for ratio, amp, dec in [(1, 1, 1), (2.01, 0.5 * bright, 0.7), (3.02, 0.3 * bright, 0.5), (4.17, 0.18 * bright, 0.35), (5.43, 0.1 * bright, 0.25)]:
        s += amp * sine(f * ratio, d) * env(n, 0.002, d * dec, 3)
    return s


def chime_arp(base, steps, gap=0.07, d=1.0):
    return mix(*[at(bell(base * 2 ** (st / 12), d, 0.8) * (0.9 - i * 0.08), i * gap) for i, st in enumerate(steps)])


def shimmer(d=1.0, lo=4000, hi=9000, amount=0.25):
    n = int(SR * d)
    return bandpass(noise(d), lo, hi) * env(n, 0.05, d * 0.6, 3) * amount


def whoosh(d=0.35, lo=300, hi=3000, up=True):
    n = int(SR * d)
    x = noise(d)
    out = np.zeros(n)
    steps = 12
    for k in range(steps):
        a, b = k * n // steps, (k + 1) * n // steps
        c = lo + (hi - lo) * (k / steps if up else 1 - k / steps)
        out[a:b] = bandpass(x[a:b], c * 0.7, c * 1.3)
    shape = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return out * shape


def thump(f=70, d=0.35):
    n = int(SR * d)
    return sweep(f * 2.2, f, d) * env(n, 0.002, d * 0.5, 5)


def crack(d=0.12, hi=True):
    n = int(SR * d)
    x = noise(d) * env(n, 0.001, d * 0.3, 6)
    return highpass(x, 2500) if hi else lowpass(x, 1500)


def zap(f0=1800, f1=200, d=0.25):
    n = int(SR * d)
    mod = sine(f0 * 0.37, d)
    car = np.sin(2 * np.pi * np.cumsum(np.geomspace(f0, f1, n)) / SR + 3 * mod)
    return car * env(n, 0.002, d * 0.6, 4)


def buzz(f=110, d=0.6):
    n = int(SR * d)
    s = np.sign(sine(f, d)) * 0.5 + sine(f * 2.01, d) * 0.3
    return lowpass(s + noise(d) * 0.2, 2500) * env(n, 0.01, d * 0.7, 3)


def fire(d=0.6):
    n = int(SR * d)
    rumble = lowpass(noise(d), 600) * 0.8
    crackles = np.zeros(n)
    for _ in range(int(d * 40)):
        p = rng.integers(0, n - 800)
        crackles[p:p + 400] += highpass(noise(400 / SR), 3000) * env(400, 0.0005, 0.004, 5) * rng.uniform(0.2, 0.7)
    return (rumble + crackles) * env(n, 0.03, d * 0.7, 2.5)


def ice(d=0.7):
    n = int(SR * d)
    glass = mix(*[at(bell(f, 0.6, 1.4) * 0.35, rng.uniform(0, 0.15)) for f in (1760, 2349, 2794, 3520)])
    return mix(glass, crack(0.08) * 0.8, at(shimmer(d, 6000, 11000, 0.3), 0.02))[:n]


# ------------------------------------------------------------------ catálogo
def make():
    S = {}
    # --- Josephine: luz sagrada
    S['josephine_w'] = mix(chime_arp(784, [0, 4, 7, 12, 16], 0.06, 1.3), shimmer(1.4, 5000, 10000, 0.22), at(sine(392, 1.2) * env(int(SR * 1.2), 0.15, 0.8, 2) * 0.25, 0.0))
    S['josephine_e'] = mix(whoosh(0.3, 400, 2500), at(thump(90, 0.4), 0.25), at(bell(1046, 0.8) * 0.5, 0.26), at(shimmer(0.6, 5000, 9000, 0.2), 0.26))
    # --- comunes
    S['golpe_puno'] = mix(thump(60, 0.25), crack(0.05, False) * 0.6)
    S['subir_nivel'] = chime_arp(523, [0, 4, 7, 12], 0.09, 1.2)
    S['oro'] = mix(bell(2093, 0.35, 1.3) * 0.6, at(bell(2637, 0.4, 1.3) * 0.5, 0.06))
    S['comprar'] = mix(bell(1568, 0.3) * 0.5, at(bell(2093, 0.4) * 0.5, 0.07), at(crack(0.04) * 0.3, 0.0))
    S['reaparecer'] = mix(chime_arp(392, [0, 7, 12, 19], 0.1, 1.4), shimmer(1.4, 3000, 8000, 0.2))
    S['aviso'] = mix(bell(880, 0.5) * 0.6, at(bell(880, 0.5) * 0.5, 0.18))
    S['clic'] = crack(0.03) * 0.5 + sine(1800, 0.03) * env(int(SR * 0.03), 0.001, 0.01, 5) * 0.3
    S['torre_dispara'] = mix(zap(1200, 300, 0.3) * 0.6, whoosh(0.3, 800, 3000) * 0.5)
    S['lorik_raices'] = mix(lowpass(noise(0.8), 400) * env(int(SR * 0.8), 0.05, 0.5, 2), at(crack(0.15, False), 0.3), at(thump(50, 0.5), 0.3))
    S['lorik_invoca'] = mix(buzz(55, 1.2) * 0.6, sweep(200, 800, 1.2) * env(int(SR * 1.2), 0.3, 0.6, 2) * 0.3, shimmer(1.2, 2000, 5000, 0.2))
    # --- Fotsor: puños, tiempo y espectáculo
    S['fotsor_q'] = mix(whoosh(0.18, 600, 3000), at(thump(55, 0.35), 0.15), at(crack(0.06, False), 0.15))
    S['fotsor_w'] = mix(sweep(1200, 300, 0.7) * env(int(SR * 0.7), 0.01, 0.6, 2) * 0.4, delay(bell(660, 0.4) * 0.4, 0.09, 0.5, 4), whoosh(0.6, 3000, 400, False) * 0.5)
    S['fotsor_e'] = mix(buzz(98, 0.6) * 0.5, chime_arp(392, [0, 3, 7], 0.05, 0.6) * 0.6, thump(80, 0.3))
    S['fotsor_r'] = mix(sweep(600, 80, 1.0) * env(int(SR * 1.0), 0.02, 0.8, 2) * 0.5, delay(bell(220, 1.2, 0.5) * 0.6, 0.2, 0.5, 3), at(fire(0.8), 0.9), at(thump(45, 0.6), 0.9))
    # --- Yeslie: cristal y arcano
    S['yeslie_q'] = mix(zap(2500, 900, 0.25) * 0.5, bell(1760, 0.35, 1.5) * 0.4, whoosh(0.25, 2000, 6000) * 0.4)
    S['yeslie_w'] = mix(chime_arp(659, [0, 3, 7, 10], 0.04, 0.8) * 0.7, at(thump(80, 0.4), 0.38), at(shimmer(0.6, 3000, 8000, 0.25), 0.38))
    S['yeslie_e'] = mix(whoosh(0.25, 3000, 8000) * 0.6, bell(2349, 0.5, 1.4) * 0.4, at(bell(3136, 0.5, 1.4) * 0.3, 0.05))
    S['yeslie_r'] = mix(lowpass(noise(1.4), 500) * env(int(SR * 1.4), 0.1, 1.0, 2) * 0.9, sweep(90, 45, 1.4) * env(int(SR * 1.4), 0.05, 1.0, 2) * 0.6, at(ice(0.8), 0.4))
    # --- Astrid
    S['astrid_w'] = mix(bell(440, 0.4, 0.6) * 0.5, at(bell(440, 0.6, 0.6) * 0.5, 0.12), crack(0.05) * 0.4)
    # --- Grimdarkus: tanque oscuro
    S['grimdarkus_q'] = mix(whoosh(0.2, 300, 1500), at(thump(45, 0.5), 0.15), at(crack(0.1, False) * 0.8, 0.15))
    S['grimdarkus_w'] = mix(buzz(65, 1.0) * 0.6, lowpass(noise(1.0), 300) * env(int(SR * 1.0), 0.2, 0.7, 2) * 0.6)
    S['grimdarkus_e'] = mix(*[at(mix(thump(70, 0.3), crack(0.05, False) * 0.5) * 0.8, i * 0.09) for i in range(4)])
    S['grimdarkus_r'] = mix(ice(1.2), sweep(150, 600, 1.0) * env(int(SR * 1.0), 0.2, 0.7, 2) * 0.3, thump(50, 0.6))
    # --- Crixus: fuego y necrosis
    S['crixus_q'] = mix(whoosh(0.25, 400, 2500), at(fire(0.5) * 0.7, 0.1))
    S['crixus_w'] = mix(buzz(73, 0.8) * 0.5, sweep(400, 150, 0.8) * env(int(SR * 0.8), 0.05, 0.6, 2) * 0.3)
    S['crixus_e'] = mix(zap(900, 150, 0.4) * 0.5, at(crack(0.08, False), 0.3), whoosh(0.4, 500, 2000) * 0.5)
    S['crixus_r'] = mix(fire(1.2) * 0.7, buzz(49, 1.2) * 0.5, sweep(300, 60, 1.2) * env(int(SR * 1.2), 0.02, 1.0, 2) * 0.4)
    # --- Catarina: hielo
    S['catarina_w'] = mix(ice(0.9), whoosh(0.8, 4000, 1000, False) * 0.4)
    S['catarina_e'] = mix(whoosh(0.3, 1000, 5000) * 0.7, at(ice(0.5) * 0.7, 0.2))
    S['catarina_r'] = mix(ice(1.4), at(crack(0.2) * 0.8, 0.1), at(thump(40, 0.8), 0.1), shimmer(1.4, 6000, 12000, 0.3))
    # --- Legna: luz y sol
    S['legna_w'] = mix(chime_arp(587, [0, 5, 9], 0.06, 1.0), shimmer(1.0, 4000, 9000, 0.2))
    S['legna_e'] = mix(bell(784, 1.0) * 0.6, at(bell(1175, 1.0) * 0.5, 0.08), whoosh(0.5, 1500, 5000) * 0.4)
    # --- Habilidades genéricas de los héroes nuevos (kit_<tipo>)
    S['kit_skillshot'] = mix(zap(1600, 500, 0.3) * 0.6, whoosh(0.3, 1500, 5000) * 0.5)
    S['kit_area'] = mix(sweep(300, 900, 0.4) * env(int(SR * 0.4), 0.2, 0.2, 2) * 0.3, at(thump(70, 0.5), 0.38), at(shimmer(0.5, 2500, 7000, 0.25), 0.38))
    S['kit_cone'] = mix(whoosh(0.22, 800, 4000), at(whoosh(0.2, 900, 4500) * 0.8, 0.15))
    S['kit_dash'] = mix(whoosh(0.35, 300, 2500), at(thump(65, 0.3), 0.28))
    S['kit_blink'] = mix(sweep(2000, 500, 0.25) * env(int(SR * 0.25), 0.002, 0.2, 3) * 0.4, at(sweep(500, 2000, 0.25) * env(int(SR * 0.25), 0.002, 0.2, 3) * 0.4, 0.12), shimmer(0.4, 4000, 9000, 0.2))
    S['kit_buff'] = mix(chime_arp(440, [0, 4, 7], 0.05, 0.7) * 0.6, buzz(110, 0.5) * 0.25)
    S['kit_shield'] = mix(bell(659, 0.8, 0.7) * 0.5, shimmer(0.8, 3000, 7000, 0.25), sweep(300, 600, 0.6) * env(int(SR * 0.6), 0.05, 0.4, 2) * 0.2)
    S['kit_heal'] = mix(chime_arp(659, [0, 5, 9, 12], 0.06, 1.1), shimmer(1.1, 5000, 10000, 0.2))
    S['kit_nova'] = mix(thump(55, 0.5), whoosh(0.5, 400, 3000) * 0.7, at(crack(0.08, False) * 0.6, 0.02))
    S['kit_stealth'] = mix(whoosh(0.5, 3000, 300, False) * 0.6, sweep(800, 200, 0.5) * env(int(SR * 0.5), 0.01, 0.4, 2) * 0.2)
    S['kit_execute'] = mix(whoosh(0.2, 1000, 6000), at(crack(0.12) * 0.9, 0.18), at(thump(45, 0.6), 0.18), at(bell(1318, 0.8, 1.2) * 0.4, 0.2))
    S['kit_prison'] = mix(zap(900, 2400, 0.3) * 0.5, buzz(147, 0.9) * 0.4, at(bell(880, 0.8, 1.3) * 0.4, 0.1))
    # --- Jungla
    S['monstruo_epico'] = mix(buzz(41, 1.4) * 0.6, lowpass(noise(1.4), 250) * env(int(SR * 1.4), 0.3, 1.0, 2), sweep(80, 160, 1.4) * env(int(SR * 1.4), 0.4, 0.8, 2) * 0.4)
    S['bendicion'] = mix(chime_arp(698, [0, 4, 7, 11, 14], 0.05, 1.0) * 0.8, shimmer(1.0, 5000, 10000, 0.2))
    return S


def write(name, x):
    x = norm(np.concatenate([x, np.zeros(int(SR * 0.05))]))
    fade = int(SR * 0.02)
    x[-fade:] *= np.linspace(1, 0, fade)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    out = os.path.join(OUT, name + '.ogg')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '4', out], check=True)
    os.remove(tmp)
    return out


if __name__ == '__main__':
    args = sys.argv[1:]
    todos = '--todos' in args
    nombres = [a for a in args if not a.startswith('--')]
    sounds = make()
    for name, x in sounds.items():
        dest = os.path.join(OUT, name + '.ogg')
        if nombres and name not in nombres:
            continue
        if not nombres and not todos and os.path.exists(dest) and name != 'josephine_w':
            continue
        write(name, x)
        print('creado', name, f'{len(x) / SR:.2f} s', f'{os.path.getsize(dest) // 1024} KB')
