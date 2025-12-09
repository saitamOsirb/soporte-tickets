require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType
} = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const express = require("express");

// =========================
// Variables de entorno
// =========================
const TOKEN = process.env.DISCORD_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const CANAL_SOPORTE_ID = process.env.ID_CANAL_SOPORTE;
const GUILD_ID = process.env.GUILD_ID;
const PORT = process.env.PORT || 3000;

// =========================
// Base de datos tickets
// =========================
let tickets = [];
if (fs.existsSync("tickets.json")) {
  tickets = JSON.parse(fs.readFileSync("tickets.json", "utf8"));
}
function saveTickets() {
  fs.writeFileSync("tickets.json", JSON.stringify(tickets, null, 2));
}

// =========================
// Bot de Discord
// =========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// =========================
// Registrar comandos
// =========================
async function registrarComandosGuild() {
  const commands = [
    new SlashCommandBuilder()
      .setName("soporte")
      .setDescription("Abre un nuevo hilo de soporte."),
    new SlashCommandBuilder()
      .setName("ticket")
      .setDescription("Crear el ÚNICO ticket de GitHub para este hilo.")
      .addStringOption(opt =>
        opt
          .setName("descripcion")
          .setDescription("Resumen del problema para el ticket (título del issue).")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("mistickets")
      .setDescription("Ver tus tickets creados."),
    new SlashCommandBuilder()
      .setName("ticketinfo")
      .setDescription("Ver detalles y comentarios de un ticket en GitHub.")
      .addIntegerOption(opt =>
        opt
          .setName("issue")
          .setDescription("Número del issue en GitHub.")
          .setRequired(true)
      )
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  console.log("🔄 Registrando comandos...");
  await rest.put(
    Routes.applicationGuildCommands(client.user.id, GUILD_ID),
    { body: commands }
  );
  console.log("✅ Comandos registrados.");
}

// =========================
// Bot listo
// =========================
client.once("ready", async () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
  await registrarComandosGuild();
});

// =========================
// Manejo de comandos
// =========================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "soporte") return manejarSoporte(interaction);
  if (interaction.commandName === "ticket") return manejarTicket(interaction);
  if (interaction.commandName === "mistickets") return manejarMisTickets(interaction);
  if (interaction.commandName === "ticketinfo") return manejarTicketInfo(interaction);
});

// =========================
// /soporte - crear hilo
// =========================
async function manejarSoporte(interaction) {
  const user = interaction.user;
  let canal = await client.channels.fetch(CANAL_SOPORTE_ID);

  if (!canal || canal.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: "Error: No encuentro el canal de soporte configurado.",
      ephemeral: true
    });
  }

  const base = await canal.send(`🎧 Soporte para <@${user.id}>`);
  const hilo = await base.startThread({
    name: `soporte-${user.username}`,
    autoArchiveDuration: 1440
  });

  tickets.push({
    tipo: "soporte",
    user_id: user.id,
    hilo_id: hilo.id
  });
  saveTickets();

  await hilo.send(
    `Hola <@${user.id}> 👋\n\n` +
    `Bienvenido a tu canal de soporte.\n\n` +
    `**Reglas:**\n` +
    `• Solo puedes crear **1 ticket por hilo**.\n` +
    `• Para reportar un nuevo problema, ejecuta **/soporte** para crear un hilo nuevo.\n\n` +
    `**Cómo crear tu ticket:**\n` +
    `1️⃣ Escribe un mensaje explicando el problema (puedes adjuntar imágenes).\n` +
    `2️⃣ Luego ejecuta **/ticket** con un resumen.\n\n` +
    `Después de crear el ticket:\n` +
    `📩 **Todo mensaje que escribas aquí será enviado a GitHub como comentario**, marcado como *[CLIENTE] Nombre#tag*.\n` +
    `🛠️ **Las respuestas de los desarrolladores aparecerán aquí marcadas como “Equipo de soporte”.**`
  );

  return interaction.reply({
    content: `Hilo creado: <#${hilo.id}>`,
    ephemeral: true
  });
}

