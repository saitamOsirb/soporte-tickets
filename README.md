
<div align="center">

# 🛠️ Sistema de Soporte Discord ⇄ GitHub

### 🎧 Atención al cliente profesional con tickets sincronizados en tiempo real

<img src="https://img.shields.io/badge/Discord-Bot-5865F2?style=for-the-badge&logo=discord&logoColor=white"/>
<img src="https://img.shields.io/badge/GitHub-Issues-181717?style=for-the-badge&logo=github"/>
<img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
<img src="https://img.shields.io/badge/Status-Production--Ready-brightgreen?style=for-the-badge"/>

</div>

---

## 📌 ¿Qué es este proyecto?

Este proyecto es un **sistema de soporte técnico profesional** que conecta **Discord** con **GitHub Issues**.

👉 Permite que tus clientes reporten problemas desde Discord y que tu equipo técnico los gestione directamente desde GitHub, **sin perder comunicación entre ambas plataformas**.

---

## 🎯 Objetivo principal

- Centralizar soporte en Discord
- Gestionar tickets en GitHub
- Mantener comunicación clara cliente ⇄ soporte
- Evitar confusión entre problemas
- Escalar soporte de forma ordenada

---

## ✨ Características principales

### 🧵 Hilos de soporte inteligentes
- Cada cliente obtiene su propio hilo.
- Un hilo = un ticket.
- Evita mezclar problemas.

### 📝 Creación automática de tickets
- El comando `/ticket` crea un Issue en GitHub.
- Incluye:
  - Descripción del problema
  - Mensaje del cliente
  - Evidencias (imágenes)

### 🔄 Comunicación bidireccional REAL
| Origen | Destino | Resultado |
|------|--------|-----------|
| Cliente (Discord) | GitHub | Comentario `[CLIENTE] Usuario#Tag` |
| Equipo (GitHub) | Discord | 🛠️ Equipo de soporte |
| Cierre / reapertura | Discord | Notificación automática |

### 🖼️ Evidencias visuales
- Soporta `.png`, `.jpg`, `.jpeg`
- Imágenes visibles directamente en GitHub

### 🔒 Reglas de seguridad
- 1 ticket por hilo
- Evita bucles Discord ⇄ GitHub
- Tokens protegidos por `.env`

---

## 🧭 Flujo completo del sistema

```
👤 Cliente (Discord)
        |
        v
🧵 /soporte → Hilo privado
        |
        v
📝 /ticket → Issue GitHub
        |
        v
💬 Comentarios bidireccionales
        |
        v
✅ Resolución del ticket
```

---

## 🧩 Tecnologías utilizadas

- Node.js
- Discord.js
- GitHub REST API
- Express.js (Webhooks)
- LocalTunnel / Ngrok
- JSON local (persistencia ligera)

---

## ⚙️ Instalación paso a paso

### 1️⃣ Clonar repositorio
```bash
git clone https://github.com/tu-usuario/tu-repo.git
cd tu-repo
```

### 2️⃣ Instalar dependencias
```bash
npm install
```

### 3️⃣ Crear archivo `.env`
```env
DISCORD_TOKEN=TU_TOKEN_DISCORD
GITHUB_TOKEN=TU_TOKEN_GITHUB
GITHUB_REPO=usuario/repositorio
ID_CANAL_SOPORTE=123456789
GUILD_ID=123456789
PORT=3000
```

### 4️⃣ Crear base de datos local
```bash
echo [] > tickets.json
```

---

## 🌐 Webhook GitHub (MUY IMPORTANTE)

GitHub **NO puede conectarse a localhost**.

Necesitas una **URL pública HTTPS**.

### ✅ Opción recomendada (gratis)
```bash
npx localtunnel --port 3000
```

Obtendrás algo como:
```
https://ejemplo.loca.lt
```

### Configura el webhook en GitHub

Repositorio → Settings → Webhooks → Add Webhook

| Campo | Valor |
|-----|------|
| Payload URL | https://ejemplo.loca.lt/github-webhook |
| Content type | application/json |
| Events | Issues, Issue comments |

---

## 🎮 Comandos disponibles

| Comando | Acción |
|------|-------|
| `/soporte` | Crear hilo de soporte |
| `/ticket` | Crear Issue GitHub |
| `/mistickets` | Ver tus tickets |
| `/ticketinfo` | Detalle del ticket |

---

## 🧑‍💻 Ejemplo real

### Cliente escribe en Discord
```
[CLIENTE] Juan#1234
La app se congela al iniciar sesión
```

### Equipo responde en GitHub
```
🛠️ Equipo de soporte ha respondido:
Estamos trabajando en una solución.
```

---

## 🚀 Producción (RECOMENDADO)

Para uso real y continuo:

✔ VPS (Oracle Free Tier, DigitalOcean)  
✔ HTTPS estable  
✔ PM2 para mantener el bot activo  

---

## 🧯 Solución de problemas

### ❌ GitHub no envía mensajes a Discord
- ¿Estás usando localhost? ❌
- Usa LocalTunnel o Ngrok ✅
- Revisa "Recent Deliveries" en GitHub

### ❌ No llegan imágenes
- Verifica formato (.png, .jpg)
- Verifica permisos del bot

---

## 📄 Licencia

MIT License

---

<div align="center">

### 💙 Diseñado para escalar soporte sin fricción

</div>
