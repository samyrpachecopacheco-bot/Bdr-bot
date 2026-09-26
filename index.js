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

// =========================
// ARQUIVOS
// =========================

function carregarArquivo(arquivo, padrao) {
  try {
    if (!fs.existsSync(arquivo)) {
      fs.writeFileSync(arquivo, JSON.stringify(padrao, null, 2));
      return padrao;
    }

    const conteudo = fs.readFileSync(arquivo, "utf8");

    if (!conteudo.trim()) {
      fs.writeFileSync(arquivo, JSON.stringify(padrao, null, 2));
      return padrao;
    }

    return JSON.parse(conteudo);
  } catch (erro) {
    console.error(`Erro ao carregar ${arquivo}:`, erro);
    return padrao;
  }
}

function salvarArquivo(arquivo, dados) {
  fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2));
}

function carregarAdvs() {
  return carregarArquivo(ADV_FILE, {});
}

function salvarAdvs(dados) {
  salvarArquivo(ADV_FILE, dados);
}

function carregarChaves() {
  return carregarArquivo(CHAVES_FILE, {
    mesAtual: null,
    proximaChave: 1,
    chaves: [],
    ranking: {},
    historicoMeses: []
  });
}

function salvarChaves(dados) {
  salvarArquivo(CHAVES_FILE, dados);
}

// =========================
// MESES
// =========================

function mesAtual() {
  const agora = new Date();

  return `${agora.getFullYear()}-${String(
    agora.getMonth() + 1
  ).padStart(2, "0")}`;
}

function nomeMes(mes) {
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

  if (!mes) return "Mês desconhecido";

  const numero = Number(mes.split("-")[1]);

  return nomes[numero - 1] || "Mês desconhecido";
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
    dados.historicoMeses.push({
      mes: dados.mesAtual,
      ranking: dados.ranking,
      encerradoEm: new Date().toISOString()
    });

    dados.mesAtual = mes;
    dados.ranking = {};

    salvarChaves(dados);
  }

  return dados;
}

// =========================
// CARGOS DE ADV
// =========================

async function pegarOuCriarCargo(guild, nome) {
  let cargo = guild.roles.cache.find(r => r.name === nome);

  if (!cargo) {
    cargo = await guild.roles.create({
      name: nome,
      reason: "Cargo automático do sistema de advertências BDR"
    });
  }

  return cargo;
}

async function aplicarCargo(member, numero) {
  const nomes = [
    "⚠️ ADV 1",
    "⚠️ ADV 2",
    "⚠️ ADV 3",
    "⚠️ ADV 4"
  ];

  for (const nome of nomes) {
    const cargo = member.guild.roles.cache.find(r => r.name === nome);

    if (cargo && member.roles.cache.has(cargo.id)) {
      await member.roles.remove(cargo).catch(() => {});
    }
  }

  const nomeCargo = nomes[numero - 1];

  if (!nomeCargo) return;

  const cargo = await pegarOuCriarCargo(member.guild, nomeCargo);

  if (cargo.position >= member.guild.members.me.roles.highest.position) {
    console.log(`Não consigo gerenciar o cargo ${nomeCargo}.`);
    return;
  }

  await member.roles.add(cargo).catch(erro => {
    console.log("Erro ao adicionar cargo:", erro);
  });
}

// =========================
// COMANDOS
// =========================