// =========================
// /ticket - crear el issue único por hilo
// =========================
async function manejarTicket(interaction) {
  const descripcion = interaction.options.getString("descripcion");
  const canal = interaction.channel;

  if (!canal.isThread()) {
    return interaction.reply({
      content: "Este comando solo funciona dentro de un hilo de soporte.",
      ephemeral: true
    });
  }

  const hiloSoporte = tickets.find(
    t => t.tipo === "soporte" && t.hilo_id === canal.id
  );
  if (!hiloSoporte) {
    return interaction.reply({
      content: "Este hilo no está registrado como soporte.",
      ephemeral: true
    });
  }

  const ticketExistente = tickets.find(
    t => t.tipo === "ticket" && t.hilo_id === canal.id
  );
  if (ticketExistente) {
    return interaction.reply({
      content: `Este hilo ya tiene un ticket: Issue #${ticketExistente.issue}`,
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  // Buscar último mensaje del usuario
  const mensajes = await canal.messages.fetch({ limit: 50 });
  const msgUsuario = mensajes
    .filter(m => !m.author.bot && m.author.id === interaction.user.id)
    .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
    .first();

  let contexto = msgUsuario?.content || "_(sin texto)_";
  let evidencias = "";

  msgUsuario?.attachments?.forEach(att => {
    const name = (att.name || "").toLowerCase();
    const isImage =
      name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png");
    if (isImage) evidencias += `![${att.name}](${att.url})\n`;
  });

  if (!evidencias) evidencias = "_Sin imágenes adjuntas_";

  const titulo = descripcion.slice(0, 80);

  const body =
    `**[CLIENTE] ${interaction.user.tag} ha creado este ticket:**\n\n` +
    `**Resumen:** ${descripcion}\n\n` +
    `**Mensaje del cliente:**\n${contexto}\n\n` +
    `**Evidencias:**\n${evidencias}`;

  const res = await axios.post(
    `https://api.github.com/repos/${GITHUB_REPO}/issues`,
    { title: titulo, body },
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "discord-bot"
      }
    }
  );

  const issueNum = res.data.number;
  const issueURL = res.data.html_url;

  tickets.push({
    tipo: "ticket",
    user_id: interaction.user.id,
    hilo_id: canal.id,
    issue: issueNum,
    estado: "open"
  });
  saveTickets();

  await canal.send(
    `📝 Ticket creado correctamente.\n` +
    `**Issue #${issueNum}**\n${issueURL}\n\n` +
    `A partir de ahora:\n` +
    `💬 Todo mensaje que envíes será un comentario en GitHub marcado como *[CLIENTE]*.`
  );

  return interaction.editReply("Ticket creado con éxito.");
}

// =========================
// /mistickets - listar tickets del usuario
// =========================
async function manejarMisTickets(interaction) {
  const lista = tickets.filter(
    t => t.tipo === "ticket" && t.user_id === interaction.user.id
  );

  if (lista.length === 0) {
    return interaction.reply({
      content: "No tienes tickets.",
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  let texto = "📋 **Tus tickets:**\n\n";

  for (const t of lista.slice(0, 10)) {
    texto += `• **#${t.issue}** | Estado: ${t.estado} | Hilo: <#${t.hilo_id}>\n`;
  }

  return interaction.editReply(texto);
}

// =========================
// /ticketinfo - ver detalles del issue
// =========================
async function manejarTicketInfo(interaction) {
  const issueNum = interaction.options.getInteger("issue");

  await interaction.deferReply({ ephemeral: true });

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    "User-Agent": "discord-bot"
  };

  try {
    const issueRes = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNum}`,
      { headers }
    );

    const issue = issueRes.data;

    let descripcion = issue.body || "(sin descripción)";
    if (descripcion.length > 700) descripcion = descripcion.slice(0, 700) + "…";

    const commentsRes = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNum}/comments`,
      { headers }
    );
    const comments = commentsRes.data;

    let comentarios = comments
      .map(
        c =>
          `**@${c.user.login}**:\n${c.body.slice(0, 300)}\n`
      )
      .join("\n");

    if (!comentarios) comentarios = "_Sin comentarios_";

    const msg =
      `📌 **Issue #${issue.number} – ${issue.title}**\n` +
      `Estado: **${issue.state.toUpperCase()}**\n` +
      `────────────────────\n` +
      `📝 **Descripción:**\n${descripcion}\n\n` +
      `💬 **Comentarios:**\n${comentarios}`;

    return interaction.editReply(msg);
  } catch (e) {
    console.error(e);
    return interaction.editReply("Error obteniendo información del ticket.");
  }
}

// =========================
// Discord → GitHub: comentarios
// =========================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (!msg.channel.isThread()) return;

  const ticket = tickets.find(
    t => t.tipo === "ticket" && t.hilo_id === msg.channel.id
  );
  if (!ticket) return;

  const issue = ticket.issue;

  let body = `**[CLIENTE] ${msg.author.tag}**\n\n`;
  body += `${msg.content || "_(sin texto)_"}`;

  if (msg.attachments.size > 0) {
    body += `\n\n**Adjuntos:**\n`;
    msg.attachments.forEach(att => {
      body += `![${att.name}](${att.url})\n`;
    });
  }

  try {
    await axios.post(
      `https://api.github.com/repos/${GITHUB_REPO}/issues/${issue}/comments`,
      { body },
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "User-Agent": "discord-bot"
        }
      }
    );
  } catch (e) {
    console.error("Error enviando comentario:", e);
  }
});

// =========================
// GitHub → Discord Webhook
// =========================
const app = express();
app.use(express.json());

app.post("/github-webhook", async (req, res) => {
  const event = req.headers["x-github-event"];
  const payload = req.body;

  if (event === "issue_comment") {
    const issue = payload.issue.number;
    const c = payload.comment;
    let body = c.body;

    if (body.startsWith("**[CLIENTE]")) {
      return res.send("Ignorado (viene de Discord)");
    }

    const ticket = tickets.find(t => t.issue === issue);
    if (!ticket) return res.send("Sin ticket asociado");

    let msg =
      `🛠️ **Equipo de soporte ha respondido:**\n\n` +
      `${body}\n\n` +
      `_(GitHub: @${c.user.login})_`;

    const canal = await client.channels.fetch(ticket.hilo_id);
    await canal.send(msg);

    return res.send("OK");
  }

  if (event === "issues") {
    const action = payload.action;
    const issueNum = payload.issue.number;

    const ticket = tickets.find(t => t.issue === issueNum);
    if (!ticket) return res.send("Sin ticket");

    ticket.estado = payload.issue.state;
    saveTickets();

    const canal = await client.channels.fetch(ticket.hilo_id);

    if (action === "closed") {
      await canal.send(`✅ El equipo de soporte ha **cerrado** este ticket.`);
    }
    if (action === "reopened") {
      await canal.send(`♻️ El ticket ha sido **reabierto**.`);
    }

    return res.send("OK");
  }

  res.send("OK");
});

app.listen(PORT, () => console.log(`🌐 Webhook activo en puerto ${PORT}`));

// =========================
// Iniciar bot
// =========================
client.login(TOKEN);
