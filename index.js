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
  UserSelectMenuBuilder,
  StringSelectMenuBuilder
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

// Guarda resultados que ainda estão sendo preenchidos
const resultadosPendentes = new Map();
const criacoesPendentes = new Map();

// =========================
// ARQUIVOS
// =========================

function carregarArquivo(arquivo, padrao) {
  try {
    if (!fs.existsSync(arquivo)) {
      fs.writeFileSync(
        arquivo,
        JSON.stringify(padrao, null, 2)
      );

      return padrao;
    }

    const conteudo = fs.readFileSync(
      arquivo,
      "utf8"
    );

    if (!conteudo.trim()) {
      fs.writeFileSync(
        arquivo,
        JSON.stringify(padrao, null, 2)
      );

      return padrao;
    }

    return JSON.parse(conteudo);
  } catch (erro) {
    console.error(
      `Erro ao carregar ${arquivo}:`,
      erro
    );

    return padrao;
  }
}

function salvarArquivo(arquivo, dados) {
  fs.writeFileSync(
    arquivo,
    JSON.stringify(dados, null, 2)
  );
}

function carregarAdvs() {
  return carregarArquivo(
    ADV_FILE,
    {}
  );
}

function salvarAdvs(dados) {
  salvarArquivo(
    ADV_FILE,
    dados
  );
}

function carregarChaves() {
  return carregarArquivo(
    CHAVES_FILE,
    {
      mesAtual: null,
      proximaChave: 1,
      chaves: [],
      ranking: {},
      historicoMeses: []
    }
  );
}

