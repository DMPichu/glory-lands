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


def saw(f, d):
    tt = t(d)
    return 2 * ((tt * f) % 1) - 1


def pad(freqs, d=1.2, cutoff=1800, attack=0.25):
    """Acorde cálido (sierras desafinadas y filtradas) que entra suave: luz y curación sin campanas."""
    n = int(SR * d)
    s = np.zeros(n)
    for f in freqs:
        for det in (0.996, 1.004):
            s += saw(f * det, d)
    s = lowpass(s / (len(freqs) * 2), cutoff)
    e = np.minimum(1, np.arange(n) / (SR * attack)) * np.exp(-np.maximum(0, np.arange(n) / SR - attack) * 2.2 / d)
    return s * e


def horn(f, d=0.6):
    """Cuerno grave: aviso sin campanilla."""
    n = int(SR * d)
    s = lowpass(saw(f, d) + 0.5 * saw(f * 1.5, d), 900)
    return s * np.minimum(1, np.arange(n) / (SR * 0.06)) * np.exp(-np.arange(n) / SR * 3 / d)


def coin(d=0.09, f=3200):
    """Moneda: chasquido metálico muy corto."""
    n = int(SR * d)
    return (highpass(noise(d), 4000) * 0.6 + sine(f, d) * 0.4 + sine(f * 1.37, d) * 0.25) * env(n, 0.001, d * 0.25, 6)


def rise(d=0.6, lo=200, hi=2400):
    """Subida de ruido filtrado (energía que se carga)."""
    return whoosh(d, lo, hi, True) * np.linspace(0.3, 1, int(SR * d))


