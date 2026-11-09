# RAM — interface web do robô auxiliar do Maker Paulista (FIAP)

A RAM é a robô auxiliar do laboratório Maker Paulista. Este projeto é o site que roda no
computador da cabeça dela e tem dois papéis:

1. **Rosto**: a rota `/face`, em tela cheia na tela da cabeça (modo quiosque).
2. **Painel** (celular ou notebook na mesma rede Wi-Fi), em abas:
   - **Personalizar** (`/`): prévia ao vivo do rosto e editor lado a lado.
   - **Mini-jogos** (`/jogos`): jogo da velha e pedra-papel-tesoura contra a RAM; o rosto reage
     quando ela ganha, perde ou empata.
   - **Achados e perdidos** (`/achados`): itens esquecidos no lab (o admin registra e dá baixa).

Tudo o que muda no painel aparece **ao vivo** no rosto. O estado do rosto mora no backend
(fonte única da verdade) e chega a todas as telas por WebSocket.

```
ram-robo/
├── backend/            FastAPI + SQLite + driver do ESP32
│   ├── ram/
│   │   ├── main.py         app, inicialização, serve o frontend já compilado
│   │   ├── face.py         modelo do estado do rosto + presets de fábrica
│   │   ├── face_store.py   fonte da verdade do rosto (expressão, fala, modo descanso)
│   │   ├── hub.py          conexões WebSocket e broadcast
│   │   ├── robot/          camada "robot driver": mock.py (simulado) e serial_driver.py (ESP32)
│   │   └── routes/         API REST (/api/...) e WebSocket (/ws)
│   └── .env.example
├── frontend/           React + Vite + TypeScript + Tailwind + Framer Motion
│   └── src/
│       ├── components/face/   O componente do rosto (único, reutilizado em todo lugar)
│       ├── components/rosto/  Aba Rosto (presets, expressões, rascunho/ao vivo)
│       ├── lib/realtime.ts    WebSocket com reconexão automática
│       └── types/             FaceState, Telemetry...
└── deploy/             serviço systemd, script de quiosque, inicialização no Windows
```

## O que já está no ar

- **Rosto** (`/face`): rosto animado em tela cheia, com os presets e expressões aplicados ao vivo.
- **Painel** com login de admin e três abas:
  - **Personalizar**: prévia ao vivo e editor do rosto numa tela só.
  - **Mini-jogos**: jogo da velha (imbatível no difícil) e pedra-papel-tesoura, com o rosto reagindo.
  - **Achados e perdidos**: itens esquecidos no lab, registrados e baixados pelo admin.

### Próximos passos pensados

Controle do robô (joystick + parada de emergência com watchdog) e a integração com o Controle Maker
(reservas, cronograma de kits e estoque), que depende de acesso de leitura ao banco deles.

### O que a aba Personalizar faz

- **Galeria** com 16 presets de fábrica em 4 categorias (Clássicos, Temas, Eventos, Festas), cada
  um com miniatura ao vivo, e seus próprios presets (salvar, renomear, sobrescrever, excluir).
- **Editor** em abas:
  - Olhos: formato, tamanho, espaçamento, inclinação, pupila, degradê, contorno, reflexo, brilho.
  - Boca: 6 estilos, largura, espessura, posição, presas.
  - Acessórios: sobrancelhas, bochechas, 4 óculos e 6 itens de cabeça.
  - Fundo e tela: 6 fundos (incluindo estrelas e aurora animadas), scanlines, vinheta, enquadramento.
  - Movimento: personalidade, humor base, piscadas, respiração, olhos que seguem o toque, glitch e
    reações automáticas.
  - LEDs: cor (ou mesma cor dos olhos), efeito, brilho e velocidade.
- **Personalidade** (serena, curiosa, brincalhona, sonolenta): muda o jeito de olhar e de piscar e
  faz microexpressões espontâneas quando a RAM está parada.
- **Reações automáticas** (no backend): susto com obstáculo a menos de 25 cm, tristeza + pedido de
  carga com bateria abaixo de 6,9 V, alegria ao ser tocado.
