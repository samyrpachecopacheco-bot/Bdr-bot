const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const ADV_FILE = "./advs.json";
const CHAVES_FILE = "./chaves.json";

// ======================================================
// ARQUIVOS
// ======================================================

if (!fs.existsSync(ADV_FILE)) {
  fs.writeFileSync(ADV_FILE, JSON.stringify({}, null, 2));
}

if (!fs.existsSync(CHAVES_FILE)) {
  fs.writeFileSync(
    CHAVES_FILE,
    JSON.stringify(
      {
        mesAtual: null,
        proximaChave: 1,
        chaves: [],
        ranking: {},
        historicoMeses: []
      },
      null,
      2
    )
  );
}

function carregarAdvs() {
  try {
    return JSON.parse(fs.readFileSync(ADV_FILE, "utf8"));
  } catch {
    return {};
  }
}

function salvarAdvs(dados) {
  fs.writeFileSync(ADV_FILE, JSON.stringify(dados, null, 2));
}

function carregarChaves() {
  try {
    return JSON.parse(fs.readFileSync(CHAVES_FILE, "utf8"));
  } catch {
    return {
      mesAtual: null,
      proximaChave: 1,
      chaves: [],
      ranking: {},
      historicoMeses: []
    };
  }
}

function salvarChaves(dados) {
  fs.writeFileSync(CHAVES_FILE, JSON.stringify(dados, null, 2));
}

// ======================================================
// SISTEMA DE MÊS
// ======================================================

function mesAtual() {
  const agora = new Date();

  return `${agora.getFullYear()}-${String(
    agora.getMonth() + 1
  ).padStart(2, "0")}`;
}

function nomeMes(mes) {
  const [ano, numero] = mes.split("-");

  const nomes = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
  ];

  return `${nomes[Number(numero) - 1]}/${ano}`;
}

function garantirMesAtual() {
  const dados = carregarChaves();
  const mes = mesAtual();

  if (!dados.mesAtual) {
    dados.mesAtual = mes;
    salvarChaves(dados);
    return dados;
  }

  if (dados.mesAtual !== mes) {
    if (Object.keys(dados.ranking).length > 0) {
      dados.historicoMeses.push({
        mes: dados.mesAtual,
        ranking: dados.ranking,
        chaves: dados.chaves.filter(
          chave => chave.mes === dados.mesAtual
        )
      });
    }

    dados.mesAtual = mes;
    dados.ranking = {};

    salvarChaves(dados);
  }

  return dados;
}

// ======================================================
// CARGOS DAS ADVERTÊNCIAS
// ======================================================

const NOMES_CARGOS = {
  1: "⚠️ ADV 1",
  2: "⚠️ ADV 2",
  3: "⚠️ ADV 3",
  4: "⚠️ ADV 4"
};

async function pegarOuCriarCargo(guild, nivel) {
  const nome = NOMES_CARGOS[nivel];

  let cargo = guild.roles.cache.find(
    cargo => cargo.name === nome
  );

  if (!cargo) {
    cargo = await guild.roles.create({
      name: nome,
      reason: "Sistema de advertências da BDR"
    });
  }

  return cargo;
}

async function aplicarCargo(guild, member, nivel) {
  for (let i = 1; i <= 4; i++) {
    const cargo = guild.roles.cache.find(
      r => r.name === NOMES_CARGOS[i]
    );

    if (cargo && member.roles.cache.has(cargo.id)) {
      await member.roles.remove(cargo).catch(() => {});
    }
  }

  const novoCargo = await pegarOuCriarCargo(guild, nivel);

  await member.roles.add(novoCargo).catch(() => {});

  return novoCargo;
}

// ======================================================
// COMANDOS
// ======================================================