function salvarChaves(dados) {
  salvarArquivo(
    CHAVES_FILE,
    dados
  );
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

  if (!mes) {
    return "Mês desconhecido";
  }

  const numero = Number(
    mes.split("-")[1]
  );

  return (
    nomes[numero - 1] ||
    "Mês desconhecido"
  );
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
      encerradoEm:
        new Date().toISOString()
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

async function pegarOuCriarCargo(
  guild,
  nome
) {
  let cargo = guild.roles.cache.find(
    r => r.name === nome
  );

  if (!cargo) {
    cargo = await guild.roles.create({
      name: nome,
      reason:
        "Cargo automático do sistema de advertências BDR"
    });
  }

  return cargo;
}

async function aplicarCargo(
  member,
  numero
) {
  const nomes = [
    "⚠️ ADV 1",
    "⚠️ ADV 2",
    "⚠️ ADV 3",
    "⚠️ ADV 4"
  ];

  for (const nome of nomes) {
    const cargo =
      member.guild.roles.cache.find(
        r => r.name === nome
      );

    if (
      cargo &&
      member.roles.cache.has(cargo.id)
    ) {
      await member.roles
        .remove(cargo)
        .catch(() => {});
    }
  }

  const nomeCargo =
    nomes[numero - 1];

  if (!nomeCargo) {
    return;
  }

  const cargo =
    await pegarOuCriarCargo(
      member.guild,
      nomeCargo
    );

  const botMember =
    member.guild.members.me;

  if (
    !botMember ||
    cargo.position >=
      botMember.roles.highest.position
  ) {
    console.log(
      `Não consigo gerenciar o cargo ${nomeCargo}.`
    );

    return;
  }

  await member.roles
    .add(cargo)
    .catch(erro => {
      console.log(
        "Erro ao adicionar cargo:",
        erro
      );
    });
}

// =========================
// COMANDOS
// =========================

const comandos = [
  // =========================
  // ADV
  // =========================

  new SlashCommandBuilder()
    .setName("adv")
    .setDescription(
      "Aplica uma advertência a um membro."
    )
    .addUserOption(option =>
      option
        .setName("membro")
        .setDescription(
          "Membro que receberá a advertência."
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("motivo")
        .setDescription(
          "Motivo da advertência."
        )
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages
    ),

  new SlashCommandBuilder()
    .setName("advlist")
    .setDescription(
      "Mostra as advertências de um membro."
    )
    .addUserOption(option =>
      option
        .setName("membro")
        .setDescription("Membro.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages
    ),

  new SlashCommandBuilder()
    .setName("advremove")
    .setDescription(
      "Remove uma advertência."
    )
    .addUserOption(option =>
      option
        .setName("membro")
        .setDescription("Membro.")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("id")
        .setDescription(
          "ID da advertência."
        )
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages
    ),

  new SlashCommandBuilder()
    .setName("advs")
    .setDescription(
      "Mostra as advertências recentes."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages
    ),

  // =========================
  // CHAVES
  // =========================

  new SlashCommandBuilder()
    .setName("chavesbdr")
    .setDescription("Cria uma nova chave da BDR.")
    .addIntegerOption(option =>
      option
        .setName("tamanho")
        .setDescription("Quantidade de MCs na chave.")
        .setRequired(true)
        .addChoices(
          { name: "4 MCs", value: 4 },
          { name: "8 MCs", value: 8 }
        )
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages
    ),

  new SlashCommandBuilder()
    .setName("rankingchaves")
    .setDescription(
      "Mostra o ranking das chaves BDR."
    ),

  new SlashCommandBuilder()
    .setName("editrankingchaves")
    .setDescription(
      "Edita o resultado de uma chave."
    )
    .addIntegerOption(option =>
      option
        .setName("chave")
        .setDescription(
          "Número da chave."
        )
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages
    ),

  new SlashCommandBuilder()
    .setName("limparranking")
    .setDescription(
      "Encerra o ranking atual e inicia um novo."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages
    )
].map(comando =>
  comando.toJSON()
);

// =========================
// REGISTRAR COMANDOS
// =========================

async function registrarComandos() {
  const rest = new REST({
    version: "10"
  }).setToken(TOKEN);

  try {
    console.log(
      "Registrando comandos..."
    );

    await rest.put(
      Routes.applicationGuildCommands(
        CLIENT_ID,
        GUILD_ID
      ),
      {
        body: comandos
      }
    );

    console.log(
      "Comandos registrados."
    );
  } catch (erro) {
    console.error(
      "Erro ao registrar comandos:",
      erro
    );
  }
}

// =========================
// CONFRONTOS
// =========================

function criarConfrontos(ids) {
  const embaralhados = [
    ...ids
  ];

  for (
    let i =
      embaralhados.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() *
          (i + 1)
      );

    [
      embaralhados[i],
      embaralhados[j]
    ] = [
      embaralhados[j],
      embaralhados[i]
    ];
  }

  const confrontos = [];

  for (
    let i = 0;
    i < embaralhados.length;
    i += 2
  ) {
    confrontos.push({
      mc1: embaralhados[i],
      mc2:
        embaralhados[i + 1]
    });
  }

  return confrontos;
}

// =========================
// RANKING
// =========================

function recalcularRanking(
  dados,
  mes
) {
  const ranking = {};

  for (const chave of dados.chaves) {
    if (chave.mes !== mes) {
      continue;
    }

    if (
      !chave.fechada ||
      !chave.resultado
    ) {
      continue;
    }

    const resultado =
      chave.resultado;

    const adicionar = (
      id,
      pontos
    ) => {
      if (!id) {
        return;
      }

      if (!ranking[id]) {
        ranking[id] = 0;
      }

      ranking[id] += pontos;
    };

    adicionar(
      resultado.campeao,
      5
    );

    adicionar(
      resultado.vice,
      3
    );

    adicionar(
      resultado.passou1,
      1
    );

    adicionar(
      resultado.passou2,
      1
    );
  }

  dados.ranking = ranking;

  salvarChaves(dados);
}

// =========================
// MENUS DE RESULTADO
// =========================

function criarMenuResultado(
  numero,
  campo,
  placeholder,
  selecionado,
  participantes
) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`resultado_select_${numero}_${campo}`)
    .setPlaceholder(placeholder)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      participantes.map((id, index) => ({
        label: `MC ${index + 1}`,
        description: `Selecionar <@${id}>`,
        value: id,
        default: selecionado === id
      }))
    );

  return new ActionRowBuilder().addComponents(menu);
}