- **Ferramentas:** desfazer/refazer (Ctrl+Z / Ctrl+Shift+Z), "Aleatório" com cores harmônicas,
  gerador de harmonia de cores, exportar/importar `.json`, restaurar o padrão e avisos de contraste.
- **Prévia:** formatos 16:10, 16:9, 4:3 e redonda (a tela da cabeça ainda não foi escolhida), modo
  "testar expressões" (só na prévia), tela cheia e olhos seguindo o mouse.

---

## Rodar no PC em modo mock (sem o robô)

Precisa de **Python 3.11+** e **Node.js 20+**.

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:            .venv\Scripts\activate
# Linux / macOS:      source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # no Windows: copy .env.example .env
python -m ram
```

O `.env.example` já vem com `MOCK_ROBOT=true`: o robô é simulado (bateria descarregando,
sensores de distância mudando) e nada de hardware é necessário.

### 2. Frontend

**Para desenvolver** (recarrega sozinho ao salvar):

```bash
cd frontend
npm install
npm run dev
```

Abra **http://localhost:5173** (painel) e **http://localhost:5173/face** (rosto).
O Vite repassa `/api` e `/ws` para o backend na porta 8000.

**Para usar como no robô** (um servidor só):

```bash
cd frontend
npm run build
```

Agora o backend serve tudo em **http://localhost:8000** e **http://localhost:8000/face**.
Reinicie o backend depois do primeiro build.

### Login de admin

O painel inteiro fica atrás de uma tela de login (o rosto em `/face` continua livre, para o
modo quiosque). Enquanto a senha for a padrão, a **tela de login mostra o usuário e a senha**
provisórios; ao trocar a senha esse aviso some sozinho.

Usuário padrão: `admin` (`ADMIN_USER`). Senha padrão: `ram-admin`. **Troque** em `backend/.env` (`ADMIN_PASSWORD=...`) antes de levar
o robô para qualquer lugar. Sem login dá para editar à vontade e ver tudo na prévia; para enviar ao
robô (e salvar presets, expressões e fala), entre com a senha no topo da tela ou no cartão
“Enviar pra RAM”.

### Testar pelo celular

Com o celular na mesma rede Wi-Fi, abra `http://IP-DO-PC:8000` (o IP aparece no log do
backend ao iniciar). O QR code no canto do `/face` aponta para esse endereço. Se o firewall do
Windows perguntar, permita o Python em redes privadas.

---

## Instalar no computador da cabeça

O código roda igual em **Raspberry Pi OS**, **Linux** (mini PC) e **Windows**. Todo o hardware
(motores, sensores, LEDs) fica no ESP32, ligado por USB; o computador só conversa por serial.

### Linux (Raspberry Pi OS 64-bit ou mini PC)

```bash
sudo apt update
sudo apt install -y git python3-venv curl chromium   # no Pi OS antigo: chromium-browser
# Node 20+ só é necessário se for buildar o frontend no próprio robô.
# Alternativa mais leve: rode "npm run build" no PC e copie a pasta frontend/dist.

git clone https://github.com/joaogabriel365/RAM.git ~/ram-robo
cd ~/ram-robo/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
nano .env        # MOCK_ROBOT=false, SERIAL_PORT=/dev/ttyUSB0, ADMIN_PASSWORD=...

# permissão para usar a porta serial (precisa sair e entrar de novo na sessão)
sudo usermod -aG dialout $USER
```

Para descobrir a porta do ESP32: `ls /dev/ttyUSB* /dev/ttyACM*` com ele conectado.

**Backend iniciando sozinho (systemd):**

```bash
sudo cp ~/ram-robo/deploy/ram.service /etc/systemd/system/
sudo nano /etc/systemd/system/ram.service   # ajuste User= e os caminhos
sudo systemctl daemon-reload
sudo systemctl enable --now ram
journalctl -u ram -f                         # ver o log
```

### Windows (mini PC)

1. Instale Python 3.11+ (marque "Add to PATH") e siga os passos de "Rodar no PC".
2. Em `backend\.env`: `MOCK_ROBOT=false` e `SERIAL_PORT=COM3` (veja a porta no Gerenciador de
   Dispositivos → Portas COM).