const comandos = [
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
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("advlist")
    .setDescription("Mostra as advertências de um membro.")
    .addUserOption(option =>
      option
        .setName("membro")
        .setDescription("Membro.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("advremove")
    .setDescription("Remove uma advertência.")
    .addUserOption(option =>
      option
        .setName("membro")
        .setDescription("Membro.")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("id")
        .setDescription("ID da advertência.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("advs")
    .setDescription("Mostra as advertências recentes.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("chavesbdr")
    .setDescription("Cria uma nova chave da BDR.")
    .addIntegerOption(option =>
      option
        .setName("tamanho")
        .setDescription("Quantidade de MCs.")
        .setRequired(true)
        .addChoices(
          { name: "4 MCs", value: 4 },
          { name: "8 MCs", value: 8 }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("rankingchaves")
    .setDescription("Mostra o ranking das chaves BDR."),

  new SlashCommandBuilder()
    .setName("editrankingchaves")
    .setDescription("Edita o resultado de uma chave.")
    .addIntegerOption(option =>
      option
        .setName("chave")
        .setDescription("Número da chave.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("limparranking")
    .setDescription("Encerra o ranking atual e inicia um novo.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
].map(comando => comando.toJSON());

// =========================
// REGISTRAR COMANDOS
// =========================

async function registrarComandos() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    console.log("Registrando comandos...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      {
        body: comandos
      }
    );

    console.log("Comandos registrados.");
  } catch (erro) {
    console.error("Erro ao registrar comandos:", erro);
  }
}

// =========================
// UTILIDADES DE MENÇÕES
// =========================

function extrairIds(texto) {
  const encontrados = texto.match(/<@!?(\d+)>/g) || [];

  return encontrados.map(mencao =>
    mencao.replace(/[<@!>]/g, "")
  );
}

function criarConfrontos(ids) {
  const embaralhados = [...ids];

  for (let i = embaralhados.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [embaralhados[i], embaralhados[j]] = [
      embaralhados[j],
      embaralhados[i]
    ];
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

// =========================
// RANKING
// =========================

function recalcularRanking(dados, mes) {
  const ranking = {};

  for (const chave of dados.chaves) {
    if (chave.mes !== mes) continue;
    if (!chave.fechada || !chave.resultado) continue;

    const resultado = chave.resultado;

    const adicionar = (id, pontos) => {
      if (!ranking[id]) {
        ranking[id] = 0;
      }

      ranking[id] += pontos;
    };

    adicionar(resultado.campeao, 5);
    adicionar(resultado.vice, 3);
    adicionar(resultado.passou1, 1);
    adicionar(resultado.passou2, 1);
  }

  dados.ranking = ranking;

  salvarChaves(dados);
}

// =========================
// BOT ONLINE
// =========================

client.once("ready", async () => {
  console.log(`Bot online como ${client.user.tag}`);

  garantirMesAtual();

  await registrarComandos();
});

// =========================
// INTERAÇÕES
// =========================

client.on("interactionCreate", async interaction => {
  try {

    // =====================================
    // COMANDOS SLASH
    // =====================================

    if (interaction.isChatInputCommand()) {

      // =========================
      // /ADV
      // =========================

      if (interaction.commandName === "adv") {
        const membro = interaction.options.getMember("membro");
        const usuario = interaction.options.getUser("membro");
        const motivo = interaction.options.getString("motivo");

        if (!membro) {
          return interaction.reply({
            content: "❌ Não encontrei esse membro no servidor.",
            ephemeral: true
          });
        }

        if (membro.id === interaction.user.id) {
          return interaction.reply({
            content: "❌ Você não pode aplicar ADV em si mesmo.",
            ephemeral: true
          });
        }

        const dados = carregarAdvs();

        if (!dados[membro.id]) {
          dados[membro.id] = {
            total: 0,
            historico: []
          };
        }

        dados[membro.id].total++;

        const numero = dados[membro.id].total;

        const advertencia = {
          id: dados[membro.id].historico.length + 1,
          numero,
          motivo,
          aplicadoPor: interaction.user.id,
          data: new Date().toISOString()
        };

        dados[membro.id].historico.push(advertencia);

        salvarAdvs(dados);

        if (numero <= 4) {
          await aplicarCargo(membro, numero);
        }

        let resposta =
          `⚠️ **ADVERTÊNCIA APLICADA**\n\n` +
          `👤 Membro: <@${usuario.id}>\n` +
          `📌 ADV: **${numero}**\n` +
          `📝 Motivo: **${motivo}**`;

        // ADV 2
        if (numero === 2) {
          await membro.timeout(
            60 * 60 * 1000,
            `ADV 2: ${motivo}`
          ).catch(() => {});

          resposta +=
            `\n\n⏱️ **Punição:** Timeout de 1 hora.`;

          setTimeout(async () => {
            await membro.timeout(null).catch(() => {});
          }, 60 * 60 * 1000);
        }

        // ADV 3
        if (numero === 3) {
          await membro.timeout(
            24 * 60 * 60 * 1000,
            `ADV 3: ${motivo}`
          ).catch(() => {});

          resposta +=
            `\n\n⏱️ **Punição:** Timeout de 1 dia.`;

          setTimeout(async () => {
            await membro.timeout(null).catch(() => {});
          }, 24 * 60 * 60 * 1000);
        }

        // ADV 4
        if (numero === 4) {
          resposta +=
            `\n\n🚪 **Punição:** Membro expulso do servidor.`;

          await membro.kick(`ADV 4: ${motivo}`).catch(() => {});
        }

        // Acima de 4
        if (numero > 4) {
          resposta +=
            `\n\n⚠️ O membro já ultrapassou o limite de 4 ADVs.`;
        }

        await interaction.reply({
          content: resposta
        });

        return;
      }

      // =========================
      // /ADVLIST
      // =========================

      if (interaction.commandName === "advlist") {
        const usuario = interaction.options.getUser("membro");
        const dados = carregarAdvs();

        const registro = dados[usuario.id];

        if (!registro || registro.historico.length === 0) {
          return interaction.reply({
            content: `✅ <@${usuario.id}> não possui advertências registradas.`,
            ephemeral: true
          });
        }

        let texto =
          `⚠️ **ADVERTÊNCIAS DE <@${usuario.id}>**\n\n`;

        for (const adv of registro.historico) {
          texto +=
            `**ADV ${adv.numero}** — ID ${adv.id}\n` +
            `📝 ${adv.motivo}\n` +
            `👮 Aplicada por: <@${adv.aplicadoPor}>\n\n`;
        }

        await interaction.reply({
          content: texto
        });

        return;
      }

      // =========================
      // /ADVREMOVE
      // =========================

      if (interaction.commandName === "advremove") {
        const usuario = interaction.options.getUser("membro");
        const id = interaction.options.getInteger("id");

        const dados = carregarAdvs();

        if (!dados[usuario.id]) {
          return interaction.reply({
            content: "❌ Esse membro não possui ADVs.",
            ephemeral: true
          });
        }

        const indice = dados[usuario.id].historico.findIndex(
          adv => adv.id === id
        );

        if (indice === -1) {
          return interaction.reply({
            content: "❌ ADV não encontrada.",
            ephemeral: true
          });
        }

        dados[usuario.id].historico.splice(indice, 1);

        salvarAdvs(dados);

        await interaction.reply({
          content:
            `✅ ADV **${id}** de <@${usuario.id}> foi removida do histórico.`
        });

        return;
      }

      // =========================
      // /ADVS
      // =========================

      if (interaction.commandName === "advs") {
        const dados = carregarAdvs();

        const lista = [];

        for (const [userId, registro] of Object.entries(dados)) {
          for (const adv of registro.historico) {
            lista.push({
              userId,
              ...adv
            });
          }
        }

        lista.sort(
          (a, b) =>
            new Date(b.data) - new Date(a.data)
        );

        const recentes = lista.slice(0, 10);

        if (recentes.length === 0) {
          return interaction.reply({
            content: "✅ Nenhuma advertência registrada."
          });
        }

        let texto = "⚠️ **ADVERTÊNCIAS RECENTES**\n\n";

        for (const adv of recentes) {
          texto +=
            `👤 <@${adv.userId}> — **ADV ${adv.numero}**\n` +
            `📝 ${adv.motivo}\n` +
            `👮 <@${adv.aplicadoPor}>\n\n`;
        }

        await interaction.reply({
          content: texto
        });

        return;
      }

      // =========================
      // /CHAVESBDR
      // =========================

      if (interaction.commandName === "chavesbdr") {
        const tamanho =
          interaction.options.getInteger("tamanho");

        const modal = new ModalBuilder()
          .setCustomId(`criar_chave_${tamanho}`)
          .setTitle(`Criar Chave BDR — ${tamanho} MCs`);

        const campo = new TextInputBuilder()
          .setCustomId("mcs")
          .setLabel(`Mande os ${tamanho} MCs`)
          .setPlaceholder(
            "Ex: @MC1 @MC2 @MC3 @MC4"
          )
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(campo)
        );

        await interaction.showModal(modal);

        return;
      }

      // =========================
      // /RANKINGCHAVES
      // =========================

      if (interaction.commandName === "rankingchaves") {
        const dados = garantirMesAtual();

        const ranking = Object.entries(dados.ranking)
          .sort((a, b) => b[1] - a[1]);

        if (ranking.length === 0) {
          return interaction.reply({
            content:
              `🏆 **RANKING BDR — ${nomeMes(dados.mesAtual)}**\n\n` +
              `Ainda não existem pontos neste mês.`
          });
        }

        let texto =
          `🏆 **RANKING BDR — ${nomeMes(dados.mesAtual)}**\n\n`;

        ranking.forEach(([id, pontos], index) => {
          texto +=
            `**${index + 1}.** <@${id}> — **${pontos} pts**\n`;
        });

        await interaction.reply({
          content: texto
        });

        return;
      }

      // =========================
      // /EDITRANKINGCHAVES
      // =========================

      if (interaction.commandName === "editrankingchaves") {
        const numero =
          interaction.options.getInteger("chave");

        const dados = garantirMesAtual();

        const chave = dados.chaves.find(
          c =>
            c.numero === numero &&
            c.mes === dados.mesAtual
        );

        if (!chave) {
          return interaction.reply({
            content: "❌ Chave não encontrada neste mês.",
            ephemeral: true
          });
        }

        if (!chave.resultado) {
          return interaction.reply({
            content:
              "❌ Essa chave ainda não possui resultado.",
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId(`editar_chave_${numero}`)
          .setTitle(`Editar Chave ${numero}`);

        const criarCampo = (
          id,
          label,
          valor
        ) => {
          return new TextInputBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setValue(`<@${valor}>`)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        };

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            criarCampo(
              "campeao",
              "Campeão",
              chave.resultado.campeao
            )
          ),
          new ActionRowBuilder().addComponents(
            criarCampo(
              "vice",
              "Vice",
              chave.resultado.vice
            )
          ),
          new ActionRowBuilder().addComponents(
            criarCampo(
              "passou1",
              "Passou 1",
              chave.resultado.passou1
            )
          ),
          new ActionRowBuilder().addComponents(
            criarCampo(
              "passou2",
              "Passou 2",
              chave.resultado.passou2
            )
          )
        );

        await interaction.showModal(modal);

        return;
      }

      // =========================
      // /LIMPARRANKING
      // =========================

      if (interaction.commandName === "limparranking") {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("confirmar_limpar_ranking")
            .setLabel("Confirmar")
            .setStyle(ButtonStyle.Danger),

          new ButtonBuilder()
            .setCustomId("cancelar_limpar_ranking")
            .setLabel("Cancelar")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          content:
            "⚠️ **Tem certeza que deseja encerrar o ranking atual?**\n\n" +
            "O ranking será arquivado e um novo ranking será iniciado.",
          components: [row],
          ephemeral: true
        });

        return;
      }
    }

    // =====================================
    // MODAIS
    // =====================================

    if (interaction.isModalSubmit()) {

      // =========================
      // CRIAR CHAVE
      // =========================

      if (
        interaction.customId.startsWith("criar_chave_")
      ) {
        const tamanho = Number(
          interaction.customId.replace(
            "criar_chave_",
            ""
          )
        );

        const texto =
          interaction.fields.getTextInputValue("mcs");

        const ids = extrairIds(texto);

        if (ids.length !== tamanho) {
          return interaction.reply({
            content:
              `❌ Você precisa marcar exatamente **${tamanho} MCs**.\n` +
              `Você marcou **${ids.length}**.`,
            ephemeral: true
          });
        }

        if (new Set(ids).size !== ids.length) {
  return interaction.reply({
    content:
      "❌ Não pode haver MC repetido na chave.",
    ephemeral: true
  });
}

const dados = garantirMesAtual();

const numero = dados.proximaChave;

dados.proximaChave++;

const confrontos = criarConfrontos(ids);

const chave = {
  numero,
  mes: dados.mesAtual,
  tamanho,
  participantes: ids,
  confrontos,
  fechada: false,
  resultado: null,
  criadaEm: new Date().toISOString(),
  criadaPor: interaction.user.id
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
  `🔒 Chave aberta — clique abaixo para encerrar.`;

const botao = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`encerrar_chave_${numero}`)
    .setLabel("Encerrar Chave")
    .setStyle(ButtonStyle.Danger)
);

await interaction.reply({
  content: mensagem,
  components: [botao]
});

return;
}

// =========================
// MODAIS
// =========================

if (interaction.isModalSubmit()) {

  if (interaction.customId.startsWith("resultado_chave_")) {

    const numero = Number(
      interaction.customId.replace("resultado_chave_", "")
    );

    const dados = garantirMesAtual();

    const chave = dados.chaves.find(
      c =>
        c.numero === numero &&
        c.mes === dados.mesAtual
    );

    if (!chave) {
      return interaction.reply({
        content: "❌ Chave não encontrada.",
        ephemeral: true
      });
    }

    if (chave.fechada) {
      return interaction.reply({
        content: "❌ Essa chave já foi encerrada.",
        ephemeral: true
      });
    }

    const campos = [
      "campeao",
      "vice",
      "passou1",
      "passou2"
    ];

    const idsResultado = [];

    for (const campo of campos) {
      const texto =
        interaction.fields.getTextInputValue(campo);

      const idsCampo = extrairIds(texto);

      if (idsCampo.length !== 1) {
        return interaction.reply({
          content:
            "❌ Cada campo precisa ter exatamente 1 MC marcado.",
          ephemeral: true
        });
      }

      idsResultado.push(idsCampo[0]);
    }

    if (
      new Set(idsResultado).size !==
      idsResultado.length
    ) {
      return interaction.reply({
        content:
          "❌ Um mesmo MC não pode ocupar duas posições.",
        ephemeral: true
      });
    }

    for (const id of idsResultado) {
      if (!chave.participantes.includes(id)) {
        return interaction.reply({
          content:
            `❌ <@${id}> não participou desta chave.`,
          ephemeral: true
        });
      }
    }

    chave.resultado = {
      campeao: idsResultado[0],
      vice: idsResultado[1],
      passou1: idsResultado[2],
      passou2: idsResultado[3]
    };

    chave.fechada = true;
    chave.encerradaEm =
      new Date().toISOString();

    recalcularRanking(
      dados,
      dados.mesAtual
    );

    await interaction.reply({
      content:
        `🏆 **CHAVE BDR ${numero} ENCERRADA!**\n\n` +
        `🥇 Campeão: <@${idsResultado[0]}> — **+5 pts**\n` +
        `🥈 Vice: <@${idsResultado[1]}> — **+3 pts**\n` +
        `✅ Passou: <@${idsResultado[2]}> — **+1 pt**\n` +
        `✅ Passou: <@${idsResultado[3]}> — **+1 pt**\n\n` +
        `📊 Ranking atualizado!`
    });

    return;
  }

  if (interaction.customId.startsWith("editar_chave_")) {

    const numero = Number(
      interaction.customId.replace("editar_chave_", "")
    );

    const dados = garantirMesAtual();

    const chave = dados.chaves.find(
      c =>
        c.numero === numero &&
        c.mes === dados.mesAtual
    );

    if (!chave) {
      return interaction.reply({
        content: "❌ Chave não encontrada.",
        ephemeral: true
      });
    }

    const campos = [
      "campeao",
      "vice",
      "passou1",
      "passou2"
    ];

    const ids = [];

    for (const campo of campos) {
      const texto =
        interaction.fields.getTextInputValue(campo);

      const encontrados =
        extrairIds(texto);

      if (encontrados.length !== 1) {
        return interaction.reply({
          content:
            "❌ Cada campo precisa ter exatamente 1 MC marcado.",
          ephemeral: true
        });
      }

      ids.push(encontrados[0]);
    }

    if (
      new Set(ids).size !== ids.length
    ) {
      return interaction.reply({
        content:
          "❌ Um mesmo MC não pode ocupar duas posições.",
        ephemeral: true
      });
    }

    for (const id of ids) {
      if (!chave.participantes.includes(id)) {
        return interaction.reply({
          content:
            `❌ <@${id}> não participou desta chave.`,
          ephemeral: true
        });
      }
    }

    chave.resultado = {
      campeao: ids[0],
      vice: ids[1],
      passou1: ids[2],
      passou2: ids[3]
    };

    chave.fechada = true;

    recalcularRanking(
      dados,
      dados.mesAtual
    );

    await interaction.reply({
      content:
        `✅ **Chave ${numero} editada com sucesso!**\n\n` +
        `🥇 <@${ids[0]}> — +5\n` +
        `🥈 <@${ids[1]}> — +3\n` +
        `✅ <@${ids[2]}> — +1\n` +
        `✅ <@${ids[3]}> — +1\n\n` +
        `📊 Ranking recalculado.`
    });

    return;
  }
}

// =========================
// BOTÕES
// =========================

if (interaction.isButton()) {

  if (interaction.customId.startsWith("encerrar_chave_")) {

    const numero = Number(
      interaction.customId.replace("encerrar_chave_", "")
    );

    const dados = garantirMesAtual();

    const chave = dados.chaves.find(
      c =>
        c.numero === numero &&
        c.mes === dados.mesAtual
    );

    if (!chave) {
      return interaction.reply({
        content: "❌ Chave não encontrada.",
        ephemeral: true
      });
    }

    if (chave.fechada) {
      return interaction.reply({
        content:
          "❌ Essa chave já foi encerrada.",
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`resultado_chave_${numero}`)
      .setTitle(`Resultado — Chave ${numero}`);

    const criarCampo = (id, label, placeholder) =>
      new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setPlaceholder(placeholder)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        criarCampo(
          "campeao",
          "Campeão",
          "@MC campeão"
        )
      ),
      new ActionRowBuilder().addComponents(
        criarCampo(
          "vice",
          "Vice-campeão",
          "@MC vice"
        )
      ),
      new ActionRowBuilder().addComponents(
        criarCampo(
          "passou1",
          "Outro MC que passou",
          "@MC"
        )
      ),
      new ActionRowBuilder().addComponents(
        criarCampo(
          "passou2",
          "Outro MC que passou",
          "@MC"
        )
      )
    );

    await interaction.showModal(modal);

    return;
  }

  if (
    interaction.customId ===
    "confirmar_limpar_ranking"
  ) {

    const dados = carregarChaves();

    if (dados.mesAtual) {
      dados.historicoMeses.push({
        mes: dados.mesAtual,
        ranking: dados.ranking,
        encerradoEm:
          new Date().toISOString()
      });
    }

    dados.ranking = {};
    dados.mesAtual = mesAtual();

    salvarChaves(dados);

    await interaction.update({
      content:
        `✅ **Ranking encerrado!**\n\n` +
        `🏆 O ranking de **${nomeMes(dados.mesAtual)}** começou agora.`,
      components: []
    });

    return;
  }

  if (
    interaction.customId ===
    "cancelar_limpar_ranking"
  ) {

    await interaction.update({
      content: "❌ Limpeza cancelada.",
      components: []
    });

    return;
  }
   } catch (erro) {
    console.error(
      "ERRO NA INTERAÇÃO:",
      erro
    );

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.reply({
        content:
          "❌ Ocorreu um erro ao executar essa ação.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// =========================
// LOGIN
// =========================

if (!TOKEN) {
  console.error(
    "❌ DISCORD_TOKEN não encontrado."
  );

  process.exit(1);
}

client.login(TOKEN);