function criarComponentesResultado(numero, resultado, participantes) {
  const componentes = [
    criarMenuResultado(
      numero, "campeao", "🥇 Selecionar campeão",
      resultado.campeao, participantes
    ),
    criarMenuResultado(
      numero, "vice", "🥈 Selecionar vice-campeão",
      resultado.vice, participantes
    ),
    criarMenuResultado(
      numero, "passou1", "✅ Selecionar classificado",
      resultado.passou1, participantes
    ),
    criarMenuResultado(
      numero, "passou2", "✅ Selecionar outro classificado",
      resultado.passou2, participantes
    )
  ];

  const preenchido =
    resultado.campeao &&
    resultado.vice &&
    resultado.passou1 &&
    resultado.passou2;

  componentes.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirmar_resultado_${numero}`)
        .setLabel("Confirmar resultado")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!preenchido)
    )
  );

  return componentes;
}

function textoParticipantes(ids) {
  return ids.length
    ? ids.map((id, i) => `**${i + 1}.** <@${id}>`).join("\n")
    : "⏳ Nenhum MC selecionado.";
}

// =========================
// BOT ONLINE
// =========================

client.once(
  "ready",
  async () => {
    console.log(
      `Bot online como ${client.user.tag}`
    );

    garantirMesAtual();

    await registrarComandos();
  }
);

// =========================
// INTERAÇÕES
// =========================

client.on(
  "interactionCreate",
  async interaction => {
    try {

      // =====================================
      // COMANDOS SLASH
      // =====================================

      if (
        interaction.isChatInputCommand()
      ) {

        // =========================
        // /ADV
        // =========================

        if (
          interaction.commandName ===
          "adv"
        ) {
          const membro =
            interaction.options.getMember(
              "membro"
            );

          const usuario =
            interaction.options.getUser(
              "membro"
            );

          const motivo =
            interaction.options.getString(
              "motivo"
            );

          if (!membro) {
            return interaction.reply({
              content:
                "❌ Não encontrei esse membro no servidor.",
              ephemeral: true
            });
          }

          if (
            membro.id ===
            interaction.user.id
          ) {
            return interaction.reply({
              content:
                "❌ Você não pode aplicar ADV em si mesmo.",
              ephemeral: true
            });
          }

          const dados =
            carregarAdvs();

          if (!dados[membro.id]) {
            dados[membro.id] = {
              total: 0,
              historico: []
            };
          }

          dados[membro.id].total++;

          const numero =
            dados[membro.id].total;

          const advertencia = {
            id:
              dados[membro.id]
                .historico.length + 1,

            numero,

            motivo,

            aplicadoPor:
              interaction.user.id,

            data:
              new Date().toISOString()
          };

          dados[membro.id]
            .historico
            .push(advertencia);

          salvarAdvs(dados);

          if (numero <= 4) {
            await aplicarCargo(
              membro,
              numero
            );
          }

          let resposta =
            `⚠️ **ADVERTÊNCIA APLICADA**\n\n` +
            `👤 Membro: <@${usuario.id}>\n` +
            `📌 ADV: **${numero}**\n` +
            `📝 Motivo: **${motivo}**`;

          if (numero === 2) {
            await membro
              .timeout(
                60 * 60 * 1000,
                `ADV 2: ${motivo}`
              )
              .catch(() => {});

            resposta +=
              `\n\n⏱️ **Punição:** Timeout de 1 hora.`;

            setTimeout(
              async () => {
                await membro
                  .timeout(null)
                  .catch(() => {});
              },
              60 * 60 * 1000
            );
          }

          if (numero === 3) {
            await membro
              .timeout(
                24 *
                  60 *
                  60 *
                  1000,
                `ADV 3: ${motivo}`
              )
              .catch(() => {});

            resposta +=
              `\n\n⏱️ **Punição:** Timeout de 1 dia.`;

            setTimeout(
              async () => {
                await membro
                  .timeout(null)
                  .catch(() => {});
              },
              24 *
                60 *
                60 *
                1000
            );
          }

          if (numero === 4) {
            resposta +=
              `\n\n🚪 **Punição:** Membro expulso do servidor.`;

            await membro
              .kick(
                `ADV 4: ${motivo}`
              )
              .catch(() => {});
          }

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

        if (
          interaction.commandName ===
          "advlist"
        ) {
          const usuario =
            interaction.options.getUser(
              "membro"
            );

          const dados =
            carregarAdvs();

          const registro =
            dados[usuario.id];

          if (
            !registro ||
            registro.historico.length ===
              0
          ) {
            return interaction.reply({
              content:
                `✅ <@${usuario.id}> não possui advertências registradas.`,
              ephemeral: true
            });
          }

          let texto =
            `⚠️ **ADVERTÊNCIAS DE <@${usuario.id}>**\n\n`;

          for (
            const adv of
            registro.historico
          ) {
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

        if (
          interaction.commandName ===
          "advremove"
        ) {
          const usuario =
            interaction.options.getUser(
              "membro"
            );

          const id =
            interaction.options.getInteger(
              "id"
            );

          const dados =
            carregarAdvs();

          if (!dados[usuario.id]) {
            return interaction.reply({
              content:
                "❌ Esse membro não possui ADVs.",
              ephemeral: true
            });
          }

          const indice =
            dados[usuario.id]
              .historico
              .findIndex(
                adv =>
                  adv.id === id
              );

          if (indice === -1) {
            return interaction.reply({
              content:
                "❌ ADV não encontrada.",
              ephemeral: true
            });
          }

          dados[usuario.id]
            .historico
            .splice(indice, 1);

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

        if (
          interaction.commandName ===
          "advs"
        ) {
          const dados =
            carregarAdvs();

          const lista = [];

          for (
            const [
              userId,
              registro
            ] of Object.entries(
              dados
            )
          ) {
            for (
              const adv of
              registro.historico
            ) {
              lista.push({
                userId,
                ...adv
              });
            }
          }

          lista.sort(
            (a, b) =>
              new Date(b.data) -
              new Date(a.data)
          );

          const recentes =
            lista.slice(0, 10);

          if (
            recentes.length === 0
          ) {
            return interaction.reply({
              content:
                "✅ Nenhuma advertência registrada."
            });
          }

          let texto =
           "⚠️ **ADVERTÊNCIAS RECENTES**\n\n";

          for (
            const adv of recentes
          ) {
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

        if (
          interaction.commandName ===
          "chavesbdr"
        ) {
          const tamanho =
            interaction.options.getInteger("tamanho");

          const chaveDados =
            `${interaction.user.id}_${Date.now()}`;

          criacoesPendentes.set(
            chaveDados,
            { tamanho, participantes: [] }
          );

          const seletor =
            new UserSelectMenuBuilder()
              .setCustomId(
                `criar_chave_select_${chaveDados}`
              )
              .setPlaceholder(
                `Selecionar ${tamanho} MCs`
              )
          .setMinValues(tamanho)
              .setMaxValues(tamanho);

          const confirmar =
            new ButtonBuilder()
              .setCustomId(
                `confirmar_criacao_chave_${chaveDados}`
              )
              .setLabel("Criar chave")
              .setStyle(ButtonStyle.Success)
              .setDisabled(true);

          await interaction.reply({
            content:
              `╭━━━━━━〔 ☀️ NOVA CHAVE BDR 〕━━━━━━╮\n\n` +
              `📊 **Tamanho:** ${tamanho} MCs\n\n` +
              `Selecione abaixo os **${tamanho} MCs** que participarão da chave.\n\n` +
              `👥 **Participantes selecionados:**\n` +
              `⏳ Nenhum MC selecionado.\n\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
            components: [
              new ActionRowBuilder().addComponents(seletor),
              new ActionRowBuilder().addComponents(confirmar)
            ],
            ephemeral: true
          });

          return;
        }

        // =========================
        // /RANKINGCHAVES
        // =========================

        if (
          interaction.commandName ===
          "rankingchaves"
        ) {
          const dados =
            garantirMesAtual();

          const ranking =
            Object.entries(
              dados.ranking
            ).sort(
              (a, b) =>
                b[1] - a[1]
            );

          if (
            ranking.length === 0
          ) {
            return interaction.reply({
              content:
                `🏆 **RANKING BDR — ${nomeMes(dados.mesAtual)}**\n\n` +
                `Ainda não existem pontos neste mês.`
            });
          }

          let texto =
            `🏆 **RANKING BDR — ${nomeMes(dados.mesAtual)}**\n\n`;

          ranking.forEach(
            ([id, pontos], index) => {
              texto +=
                `**${index + 1}.** <@${id}> — **${pontos} pts**\n`;
            }
          );

          await interaction.reply({
            content: texto
          });

          return;
        }

        // =========================
        // /EDITRANKINGCHAVES
        // =========================

        if (
          interaction.commandName ===
          "editrankingchaves"
        ) {
          const numero =
            interaction.options.getInteger(
              "chave"
            );

          const dados =
            garantirMesAtual();

          const chave =
            dados.chaves.find(
              c =>
                c.numero ===
                  numero &&
                c.mes ===
                  dados.mesAtual
            );

          if (!chave) {
            return interaction.reply({
              content:
                "❌ Chave não encontrada neste mês.",
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

          const resultado = {
            campeao:
              chave.resultado.campeao,

            vice:
              chave.resultado.vice,

            passou1:
              chave.resultado.passou1,

            passou2:
              chave.resultado.passou2
          };

          resultadosPendentes.set(
            `${interaction.user.id}_${numero}`,
            resultado
          );

          await interaction.reply({
            content:
              `✏️ **EDITAR RESULTADO — CHAVE ${numero}**\n\n` +
              `Selecione novamente os resultados abaixo.`,

            components:
              criarComponentesResultado(
                numero,
                resultado,
                chave.participantes
              ),

            ephemeral: true
          });

          return;
        }

        // =========================
        // /LIMPARRANKING
        // =========================

        if (
          interaction.commandName ===
          "limparranking"
        ) {
          const row =
            new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(
                    "confirmar_limpar_ranking"
                  )
                  .setLabel(
                    "Confirmar"
                  )
                  .setStyle(
                    ButtonStyle.Danger
                  ),

                new ButtonBuilder()
                  .setCustomId(
                    "cancelar_limpar_ranking"
                  )
                  .setLabel(
                    "Cancelar"
                  )
                  .setStyle(
                    ButtonStyle.Secondary
                  )
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
      // SELECT MENUS
      // =====================================

      if (
        interaction.isUserSelectMenu() ||
        interaction.isStringSelectMenu()
      ) {
        const partes =
          interaction.customId.split(
            "_"
          );

        if (
          partes[0] === "criar" &&
          partes[1] === "chave" &&
          partes[2] === "select"
        ) {
          const chaveDados =
            partes.slice(3).join("_");

          const pendente =
            criacoesPendentes.get(chaveDados);

          if (!pendente) {
            return interaction.reply({
              content:
                "❌ Esta criação de chave expirou. Use `/chavesbdr` novamente.",
              ephemeral: true
            });
          }

          pendente.participantes =
            [...interaction.values];

          const seletor =
            new UserSelectMenuBuilder()
              .setCustomId(
                `criar_chave_select_${chaveDados}`
              )
              .setPlaceholder(
                `Selecionar ${pendente.tamanho} MCs`
              )
              .setMinValues(pendente.tamanho)
              .setMaxValues(pendente.tamanho);

          const confirmar =
            new ButtonBuilder()
              .setCustomId(
                `confirmar_criacao_chave_${chaveDados}`
              )
              .setLabel("Criar chave")
              .setStyle(ButtonStyle.Success)
              .setDisabled(
                pendente.participantes.length !==
                  pendente.tamanho
              );

          await interaction.update({
            content:
              `╭━━━━━━〔 ☀️ NOVA CHAVE BDR 〕━━━━━━╮\n\n` +
              `📊 **Tamanho:** ${pendente.tamanho} MCs\n\n` +
              `👥 **Participantes selecionados:**\n` +
              `${textoParticipantes(pendente.participantes)}\n\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
            components: [
              new ActionRowBuilder().addComponents(seletor),
              new ActionRowBuilder().addComponents(confirmar)
            ]
          });

          return;
        }

        if (
          partes[0] ===
            "resultado" &&
          partes[1] ===
            "select"
        ) {
          const numero =
            Number(partes[2]);

          const campo =
            partes[3];

          const chaveDados =
            `${interaction.user.id}_${numero}`;

          let resultado =
            resultadosPendentes.get(
              chaveDados
            );

          if (!resultado) {
            resultado = {
              campeao: null,
              vice: null,
              passou1: null,
              passou2: null
            };
          }

          resultado[campo] =
            interaction.values[0];

          resultadosPendentes.set(
            chaveDados,
            resultado
          );

          const dadosResultado =
            garantirMesAtual();

          const chaveResultado =
            dadosResultado.chaves.find(
              c =>
                c.numero === numero &&
                c.mes === dadosResultado.mesAtual
            );

          await interaction.update({
            content:
              `╭━━━━〔 🏆 RESULTADO DA CHAVE #${numero} 〕━━━━╮\n\n` +
              `🥇 **Campeão:** ${
                resultado.campeao
                  ? `<@${resultado.campeao}>`
                  : "⏳ não selecionado"
              }\n` +
              `🥈 **Vice:** ${
                resultado.vice
                  ? `<@${resultado.vice}>`
                  : "⏳ não selecionado"
              }\n` +
              `✅ **Classificado:** ${
                resultado.passou1
                  ? `<@${resultado.passou1}>`
                  : "⏳ não selecionado"
              }\n` +
              `✅ **Classificado:** ${
                resultado.passou2
                  ? `<@${resultado.passou2}>`
                  : "⏳ não selecionado"
              }\n\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,

            components:
              criarComponentesResultado(
                numero,
                resultado,
                chaveResultado
                  ? chaveResultado.participantes
                  : []
              )
          });

          return;
        }
      }

      // =====================================
      // BOTÕES
      // =====================================

      if (
        interaction.isButton()
      ) {

        // =========================
        // CONFIRMAR CRIAÇÃO DE CHAVE
        // =========================

        if (
          interaction.customId.startsWith(
            "confirmar_criacao_chave_"
          )
        ) {
          const chaveDados =
            interaction.customId.replace(
              "confirmar_criacao_chave_",
              ""
            );

          const pendente =
            criacoesPendentes.get(chaveDados);

          if (!pendente) {
            return interaction.reply({
              content:
                "❌ Esta criação de chave expirou. Use `/chavesbdr` novamente.",
              ephemeral: true
            });
          }

          if (
            pendente.participantes.length !==
            pendente.tamanho
          ) {
            return interaction.reply({
              content:
                `❌ Selecione exatamente **${pendente.tamanho} MCs** antes de criar a chave.`,
              ephemeral: true
            });
          }

          const dados =
            garantirMesAtual();

          const numero =
            dados.proximaChave;

          const chave = {
            numero,
            mes: dados.mesAtual,
            tamanho: pendente.tamanho,
            participantes:
              pendente.participantes,
            confrontos:
              criarConfrontos(
                pendente.participantes
              ),
            fechada: false,
            resultado: null,
            criadaPor:
              interaction.user.id,
            criadaEm:
              new Date().toISOString()
          };

          dados.chaves.push(chave);
          dados.proximaChave++;

          salvarChaves(dados);
          criacoesPendentes.delete(chaveDados);

          const confrontosTexto =
            chave.confrontos
              .map(
                (confronto, index) =>
                  `**${index + 1}.** <@${confronto.mc1}> × <@${confronto.mc2}>`
              )
              .join("\n");

          const row =
            new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(
                    `encerrar_chave_${numero}`
                  )
                  .setLabel("Encerrar chave")
                  .setStyle(
                    ButtonStyle.Success
                  )
              );

          await interaction.update({
            content:
              `╭━━━━━━〔 ☀️ CHAVE BDR #${numero} 〕━━━━━━╮\n\n` +
              `⚔️ **CONFRONTOS**\n\n` +
              `${confrontosTexto}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━\n\n` +
              `📌 **Status:** 🟢 Em andamento\n\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
            components: [row]
          });

          return;
        }

        // =========================
        // ENCERRAR CHAVE
        // =========================

        if (
          interaction.customId.startsWith(
            "encerrar_chave_"
          )
        ) {
          const numero =
            Number(
              interaction.customId.replace(
                "encerrar_chave_",
                ""
              )
            );

          const dados =
            garantirMesAtual();

          const chave =
            dados.chaves.find(
              c =>
                c.numero ===
                  numero &&
                c.mes ===
                  dados.mesAtual
            );

          if (!chave) {
            return interaction.reply({
              content:
                "❌ Chave não encontrada.",
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

          const chaveDados =
            `${interaction.user.id}_${numero}`;

          const resultadoExistente = {
            campeao: null,
            vice: null,
            passou1: null,
            passou2: null
          };

          resultadosPendentes.set(
            chaveDados,
            resultadoExistente
          );

          await interaction.reply({
            content:
              `╭━━━━〔 🏆 RESULTADO DA CHAVE #${numero} 〕━━━━╮\n\n` +
              `Selecione os participantes do resultado:\n\n` +
              `🥇 **Campeão**\n` +
              `🥈 **Vice-campeão**\n` +
              `✅ **Classificado**\n` +
              `✅ **Classificado**\n\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,

            components:
              criarComponentesResultado(
                numero,
                resultadoExistente,
                chave.participantes
              ),

            ephemeral: true
          });

          return;
        }

        // =========================
        // CONFIRMAR RESULTADO
        // =========================

        if (
          interaction.customId.startsWith(
            "confirmar_resultado_"
          )
        ) {
          const numero =
            Number(
              interaction.customId.replace(
                "confirmar_resultado_",
                ""
              )
            );

          const chaveDados =
            `${interaction.user.id}_${numero}`;

          const resultado =
            resultadosPendentes.get(
              chaveDados
            );

          if (!resultado) {
            return interaction.reply({
              content:
                "❌ Resultado não encontrado. Abra novamente a chave.",

              ephemeral: true
            });
          }

          const ids = [
            resultado.campeao,
            resultado.vice,
            resultado.passou1,
            resultado.passou2
          ];

          if (
            ids.some(
              id => !id
            )
          ) {
            return interaction.reply({
              content:
                "❌ Selecione todos os quatro resultados.",

              ephemeral: true
            });
          }

          if (
            new Set(ids).size !==
            ids.length
          ) {
            return interaction.reply({
              content:
                "❌ Um mesmo MC não pode ocupar duas posições.",

              ephemeral: true
            });
          }

          const dados =
            garantirMesAtual();

          const chave =
            dados.chaves.find(
              c =>
                c.numero ===
                  numero &&
                c.mes ===
                  dados.mesAtual
            );

          if (!chave) {
            return interaction.reply({
              content:
                "❌ Chave não encontrada.",
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

          for (
            const id of ids
          ) {
            if (
              !chave.participantes.includes(
                id
              )
            ) {
              return interaction.reply({
                content:
                  `❌ <@${id}> não participou desta chave.`,

                ephemeral: true
              });
            }
          }

          chave.resultado = {
            campeao:
              resultado.campeao,

            vice:
              resultado.vice,

            passou1:
              resultado.passou1,

            passou2:
              resultado.passou2
          };

          chave.fechada =
            true;

          chave.encerradaPor =
            interaction.user.id;

          chave.encerradaEm =
            new Date().toISOString();

          recalcularRanking(
            dados,
            dados.mesAtual
          );

          resultadosPendentes.delete(
            chaveDados
          );

          await interaction.update({
            content:
              `╭━━━━〔 🏆 RESULTADO OFICIAL 〕━━━━╮\n\n` +
              `☀️ **CHAVE #${numero}**\n\n` +
              `🥇 <@${ids[0]}>\n` +
              `🥈 <@${ids[1]}>\n\n` +
              `✅ <@${ids[2]}>\n` +
              `✅ <@${ids[3]}>\n\n` +
              `━━━━━━━━━━━━━━━━━━━━\n\n` +
              `📊 **PONTUAÇÃO REGISTRADA**\n\n` +
              `🥇 Campeão ........ **+5**\n` +
              `🥈 Vice ........... **+3**\n` +
              `✅ Classificado ... **+1**\n` +
              `✅ Classificado ... **+1**\n\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,

            components: []
          });

          return;
        }

        // =========================
        // CONFIRMAR LIMPEZA
        // =========================

        if (
          interaction.customId ===
          "confirmar_limpar_ranking"
        ) {
          const dados =
            carregarChaves();

          const mesAnterior =
            dados.mesAtual;

          if (mesAnterior) {
            dados.historicoMeses.push({
              mes:
                mesAnterior,

              ranking:
                dados.ranking,

              encerradoEm:
                new Date().toISOString()
            });
          }

          dados.ranking = {};

          dados.mesAtual =
            mesAtual();

          salvarChaves(
            dados
          );

          await interaction.update({
            content:
              `✅ **Ranking encerrado!**\n\n` +
              `🏆 O ranking de **${nomeMes(dados.mesAtual)}** começou agora.`,

            components: []
          });

          return;
        }

        // =========================
        // CANCELAR LIMPEZA
        // =========================

        if (
          interaction.customId ===
          "cancelar_limpar_ranking"
        ) {
          await interaction.update({
            content:
              "❌ Limpeza cancelada.",

            components: []
          });

          return;
        }
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
        await interaction
          .reply({
            content:
              "❌ Ocorreu um erro ao executar essa ação.",

            ephemeral: true
          })
          .catch(() => {});
   }
    }
  }
);

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