# ------------------------------------------------------------------ catálogo
def make():
    S = {}
    # --- Josephine: luz sagrada
    S['josephine_w'] = mix(pad([392, 494, 587, 784], 1.4, 2600, 0.2), rise(0.5, 600, 5000) * 0.35, at(shimmer(0.9, 6000, 11000, 0.12), 0.25))
    S['josephine_e'] = mix(whoosh(0.3, 400, 2500), at(thump(90, 0.4), 0.25), at(pad([523, 659, 784], 0.7, 2200, 0.02) * 0.6, 0.26))
    # --- comunes
    S['golpe_puno'] = mix(thump(60, 0.25), crack(0.05, False) * 0.6)
    S['subir_nivel'] = mix(rise(0.5, 300, 3000) * 0.6, at(pad([262, 330, 392, 523], 1.1, 2400, 0.08), 0.35))
    S['oro'] = mix(coin(0.08, 3400) * 0.5, at(coin(0.07, 4100) * 0.35, 0.05))
    S['comprar'] = mix(lowpass(noise(0.12), 900) * env(int(SR * 0.12), 0.002, 0.06, 5) * 0.8, at(coin(0.08, 3000), 0.06), at(coin(0.08, 3600) * 0.7, 0.1), at(coin(0.08, 2800) * 0.5, 0.15))
    S['reaparecer'] = mix(rise(0.8, 200, 2500) * 0.6, at(pad([196, 294, 392], 1.2, 1800, 0.15), 0.5))
    S['aviso'] = mix(horn(147, 0.45), at(horn(196, 0.6), 0.22))
    S['clic'] = crack(0.03) * 0.5 + sine(1800, 0.03) * env(int(SR * 0.03), 0.001, 0.01, 5) * 0.3
    S['torre_dispara'] = mix(sweep(160, 40, 0.45) * env(int(SR * 0.45), 0.002, 0.3, 4) * 0.9, crack(0.06, False) * 0.6, zap(700, 120, 0.35) * 0.4, whoosh(0.35, 1200, 300, False) * 0.5)
    S['torre_impacto'] = mix(thump(48, 0.5), crack(0.12, False) * 0.8, at(lowpass(noise(0.4), 500) * env(int(SR * 0.4), 0.005, 0.25, 3) * 0.6, 0.02))
    S['lorik_raices'] = mix(lowpass(noise(0.8), 400) * env(int(SR * 0.8), 0.05, 0.5, 2), at(crack(0.15, False), 0.3), at(thump(50, 0.5), 0.3))
    S['lorik_invoca'] = mix(buzz(55, 1.2) * 0.6, sweep(200, 800, 1.2) * env(int(SR * 1.2), 0.3, 0.6, 2) * 0.3, shimmer(1.2, 2000, 5000, 0.2))
    # --- Fotsor: puños, tiempo y espectáculo
    S['fotsor_q'] = mix(whoosh(0.18, 600, 3000), at(thump(55, 0.35), 0.15), at(crack(0.06, False), 0.15))
    S['fotsor_w'] = mix(sweep(1200, 300, 0.7) * env(int(SR * 0.7), 0.01, 0.6, 2) * 0.4, delay(bell(660, 0.4) * 0.4, 0.09, 0.5, 4), whoosh(0.6, 3000, 400, False) * 0.5)
    S['fotsor_e'] = mix(buzz(98, 0.6) * 0.5, horn(131, 0.6) * 0.6, thump(80, 0.3))
    S['fotsor_r'] = mix(sweep(600, 80, 1.0) * env(int(SR * 1.0), 0.02, 0.8, 2) * 0.5, delay(bell(220, 1.2, 0.5) * 0.6, 0.2, 0.5, 3), at(fire(0.8), 0.9), at(thump(45, 0.6), 0.9))
    # --- Yeslie: cristal y arcano
    S['yeslie_q'] = mix(zap(2500, 900, 0.25) * 0.5, bell(1760, 0.35, 1.5) * 0.4, whoosh(0.25, 2000, 6000) * 0.4)
    S['yeslie_w'] = mix(zap(2200, 600, 0.4) * 0.4, rise(0.38, 800, 4000) * 0.4, at(thump(80, 0.4), 0.38), at(shimmer(0.6, 3000, 8000, 0.25), 0.38))
    S['yeslie_e'] = mix(whoosh(0.25, 3000, 8000) * 0.6, bell(2349, 0.5, 1.4) * 0.4, at(bell(3136, 0.5, 1.4) * 0.3, 0.05))
    S['yeslie_r'] = mix(lowpass(noise(1.4), 500) * env(int(SR * 1.4), 0.1, 1.0, 2) * 0.9, sweep(90, 45, 1.4) * env(int(SR * 1.4), 0.05, 1.0, 2) * 0.6, at(ice(0.8), 0.4))
    # --- Astrid
    S['astrid_w'] = mix(horn(110, 0.5) * 0.7, crack(0.05) * 0.4)
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
    S['legna_w'] = mix(pad([294, 370, 440, 587], 1.1, 2400, 0.15), rise(0.4, 800, 5000) * 0.3)
    S['legna_e'] = mix(pad([392, 587, 784], 0.9, 3000, 0.05) * 0.8, whoosh(0.5, 1500, 5000) * 0.4)
    # --- Habilidades genéricas de los héroes nuevos (kit_<tipo>)
    S['kit_skillshot'] = mix(zap(1600, 500, 0.3) * 0.6, whoosh(0.3, 1500, 5000) * 0.5)
    S['kit_area'] = mix(sweep(300, 900, 0.4) * env(int(SR * 0.4), 0.2, 0.2, 2) * 0.3, at(thump(70, 0.5), 0.38), at(shimmer(0.5, 2500, 7000, 0.25), 0.38))
    S['kit_cone'] = mix(whoosh(0.22, 800, 4000), at(whoosh(0.2, 900, 4500) * 0.8, 0.15))
    S['kit_dash'] = mix(whoosh(0.35, 300, 2500), at(thump(65, 0.3), 0.28))
    S['kit_blink'] = mix(sweep(2000, 500, 0.25) * env(int(SR * 0.25), 0.002, 0.2, 3) * 0.4, at(sweep(500, 2000, 0.25) * env(int(SR * 0.25), 0.002, 0.2, 3) * 0.4, 0.12), shimmer(0.4, 4000, 9000, 0.2))
    S['kit_buff'] = mix(thump(70, 0.3), rise(0.45, 150, 1800) * 0.6, buzz(110, 0.5) * 0.25)
    S['kit_shield'] = mix(sweep(120, 240, 0.7) * env(int(SR * 0.7), 0.05, 0.5, 2) * 0.6, lowpass(noise(0.7), 1200) * env(int(SR * 0.7), 0.08, 0.4, 2) * 0.5, shimmer(0.7, 2500, 6000, 0.15))
    S['kit_heal'] = mix(pad([330, 415, 494, 659], 1.1, 2200, 0.2), rise(0.5, 500, 4000) * 0.3)
    S['kit_nova'] = mix(thump(55, 0.5), whoosh(0.5, 400, 3000) * 0.7, at(crack(0.08, False) * 0.6, 0.02))
    S['kit_stealth'] = mix(whoosh(0.5, 3000, 300, False) * 0.6, sweep(800, 200, 0.5) * env(int(SR * 0.5), 0.01, 0.4, 2) * 0.2)
    S['kit_execute'] = mix(whoosh(0.2, 1000, 6000), at(crack(0.12) * 0.9, 0.18), at(thump(45, 0.6), 0.18), at(bell(1318, 0.8, 1.2) * 0.4, 0.2))
    S['kit_prison'] = mix(zap(900, 2400, 0.3) * 0.5, buzz(147, 0.9) * 0.4, at(bell(880, 0.8, 1.3) * 0.4, 0.1))
    # --- Jungla
    S['monstruo_epico'] = mix(buzz(41, 1.4) * 0.6, lowpass(noise(1.4), 250) * env(int(SR * 1.4), 0.3, 1.0, 2), sweep(80, 160, 1.4) * env(int(SR * 1.4), 0.4, 0.8, 2) * 0.4)
    S['bendicion'] = mix(pad([349, 440, 523, 698], 1.2, 2600, 0.15), rise(0.6, 300, 3500) * 0.4)
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
        if not nombres and not todos and os.path.exists(dest):
            continue
        write(name, x)
        print('creado', name, f'{len(x) / SR:.2f} s', f'{os.path.getsize(dest) // 1024} KB')
