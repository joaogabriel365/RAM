"""Modelo do estado do rosto (espelhado em frontend/src/types/face.ts)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

HexColor = Annotated[str, Field(pattern=r"^#[0-9a-fA-F]{6}$")]

EyeShape = Literal["redondo", "oval", "retangulo", "pixel", "anime", "linha"]
MouthStyle = Literal["sorriso", "linha", "onda", "pixel", "gato", "nenhuma"]
BackgroundType = Literal["solido", "gradiente", "grade", "pontos", "estrelas", "aurora"]
GlassesStyle = Literal["nenhum", "redondo", "quadrado", "visor", "coracao"]
Headwear = Literal["nenhum", "orelhas_gato", "chifres", "gorro_natal", "coroa", "antena", "laco"]
Personality = Literal["serena", "curiosa", "brincalhona", "sonolenta"]
LedEffect = Literal["fixo", "respirando", "arco_iris", "piscando"]
Expression = Literal[
    "neutro",
    "feliz",
    "curioso",
    "surpreso",
    "bravo",
    "triste",
    "dormindo",
    "piscadinha",
    "apaixonado",
    "pensando",
]

# Nome do efeito no protocolo serial do ESP32.
LED_EFFECT_CMD: dict[str, str] = {
    "fixo": "solid",
    "respirando": "breathe",
    "arco_iris": "rainbow",
    "piscando": "blink",
}


class CamelModel(BaseModel):
    """JSON em camelCase para o frontend; em Python continua snake_case."""

    model_config = ConfigDict(
        alias_generator=to_camel, validate_by_name=True, serialize_by_alias=True
    )


class Eyes(CamelModel):
    shape: EyeShape = "redondo"
    size: float = Field(1.0, ge=0.5, le=1.6)
    spacing: float = Field(1.0, ge=0.6, le=1.4)
    tilt: float = Field(0, ge=-25, le=25, description="graus; positivo = cantos de fora para cima")
    color: HexColor = "#B026FF"
    gradient: bool = False
    color2: HexColor = "#22D3EE"
    pupil_color: HexColor = "#F5E9FF"
    pupil_size: float = Field(1.0, ge=0.4, le=1.6)
    outline: bool = False
    highlight: bool = False
    glow: float = Field(0.6, ge=0, le=1)


class Mouth(CamelModel):
    style: MouthStyle = "sorriso"
    color: HexColor = "#D58CFF"
    width: float = Field(1.0, ge=0.5, le=1.6)
    thickness: float = Field(1.0, ge=0.5, le=2)
    offset_y: float = Field(0, ge=-60, le=60)


class Extras(CamelModel):
    brows: bool = False
    blush: bool = False
    blush_color: HexColor = "#FF5FA2"
    glasses: GlassesStyle = "nenhum"
    glasses_color: HexColor = "#E9DDFF"
    headwear: Headwear = "nenhum"
    headwear_color: HexColor = "#B026FF"
    fangs: bool = False

    @field_validator("glasses", mode="before")
    @classmethod
    def _legacy_glasses(cls, value: object) -> object:
        # versão 0.1 guardava óculos como true/false
        if isinstance(value, bool):
            return "redondo" if value else "nenhum"
        return value


class Layout(CamelModel):
    scale: float = Field(1.0, ge=0.7, le=1.3)
    offset_y: float = Field(0, ge=-60, le=60)


class Background(CamelModel):
    type: BackgroundType = "grade"
    color: HexColor = "#07060B"
    color2: HexColor = "#1A0F2E"
    grid_color: HexColor = "#2A2140"
    scanlines: float = Field(0.25, ge=0, le=1)
    vignette: float = Field(0.5, ge=0, le=1)


class Animation(CamelModel):
    blink_rate: int = Field(14, ge=0, le=40, description="piscadas por minuto")
    transition_speed: float = Field(1.0, ge=0.25, le=3)
    glitch: bool = False
    breathing: bool = True
    personality: Personality = "serena"
    follow_touch: bool = True


class Behavior(CamelModel):
    mood: Expression = "neutro"
    react_touch: bool = True
    react_obstacle: bool = True
    react_battery: bool = True


class Leds(CamelModel):
    color: HexColor = "#B026FF"
    effect: LedEffect = "respirando"
    brightness: float = Field(0.8, ge=0, le=1)
    speed: float = Field(1.0, ge=0.25, le=3)
    sync_eyes: bool = False


class FaceAppearance(CamelModel):
    eyes: Eyes = Field(default_factory=Eyes)
    mouth: Mouth = Field(default_factory=Mouth)
    extras: Extras = Field(default_factory=Extras)
    layout: Layout = Field(default_factory=Layout)
    background: Background = Field(default_factory=Background)
    animation: Animation = Field(default_factory=Animation)
    behavior: Behavior = Field(default_factory=Behavior)
    leds: Leds = Field(default_factory=Leds)


class Speech(CamelModel):
    id: int
    text: str
    ts: float


class FaceState(CamelModel):
    appearance: FaceAppearance = Field(default_factory=FaceAppearance)
    expression: Expression = "neutro"
    speech: Speech | None = None
    sleeping: bool = False
    rev: int = 0


def led_command(appearance: FaceAppearance) -> dict:
    leds = appearance.leds
    return {
        "cmd": "led",
        "color": appearance.eyes.color if leds.sync_eyes else leds.color,
        "effect": LED_EFFECT_CMD[leds.effect],
        "brightness": round(leds.brightness, 2),
        "speed": round(leds.speed, 2),
    }


# ---------- Presets de fábrica ----------

USER_CATEGORY = "Meus presets"


@dataclass(frozen=True)
class FactoryPreset:
    category: str
    description: str
    appearance: FaceAppearance


def _preset(category: str, description: str, **sections) -> FactoryPreset:
    return FactoryPreset(category, description, FaceAppearance(**sections))


FACTORY_PRESETS: dict[str, FactoryPreset] = {
    # Clássicos
    "Padrão RAM": _preset("Clássicos", "O visual oficial: olhos neon roxos sobre papel milimetrado."),
    "Minimalista": _preset(
        "Clássicos",
        "Traços finos e brancos, sem distrações.",
        eyes=Eyes(shape="linha", color="#F2F0F7", glow=0.25, size=1.05),
        mouth=Mouth(style="linha", color="#F2F0F7", width=0.7, thickness=0.8),
        background=Background(type="solido", color="#050507", scanlines=0, vignette=0.3),
        leds=Leds(color="#F2F0F7", effect="fixo", brightness=0.5),
    ),
    "Robô Retrô": _preset(
        "Clássicos",
        "Painel de ficção científica dos anos 80, com antena.",
        eyes=Eyes(shape="retangulo", color="#22D3EE", pupil_color="#04121A", pupil_size=0.8, glow=0.7),
        mouth=Mouth(style="pixel", color="#22D3EE"),
        extras=Extras(headwear="antena", headwear_color="#22D3EE"),
        background=Background(type="pontos", color="#050B10", grid_color="#0E3A4A", scanlines=0.5),
        animation=Animation(personality="curiosa"),
        leds=Leds(color="#22D3EE", effect="respirando"),
    ),
    "Terminal": _preset(
        "Clássicos",
        "Fósforo verde de monitor CRT antigo.",
        eyes=Eyes(shape="pixel", color="#39FF6A", pupil_color="#021A08", glow=0.8),
        mouth=Mouth(style="pixel", color="#39FF6A"),
        background=Background(type="solido", color="#020A04", scanlines=0.85, vignette=0.85),
        animation=Animation(glitch=True, transition_speed=1.5),
        leds=Leds(color="#39FF6A", effect="fixo"),
    ),
    # Temas
    "Cyberpunk": _preset(
        "Temas",
        "Visor neon, falhas de sinal e magenta elétrico.",
        eyes=Eyes(shape="retangulo", color="#FF2BD6", gradient=True, color2="#22D3EE", pupil_color="#120018", tilt=8, glow=0.9),
        mouth=Mouth(style="onda", color="#22D3EE", thickness=1.2),
        extras=Extras(glasses="visor", glasses_color="#22D3EE"),
        background=Background(type="grade", color="#0A0012", grid_color="#4A0F5C", scanlines=0.45),
        animation=Animation(glitch=True, personality="brincalhona"),
        leds=Leds(color="#FF2BD6", effect="arco_iris", speed=1.6),
    ),
    "Kawaii": _preset(
        "Temas",
        "Fofura máxima: orelhinhas, bochechas e boquinha de gato.",
        eyes=Eyes(shape="anime", size=1.1, color="#FF7FCF", pupil_color="#2A0A2E", glow=0.6),
        mouth=Mouth(style="gato", color="#FFB3E6", width=0.9),
        extras=Extras(blush=True, headwear="orelhas_gato", headwear_color="#FF7FCF"),
        background=Background(type="gradiente", color="#12051A", color2="#3A0F3A"),
        animation=Animation(personality="brincalhona"),
        behavior=Behavior(mood="feliz"),
        leds=Leds(color="#FF7FCF", effect="respirando"),
    ),
    "Galáxia": _preset(
        "Temas",
        "Olhos em degradê flutuando entre estrelas.",
        eyes=Eyes(shape="oval", color="#8B5CF6", gradient=True, color2="#22D3EE", pupil_color="#F5F3FF", highlight=True, glow=0.8),
        mouth=Mouth(style="sorriso", color="#A5B4FC"),
        background=Background(type="estrelas", color="#03020A", color2="#140B33", scanlines=0.1),
        leds=Leds(color="#8B5CF6", effect="arco_iris", speed=0.6),
    ),
    "Aurora Boreal": _preset(
        "Temas",
        "Cores que dançam no fundo. Calma total.",
        eyes=Eyes(color="#5EEAD4", gradient=True, color2="#A78BFA", pupil_color="#042F2E", highlight=True),
        mouth=Mouth(style="linha", color="#99F6E4"),
        background=Background(type="aurora", color="#020617", color2="#0EA5A0", grid_color="#7C3AED", scanlines=0.1),
        animation=Animation(transition_speed=0.7),
        leds=Leds(color="#5EEAD4", effect="respirando", speed=0.6),
    ),
    "Vaporwave": _preset(
        "Temas",
        "Pôr do sol rosa e roxo, estética anos 90.",
        eyes=Eyes(shape="oval", color="#FF71CE", gradient=True, color2="#FFB86C", pupil_color="#2D0B3F"),
        mouth=Mouth(style="onda", color="#01CDFE"),
        extras=Extras(glasses="quadrado", glasses_color="#01CDFE"),
        background=Background(type="grade", color="#120624", grid_color="#B967FF", scanlines=0.35),
        leds=Leds(color="#FF71CE", effect="arco_iris"),
    ),
    # Eventos
    "Modo Evento FIAP": _preset(
        "Eventos",
        "Cores da FIAP, sorriso aberto e LEDs arco-íris.",
        eyes=Eyes(shape="oval", size=1.1, color="#ED145B", pupil_color="#FFFFFF", glow=0.8),
        mouth=Mouth(style="sorriso", color="#22D3EE"),
        extras=Extras(blush=True),
        background=Background(type="gradiente", color="#07060B", color2="#3A0A2A"),
        animation=Animation(blink_rate=16, transition_speed=1.2, personality="brincalhona"),
        behavior=Behavior(mood="feliz"),
        leds=Leds(color="#ED145B", effect="arco_iris"),
    ),
    "Recepção": _preset(
        "Eventos",
        "Simpático e atento para receber visitantes.",
        eyes=Eyes(size=1.1, highlight=True),
        extras=Extras(brows=True, blush=True),
        background=Background(type="gradiente", color="#07060B", color2="#1E0F35"),
        animation=Animation(personality="curiosa"),
        behavior=Behavior(mood="feliz"),
    ),
    "Maker Day": _preset(
        "Eventos",
        "Energia de oficina: laranja, antena e curiosidade.",
        eyes=Eyes(shape="oval", color="#FFB020", pupil_color="#1A0F00", glow=0.7),
        mouth=Mouth(style="sorriso", color="#FFD166"),
        extras=Extras(headwear="antena", headwear_color="#FFB020"),
        background=Background(type="pontos", color="#0B0703", grid_color="#4A3412"),
        animation=Animation(personality="curiosa"),
        leds=Leds(color="#FFB020", effect="respirando"),
    ),
    # Festas
    "Halloween": _preset(
        "Festas",
        "Chifres, presas e olhos de abóbora.",
        eyes=Eyes(shape="anime", size=1.05, spacing=1.1, color="#FF7A00", pupil_color="#120600", glow=0.9),
        mouth=Mouth(style="sorriso", color="#7CFF3B"),
        extras=Extras(brows=True, headwear="chifres", headwear_color="#FF3D00", fangs=True),
        background=Background(type="solido", color="#0A0500", vignette=0.8),
        animation=Animation(blink_rate=8, transition_speed=0.8, glitch=True, personality="brincalhona"),
        leds=Leds(color="#FF7A00", effect="piscando"),
    ),
    "Natal": _preset(
        "Festas",
        "Gorro vermelho, olhos dourados e céu estrelado.",
        eyes=Eyes(color="#FFD166", pupil_color="#3A1A00", highlight=True),
        mouth=Mouth(style="sorriso", color="#FF4D4D"),
        extras=Extras(blush=True, headwear="gorro_natal", headwear_color="#E11D48"),
        background=Background(type="estrelas", color="#02100A", color2="#062A1A"),
        behavior=Behavior(mood="feliz"),
        leds=Leds(color="#E11D48", effect="piscando", speed=0.8),
    ),
    "Festa Junina": _preset(
        "Festas",
        "Arraiá do Maker: laço, cores quentes e bochechas.",
        eyes=Eyes(shape="oval", color="#FF8C42", pupil_color="#2B1100"),
        mouth=Mouth(style="sorriso", color="#FFD23F"),
        extras=Extras(brows=True, blush=True, blush_color="#FF6B6B", headwear="laco", headwear_color="#E63946"),
        background=Background(type="pontos", color="#140A04", grid_color="#5A3414"),
        animation=Animation(personality="brincalhona"),
        leds=Leds(color="#FF8C42", effect="arco_iris"),
    ),
    "Carnaval": _preset(
        "Festas",
        "Coroa, purpurina e muita cor.",
        eyes=Eyes(shape="anime", color="#00F5D4", pupil_color="#1B0036"),
        mouth=Mouth(style="sorriso", color="#FEE440"),
        extras=Extras(headwear="coroa", headwear_color="#FEE440"),
        background=Background(type="aurora", color="#0B0221", color2="#F15BB5", grid_color="#00BBF9"),
        animation=Animation(personality="brincalhona"),
        behavior=Behavior(mood="feliz"),
        leds=Leds(color="#F15BB5", effect="arco_iris", speed=2),
    ),
}

DEFAULT_PRESET = "Padrão RAM"