3. Rode `npm run build` em `frontend` (ou copie a `dist` de outro PC).
4. Pressione `Win + R`, digite `shell:startup` e crie ali um atalho para
   `deploy\ram-windows.bat`. Ele sobe o backend e abre o rosto em quiosque no Edge.

---

## Rosto em modo quiosque na inicialização

O script `deploy/ram-kiosk.sh` espera o backend responder e abre o Chromium em tela cheia
em `http://localhost:8000/face`.

```bash
chmod +x ~/ram-robo/deploy/ram-kiosk.sh
```

Depois, registre o script no autostart da sua sessão gráfica:

- **Raspberry Pi OS Bookworm (Wayland / labwc)**: adicione esta linha em `~/.config/labwc/autostart`:
  ```
  /home/ram/ram-robo/deploy/ram-kiosk.sh &
  ```
- **Raspberry Pi OS com X11 (LXDE)**: adicione em `~/.config/lxsession/LXDE-pi/autostart`:
  ```
  @/home/ram/ram-robo/deploy/ram-kiosk.sh
  ```
- **Outras distros (GNOME, XFCE...)**: crie `~/.config/autostart/ram-face.desktop`:
  ```ini
  [Desktop Entry]
  Type=Application
  Name=RAM Rosto
  Exec=/home/ram/ram-robo/deploy/ram-kiosk.sh
  ```

Configure também o login automático do usuário e desative o protetor de tela / desligamento
da tela (no Pi: `sudo raspi-config` → Display Options → Screen Blanking → Não). A página
`/face` também pede ao navegador para manter a tela acesa e esconde o cursor.

Para sair do quiosque: `Alt + F4`.

---

## Protocolo serial com o ESP32

- USB serial, **115200 baud** (configurável em `SERIAL_BAUD`).
- Uma mensagem **JSON por linha**, terminada em `\n`, nos dois sentidos.
- O backend reconecta sozinho se o cabo sair (tenta a cada 2 s).
- Ao conectar, o backend envia logo a configuração atual dos LEDs.

### Computador → ESP32

| Comando | Exemplo | Significado |
|---|---|---|
| `move` | `{"cmd":"move","x":0.5,"y":1.0}` | `x` = giro (−1 esquerda … 1 direita), `y` = frente/trás (−1 … 1) |
| `stop` | `{"cmd":"stop"}` | para os motores na hora |
| `led` | `{"cmd":"led","color":"#B026FF","effect":"breathe","brightness":0.8,"speed":1.0}` | `effect`: `solid`, `breathe`, `rainbow`, `blink`; `brightness` 0–1; `speed` 0.25–3 (multiplicador da animação) |

> **Segurança:** na etapa 3 o backend envia `stop` se ficar 500 ms sem comando do joystick.
> Recomendamos que o firmware do ESP32 **também** pare os motores sozinho se ficar ~500 ms
> sem receber `move` (por exemplo, se o cabo USB soltar).

### ESP32 → computador (telemetria)

```json
{"bat":7.8,"dist":{"f":42,"l":80,"r":120}}
```

- `bat`: tensão da bateria em volts.
- `dist`: distâncias dos sensores em cm (`f` frente, `l` esquerda, `r` direita).
- Envie umas 2 a 10 vezes por segundo. Linhas que não forem JSON são ignoradas (dá para
  deixar `Serial.println` de debug).

