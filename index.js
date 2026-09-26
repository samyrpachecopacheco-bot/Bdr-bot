const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const FILE = "./advs.json";

if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
}

function carregarAdvs() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function salvarAdvs(advs) {
  fs.writeFileSync(FILE, JSON.stringify(advs, null, 2));
}

// --------------------------------------------------
// CARGOS
// --------------------------------------------------

const NOMES_CARGOS = {
  1: "⚠️ ADV 1",
  2: "⚠️ ADV 2",
  3: "⚠️ ADV 3",
  4: "⚠️ ADV 4"
};

async function pegarOuCriarCargo(guild, nivel) {
  const nome = NOMES_CARGOS[nivel];

  let cargo = guild.roles.cache.find(r => r.name === nome);

  if (!cargo) {
    cargo = await guild.roles.create({
      name: nome,
      reason: "Sistema de advertências da BDR"
    });

    console.log(`Cargo criado: ${nome}`);
  }

  return cargo;
}

async function aplicarCargo(guild, member, nivel) {
  // Remove cargos anteriores
  for (let i = 1; i <= 4; i++) {
    const cargo = guild.roles.cache.find(
      r => r.name === NOMES_CARGOS[i]
    );

    if (cargo && member.roles.cache.has(cargo.id)) {
      await member.roles.remove(cargo).catch(() => {});
    }
  }

  const novoCargo = await pegarOuCriarCargo(guild, nivel);

  await member.roles.add(novoCargo).catch(error => {
    console.log("Erro ao adicionar cargo:", error.message);
  });

  return novoCargo;
}

// --------------------------------------------------
// COMANDOS
// --------------------------------------------------