const commands = [

  // ---------------- ADV ----------------

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
    .setDescription("Remove uma advertência.")
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
    .setDescription("Lista as advertências recentes.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON(),

  // ---------------- CHAVES ----------------

  new SlashCommandBuilder()
    .setName("chavesbdr")
    .setDescription("Cria uma nova chave da BDR.")
    .addIntegerOption(option =>
      option
        .setName("tamanho")
        .setDescription("Quantidade de MCs.")
        .setRequired(true)
        .addChoices(
          { name: "Chave de 4", value: 4 },
          { name: "Chave de 8", value: 8 }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("rankingchaves")
    .setDescription("Mostra o ranking mensal das Chaves BDR.")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("editrankingchaves")
    .setDescription("Edita o resultado de uma Chave BDR.")
    .addIntegerOption(option =>
      option
        .setName("chave")
        .setDescription("Número da chave.")
        .setRequired(true)
        .setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("limparranking")
    .setDescription("Arquiva o ranking atual e inicia um novo.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON()
];

// ======================================================
// REGISTRAR COMANDOS
// ======================================================

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
    console.error(error);
  }
})();

// ======================================================
// BOT ONLINE
// ======================================================

client.once("ready", async () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  garantirMesAtual();

  const guild = client.guilds.cache.get(GUILD_ID);

  if (guild) {
    for (let i = 1; i <= 4; i++) {
      await pegarOuCriarCargo(guild, i).catch(() => {});
    }
  }

  console.log("Sistema BDR carregado!");
});

// ======================================================
// FUNÇÃO PARA PEGAR MENÇÕES
// ======================================================

function extrairIds(texto) {
  const ids = texto.match(/<@!?(\d+)>/g);

  if (!ids) return [];

  return ids.map(
    mencao => mencao.replace(/[<@!>]/g, "")
  );
}

// ======================================================
// CRIAR CONFRONTOS
// ======================================================

function criarConfrontos(participantes) {
  const embaralhados = [...participantes];

  for (let i = embaralhados.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [embaralhados[i], embaralhados[j]] =
      [embaralhados[j], embaralhados[i]];
  }

  const confrontos = [];

  for (let i = 0; i < embaralhados.length; i += 2) {
    confrontos.push({
      mc1: embaralhados[i],
      mc2: embaralhados[i + 1]
    });
  }

  return confrontos;
}

// ======================================================
// ATUALIZAR RANKING
// ======================================================

function recalcularRanking(dados, mes) {
  const ranking = {};

  const chaves = dados.chaves.filter(
    chave =>
      chave.mes === mes &&
      chave.encerrada &&
      chave.resultado
  );

  for (const chave of chaves) {
    const resultado = chave.resultado;

    const adicionar = (id, pontos) => {
      if (!id) return;

      if (!ranking[id]) {
        ranking[id] = {
          pontos: 0,
          chaves: 0
        };
      }

      ranking[id].pontos += pontos;
      ranking[id].chaves += 1;
    };

    adicionar(resultado.campeao, 5);
    adicionar(resultado.vice, 3);
    adicionar(resultado.passou1, 1);
    adicionar(resultado.passou2, 1);
  }

  dados.ranking = ranking;

  salvarChaves(dados);
}

// ======================================================
// INTERAÇÕES
// ======================================================

client.on("interactionCreate", async interaction => {

  // ====================================================
  // /ADV
  // ====================================================

  if (interaction.isChatInputCommand() &&
      interaction.commandName === "adv") {

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

    const advs = carregarAdvs();

    if (!advs[usuario.id]) {
      advs[usuario.id] = {
        total: 0,
        historico: []
      };
    }

    if (advs[usuario.id].total >= 4) {
      return interaction.reply({
        content: "❌ Esse membro já atingiu 4 advertências.",
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

    advs[usuario.id].historico.push({
      id,
      numero,
      motivo,
      data: new Date().toISOString(),
      aplicador: interaction.user.id
    });

    salvarAdvs(advs);

    if (numero === 1) {

      await aplicarCargo(interaction.guild, membro, 1);

      await interaction.reply({
        content:
          `⚠️ **ADVERTÊNCIA 1 APLICADA**\n\n` +
          `👤 **Membro:** ${usuario}\n` +
          `🆔 **ID:** \`${id}\`\n` +
          `📝 **Motivo:** ${motivo}\n\n` +
          `📌 Esta é uma advertência formal.`
      });

    } else if (numero === 2) {

      await aplicarCargo(interaction.guild, membro, 2);

      await membro.timeout(
        60 * 60 * 1000,
        `Advertência 2 — ${motivo}`
      ).catch(() => {});

      await interaction.reply({
        content:
          `🔶 **ADVERTÊNCIA 2 — PUNIÇÃO APLICADA**\n\n` +
          `👤 **Membro:** ${usuario}\n` +
          `🆔 **ID:** \`${id}\`\n` +
          `📝 **Motivo:** ${motivo}\n\n` +
          `🔇 **Mute:** 1 hora\n` +
          `⚠️ A próxima advertência será ainda mais grave.`
      });

      setTimeout(async () => {

        try {
          const atual =
            await interaction.guild.members.fetch(usuario.id);

          const cargo =
            interaction.guild.roles.cache.find(
              r => r.name === NOMES_CARGOS[2]
            );

          if (cargo) {
            await atual.roles.remove(cargo).catch(() => {});
          }

        } catch {}
      }, 60 * 60 * 1000);

    } else if (numero === 3) {

      await aplicarCargo(interaction.guild, membro, 3);

      await membro.timeout(
        24 * 60 * 60 * 1000,
        `Advertência 3 — ${motivo}`
      ).catch(() => {});

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
          const atual =
            await interaction.guild.members.fetch(usuario.id);

          const cargo =
            interaction.guild.roles.cache.find(
              r => r.name === NOMES_CARGOS[3]
            );

          if (cargo) {
            await atual.roles.remove(cargo).catch(() => {});
          }

        } catch {}
      }, 24 * 60 * 60 * 1000);

    } else if (numero === 4) {

      await aplicarCargo(interaction.guild, membro, 4);

      await interaction.reply({
        content:
          `🚨 **ADVERTÊNCIA 4 — EXPULSÃO**\n\n` +
          `👤 **Membro:** ${usuario}\n` +
          `🆔 **ID:** \`${id}\`\n` +
          `📝 **Motivo:** ${motivo}\n\n` +
          `⛔ O membro atingiu a 4ª advertência.`
      });

      setTimeout(async () => {
        await membro.kick(
          `4ª advertência — ${motivo}`
        ).catch(() => {});
      }, 1500);
    }

    try {
      await usuario.send(
        `⚠️ **Você recebeu uma advertência na BDR.**\n\n` +
        `📋 **Advertência:** ${numero}/4\n` +
        `🆔 **ID:** ${id}\n` +
        `📝 **Motivo:** ${motivo}`
      );
    } catch {}
  }

  // ====================================================
  // /ADVLIST
  // ====================================================

  if (interaction.isChatInputCommand() &&
      interaction.commandName === "advlist") {

    const usuario =
      interaction.options.getUser("membro");

    const advs = carregarAdvs();

    if (!advs[usuario.id] ||
        advs[usuario.id].historico.length === 0) {

      return interaction.reply({
        content:
          `📋 **${usuario.username}** não possui advertências.`,
        ephemeral: true
      });
    }

    let texto =
      `📋 **HISTÓRICO DE ADVERTÊNCIAS**\n` +
      `👤 ${usuario}\n` +
      `📊 Total: **${advs[usuario.id].total}**\n\n`;

    for (const adv of advs[usuario.id].historico) {

      texto +=
        `**ADV ${adv.numero}**\n` +
        `🆔 \`${adv.id}\`\n` +
        `📝 ${adv.motivo}\n` +
        `📅 ${new Date(adv.data).toLocaleString("pt-BR")}\n` +
        `👮 <@${adv.aplicador}>\n\n`;
    }

    return interaction.reply({
      content: texto
    });
  }

  // ====================================================
  // /ADVREMOVE
  // ====================================================

  if (interaction.isChatInputCommand() &&
      interaction.commandName === "advremove") {

    const usuario =
      interaction.options.getUser("membro");

    const id =
      interaction.options.getString("id");

    const advs = carregarAdvs();

    if (!advs[usuario.id]) {
      return interaction.reply({
        content: "❌ Esse membro não possui advertências.",
        ephemeral: true
      });
    }

    const indice =
      advs[usuario.id].historico.findIndex(
        adv => adv.id === id
      );

    if (indice === -1) {
      return interaction.reply({
        content:
          `❌ Advertência \`${id}\` não encontrada.`,
        ephemeral: true
      });
    }

    const removida =
      advs[usuario.id].historico[indice];

    advs[usuario.id].historico.splice(indice, 1);

    advs[usuario.id].total =
      advs[usuario.id].historico.length;

    salvarAdvs(advs);

    return interaction.reply({
      content:
        `✅ **ADVERTÊNCIA REMOVIDA**\n\n` +
        `👤 ${usuario}\n` +
        `🆔 \`${removida.id}\`\n` +
        `📝 ${removida.motivo}\n\n` +
        `📊 Total atual: **${advs[usuario.id].total}**`
    });
  }

  // ====================================================
  // /ADVS
  // ====================================================

  if (interaction.isChatInputCommand() &&
      interaction.commandName === "advs") {

    const advs = carregarAdvs();
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
      (a, b) =>
        new Date(b.data) - new Date(a.data)
    );

    const recentes = todas.slice(0, 10);

    if (recentes.length === 0) {
      return interaction.reply({
        content:
          "📋 Nenhuma advertência registrada."
      });
    }

    let texto =
      `📋 **ADVERTÊNCIAS RECENTES — BDR**\n\n`;

    for (const adv of recentes) {

      texto +=
        `**ADV ${adv.numero}** — <@${adv.userId}>\n` +
        `🆔 \`${adv.id}\`\n` +
        `📝 ${adv.motivo}\n` +
        `📅 ${new Date(adv.data).toLocaleString("pt-BR")}\n\n`;
    }

    return interaction.reply({
      content: texto
    });
  }

  // ====================================================
  // /CHAVESBDR
  // ====================================================

  if (interaction.isChatInputCommand() &&
      interaction.commandName === "chavesbdr") {

    const tamanho =
      interaction.options.getInteger("tamanho");

    const modal =
      new ModalBuilder()
        .setCustomId(`criar_chave_${tamanho}`)
        .setTitle(`Chave BDR de ${tamanho}`);

    const participantes =
      new TextInputBuilder()
        .setCustomId("participantes")
        .setLabel(`Coloque os ${tamanho} MCs`)
        .setPlaceholder("@MC1 @MC2 @MC3 ...")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(tamanho * 2);

    modal.addComponents(
      new ActionRowBuilder().addComponents(participantes)
    );

    return interaction.showModal(modal);
  }

  // ====================================================
  // MODAL — CRIAR CHAVE
  // ====================================================

  if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith("criar_chave_")
  ) {

    const tamanho =
      Number(
        interaction.customId.replace(
          "criar_chave_",
          ""
        )
      );

    const texto =
      interaction.fields.getTextInputValue(
        "participantes"
      );

    const ids = extrairIds(texto);

    if (ids.length !== tamanho) {
      return interaction.reply({
        content:
          `❌ Você colocou **${ids.length}** MCs, mas a chave precisa de **${tamanho}**.`,
        ephemeral: true
      });
    }

    if (new Set(ids).size !== ids.length) {
      return interaction.reply({
        content:
          "❌ Um MC foi colocado mais de uma vez.",
        ephemeral: true
      });
    }

    const dados = garantirMesAtual();

    const numero = dados.proximaChave;

    dados.proximaChave++;

    const confrontos =
      criarConfrontos(ids);

    const chave = {
      numero,
      mes: dados.mesAtual,
      tamanho,
      participantes: ids,
      confrontos,
      encerrada: false,
      resultado: null,
      criadaEm: new Date().toISOString()
    };

    dados.chaves.push(chave);

    salvarChaves(dados);

    let mensagem =
      `🏆 **CHAVE BDR ${numero}**\n\n` +
      `👥 **${tamanho} MCs**\n\n`;

    confrontos.forEach((confronto, index) => {

      mensagem +=
        `⚔️ **Confronto ${index + 1}**\n` +
        `<@${confronto.mc1}> 🆚 <@${confronto.mc2}>\n\n`;
    });

    mensagem +=
      `📅 **${nomeMes(dados.mesAtual)}**\n` +
      `🔒