Esboço do lado do ESP32 (Arduino + [ArduinoJson](https://arduinojson.org)):

```cpp
#include <ArduinoJson.h>

unsigned long lastMove = 0;

void setup() { Serial.begin(115200); }

void loop() {
  if (Serial.available()) {
    JsonDocument doc;
    if (!deserializeJson(doc, Serial)) {
      const char* cmd = doc["cmd"];
      if (strcmp(cmd, "move") == 0) { drive(doc["x"], doc["y"]); lastMove = millis(); }
      else if (strcmp(cmd, "stop") == 0) { drive(0, 0); }
      else if (strcmp(cmd, "led") == 0) { setLeds(doc["color"], doc["effect"]); }
    }
  }
  if (millis() - lastMove > 500) drive(0, 0);   // watchdog local

  static unsigned long lastTel = 0;
  if (millis() - lastTel > 200) {
    lastTel = millis();
    JsonDocument t;
    t["bat"] = readBattery();
    t["dist"]["f"] = readDistance(FRONT);
    t["dist"]["l"] = readDistance(LEFT);
    t["dist"]["r"] = readDistance(RIGHT);
    serializeJson(t, Serial);
    Serial.println();
  }
}
```

---

## Referência rápida da API

Rotas marcadas com 🔒 exigem `Authorization: Bearer <token>` (obtido em `/api/auth/login`).
A documentação interativa fica em **http://localhost:8000/docs**.

| Método | Rota | O que faz |
|---|---|---|
| POST | `/api/auth/login` | `{"password"}` → `{"token","expiresAt"}` |
| GET | `/api/auth/me` | `{"admin": true/false}` |
| GET | `/api/info` | versão, modo mock, URL do painel |
| GET | `/api/face` | estado atual do rosto (`FaceState`) |
| PUT 🔒 | `/api/face/appearance` | troca a aparência inteira |
| POST 🔒 | `/api/face/expression` | `{"expression","holdMs"?}`; com `holdMs` volta sozinho |
| POST 🔒 | `/api/face/say` | `{"text"}` mostra no balão de fala |
| DELETE 🔒 | `/api/face/say` | limpa o balão |
| GET | `/api/presets` | lista os presets |
| POST 🔒 | `/api/presets` | cria preset |
| PATCH/DELETE 🔒 | `/api/presets/{id}` | renomeia ou sobrescreve / exclui (os de fábrica são protegidos) |
| POST 🔒 | `/api/presets/{id}/apply` | aplica o preset no robô |
| POST | `/api/games/start` | `{"game": "velha" \| "ppt"}`: a RAM convida para jogar |
| POST | `/api/games/velha` | `{"board": [9 casas ""/"X"/"O"], "level"}` → jogada da RAM (O) e vencedor |
| POST | `/api/games/ppt` | `{"choice": "pedra" \| "papel" \| "tesoura"}` → jogada da RAM e resultado |
| GET | `/api/achados` | lista os achados e perdidos |
| POST/PATCH/DELETE 🔒 | `/api/achados[/{id}]` | registra / edita ou marca devolvido / exclui |

**WebSocket `/ws`**: o servidor manda `hello` (estado completo) ao conectar e depois `face`,
`telemetry` e `robot` a cada mudança. O cliente pode mandar `{"type":"ping"}` e
`{"type":"touch"}` (toque na tela do rosto, que acorda a RAM).

## Variáveis de ambiente (`backend/.env`)

| Variável | Padrão | Para quê |
|---|---|---|
| `MOCK_ROBOT` | `false` | `true` = robô simulado |
| `SERIAL_PORT` | `/dev/ttyUSB0` (Linux) / `COM3` (Windows) | porta do ESP32 |
| `SERIAL_BAUD` | `115200` | velocidade da serial |
| `ADMIN_USER` | `admin` | usuário do painel admin |
| `ADMIN_PASSWORD` | `ram-admin` | senha do painel admin |
| `HOST` / `PORT` | `0.0.0.0` / `8000` | onde o servidor escuta |
| `PUBLIC_URL` | (descobre o IP) | URL que o QR code do rosto mostra |
| `REST_MINUTES` | `5` | minutos sem interação até dormir (0 = nunca) |
| `DATA_DIR` | `backend/data` | onde fica o `ram.db` (SQLite) |
| `SECRET_KEY` | (gerada e salva no banco) | assina os tokens de login |

## Logo

`frontend/public/logo-ram.svg` é um **logo provisório**. Substitua pelo SVG oficial com o
mesmo nome; o brilho neon roxo é aplicado por CSS (classe `.logo-glow`).

## Licença

MIT — veja [LICENSE](LICENSE).