const commands = [
  new SlashCommandBuilder()
    .setName("adv")
    .setDescription("Aplica uma advertência a um membro.")
    .addUserOption(option =>
      option
        .setName("membro")
        .setDescription("Membro que receberá a advertência.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("motivo")
        .setDescription("Motivo da advertência.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("advlist")
    .setDescription("Mostra todas as advertências de um membro.")
    .addUserOption(option =>
      option
        .setName("membro")
        .setDescription("Membro.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("advremove")
    .setDescription("Remove uma advertência específica.")
    .addUserOption(option =>
      option
        .setName("membro")
        .setDescription("Membro.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("id")
        .setDescription("ID da advertência.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("advs")
    .setDescription("Lista as advertências recentes do servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON()
];

// --------------------------------------------------
// REGISTRAR COMANDOS
// --------------------------------------------------

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("Registrando comandos...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("Comandos registrados!");
  } catch (error) {
    console.error("Erro ao registrar comandos:", error);
  }
})();

// --------------------------------------------------
// BOT ONLINE
// --------------------------------------------------

client.once("ready", async () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  const guild = client.guilds.cache.get(GUILD_ID);

  if (!guild) {
    console.log("Servidor não encontrado.");
    return;
  }

  // Cria os cargos automaticamente
  for (let i = 1; i <= 4; i++) {
    await pegarOuCriarCargo(guild, i).catch(error => {
      console.log(`Erro no cargo ADV ${i}:`, error.message);
    });
  }

  console.log("Sistema de advertências carregado!");
});

// --------------------------------------------------
// INTERAÇÕES
// --------------------------------------------------

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const advs = carregarAdvs();

  // ==================================================
  // /ADV
  // ==================================================

  if (interaction.commandName === "adv") {
    const membro = interaction.options.getMember("membro");
    const usuario = interaction.options.getUser("membro");
    const motivo = interaction.options.getString("motivo");

    if (!membro || !usuario) {
      return interaction.reply({
        content: "❌ Não consegui encontrar esse membro.",
        ephemeral: true
      });
    }

    if (usuario.bot) {
      return interaction.reply({
        content: "❌ Bots não podem receber advertências.",
        ephemeral: true
      });
    }

    if (!advs[usuario.id]) {
      advs[usuario.id] = {
        total: 0,
        historico: []
      };
    }

    // Limite máximo de 4
    if (advs[usuario.id].total >= 4) {
      return interaction.reply({
        content: "❌ Esse membro já atingiu o limite de 4 advertências.",
        ephemeral: true
      });
    }

    advs[usuario.id].total++;

    const numero = advs[usuario.id].total;

    const id =
      `ADV-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;

    const advertencia = {
      id,
      numero,
      motivo,
      data: new Date().toISOString(),
      aplicador: interaction.user.id
    };

    advs[usuario.id].historico.push(advertencia);

    salvarAdvs(advs);

    // ----------------------------
    // ADV 1
    // ----------------------------

    if (numero === 1) {
      await aplicarCargo(interaction.guild, membro, 1);

      await interaction.reply({
        content:
          `⚠️ **ADVERTÊNCIA 1 APLICADA**\n\n` +
          `👤 **Membro:** ${usuario}\n` +
          `🆔 **ID:** \`${id}\`\n` +
          `📝 **Motivo:** ${motivo}\n\n` +
          `📌 Esta é apenas uma advertência formal.`
      });
    }

    // ----------------------------
    // ADV 2
    // ----------------------------

    if (numero === 2) {
      await aplicarCargo(interaction.guild, membro, 2);

      await membro.timeout(
        60 * 60 * 1000,
        `Advertência 2 — ${motivo}`
      ).catch(error => {
        console.log("Erro ao aplicar mute:", error.message);
      });

      await interaction.reply({
        content:
          `🔶 **ADVERTÊNCIA 2 — PUNIÇÃO APLICADA**\n\n` +
          `👤 **Membro:** ${usuario}\n` +
          `🆔 **ID:** \`${id}\`\n` +
          `📝 **Motivo:** ${motivo}\n\n` +
          `🔇 **Mute:** 1 hora\n` +
          `⚠️ A próxima advertência resultará em punição ainda mais grave.`
      });

      setTimeout(async () => {
        try {
          const membroAtualizado =
            await interaction.guild.members.fetch(usuario.id);

          const cargo = interaction.guild.roles.cache.find(
            r => r.name === NOMES_CARGOS[2]
          );

          if (cargo && membroAtualizado.roles.cache.has(cargo.id)) {
            await membroAtualizado.roles.remove(cargo);
          }
        } catch {}
      }, 60 * 60 * 1000);
    }

    // ----------------------------
    // ADV 3
    // ----------------------------

    if (numero === 3) {
      await aplicarCargo(interaction.guild, membro, 3);

      await membro.timeout(
        24 * 60 * 60 * 1000,
        `Advertência 3 — ${motivo}`
      ).catch(error => {
        console.log("Erro ao aplicar mute:", error.message);
      });

      await interaction.reply({
        content:
          `🔴 **ADVERTÊNCIA 3 — PUNIÇÃO GRAVE**\n\n` +
          `👤 **Membro:** ${usuario}\n` +
          `🆔 **ID:** \`${id}\`\n` +
          `📝 **Motivo:** ${motivo}\n\n` +
          `🔇 **Mute:** 1 dia\n` +
          `🚨 A próxima advertência resultará em expulsão.`
      });

      setTimeout(async () => {
        try {
          const membroAtualizado =
            await interaction.guild.members.fetch(usuario.id);

          const cargo = interaction.guild.roles.cache.find(
            r => r.name === NOMES_CARGOS[3]
          );

          if (cargo && membroAtualizado.roles.cache.has(cargo.id)) {
            await membroAtualizado.roles.remove(cargo);
          }
        } catch {}
      }, 24 * 60 * 60 * 1000);
    }

    // ----------------------------
    // ADV 4
    // ----------------------------

    if (numero === 4) {
      await aplicarCargo(interaction.guild, membro, 4);

      await interaction.reply({
        content:
          `🚨 **ADVERTÊNCIA 4 — EXPULSÃO**\n\n` +
          `👤 **Membro:** ${usuario}\n` +
          `🆔 **ID:** \`${id}\`\n` +
          `📝 **Motivo:** ${motivo}\n\n` +
          `⛔ O membro atingiu a 4ª advertência e será expulso da BDR.`
      });

      setTimeout(async () => {
        try {
          await membro.kick(
            `4ª advertência — ${motivo}`
          );
        } catch (error) {
          console.log("Erro ao expulsar:", error.message);
        }
      }, 1500);
    }

    // DM
    try {
      await usuario.send(
        `⚠️ **Você recebeu uma advertência na BDR.**\n\n` +
        `📋 **Advertência:** ${numero}/4\n` +
        `🆔 **ID:** ${id}\n` +
        `📝 **Motivo:** ${motivo}`
      );
    } catch {
      console.log("Não foi possível enviar DM.");
    }
  }

  // ==================================================
  // /ADVLIST
  // ==================================================

  if (interaction.commandName === "advlist") {
    const usuario = interaction.options.getUser("membro");

    if (!advs[usuario.id] || advs[usuario.id].historico.length === 0) {
      return interaction.reply({
        content: `📋 **${usuario.username}** não possui advertências registradas.`,
        ephemeral: true
      });
    }

    const historico = advs[usuario.id].historico;

    let texto =
      `📋 **HISTÓRICO DE ADVERTÊNCIAS**\n` +
      `👤 ${usuario}\n` +
      `📊 Total: **${advs[usuario.id].total}**\n\n`;

    for (const adv of historico) {
      const data = new Date(adv.data).toLocaleString("pt-BR");

      texto +=
        `**ADV ${adv.numero}**\n` +
        `🆔 \`${adv.id}\`\n` +
        `📝 ${adv.motivo}\n` +
        `📅 ${data}\n` +
        `👮 <@${adv.aplicador}>\n\n`;
    }

    await interaction.reply({
      content: texto,
      ephemeral: false
    });
  }

  // ==================================================
  // /ADVREMOVE
  // ==================================================

  if (interaction.commandName === "advremove") {
    const usuario = interaction.options.getUser("membro");
    const id = interaction.options.getString("id");

    if (!advs[usuario.id] || !advs[usuario.id].historico.length) {
      return interaction.reply({
        content: "❌ Esse membro não possui advertências.",
        ephemeral: true
      });
    }

    const indice = advs[usuario.id].historico.findIndex(
      adv => adv.id === id
    );

    if (indice === -1) {
      return interaction.reply({
        content: `❌ Não encontrei a advertência com o ID \`${id}\`.`,
        ephemeral: true
      });
    }

    const removida = advs[usuario.id].historico[indice];

    advs[usuario.id].historico.splice(indice, 1);

    advs[usuario.id].total = advs[usuario.id].historico.length;

    salvarAdvs(advs);

    await interaction.reply({
      content:
        `✅ **ADVERTÊNCIA REMOVIDA**\n\n` +
        `👤 **Membro:** ${usuario}\n` +
        `🆔 **ID:** \`${removida.id}\`\n` +
        `📋 **ADV:** ${removida.numero}\n` +
        `📝 **Motivo:** ${removida.motivo}\n\n` +
        `📊 O total agora é **${advs[usuario.id].total}** advertência(s).`
    });
  }

  // ==================================================
  // /ADVS
  // ==================================================

  if (interaction.commandName === "advs") {
    const todas = [];

    for (const [userId, dados] of Object.entries(advs)) {
      for (const adv of dados.historico) {
        todas.push({
          userId,
          ...adv
        });
      }
    }

    todas.sort(
      (a, b) => new Date(b.data) - new Date(a.data)
    );

    const recentes = todas.slice(0, 10);

    if (recentes.length === 0) {
      return interaction.reply({
        content: "📋 Nenhuma advertência registrada no servidor.",
        ephemeral: true
      });
    }

    let texto = `📋 **ADVERTÊNCIAS RECENTES — BDR**\n\n`;

    for (const adv of recentes) {
      const data = new Date(adv.data).toLocaleString("pt-BR");

      texto +=
        `**ADV ${adv.numero}** — <@${adv.userId}>\n` +
        `🆔 \`${adv.id}\`\n` +
        `📝 ${adv.motivo}\n` +
        `📅 ${data}\n\n`;
    }

    await interaction.reply({
      content: texto
    });
  }
});

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

client.login(TOKEN);
