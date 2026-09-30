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
  StringSelectMenuBuilder,
  EmbedBuilder
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

const resultadosPendentes = new Map();
const criacoesPendentes = new Map();
const trocasPendentes = new Map();

// ======================================================
// CORES
// ======================================================

const COR_BDR = 0xff8d00;
const COR_SUCESSO = 0x57f287;
const COR_ERRO = 0xed4245;
const COR_INFO = 0x5865f2;
const COR_AVISO = 0xffcc00;

// ======================================================
// INCORPORAÇÕES
// ======================================================

function embedBase(titulo, cor = COR_BDR) {
  retornar  novo  EmbedBuilder ( )
    . definirCor ( cor )
    . definirTítulo ( título )
    . setFooter ( {
      texto : "☀️ Batalha do Repente"
    } )
    . setTimestamp ( ) ;
}

function  embedAdv ( título , campos , cor = COR_BDR )  {
  const  embed = embedBase ( título , cor ) ;

  para  ( const  campo  de  campos )  {
    incorporar . adicionarCampos ( {
      nome : campo.nome ,​​
      valor : campo . valor ,
      inline : campo.inline ?? false​​
    } ) ;
  }

  retornar  incorporado ;
}

// ======================================================
// ARQUIVOS
// ======================================================

function  carregarArquivo ( arquivo , padrão )  {
  tentar  {
    if  ( ! fs . existsSync ( arquivo ) )  {
      fs.writeFileSync (​​
        arquivo ,
        JSON.stringify ( padrao , null , 2 )​​
      ) ;

      retornar  padrao ;
    }

    const  conteudo = fs . readFileSync (
      arquivo ,
      "utf8"
    ) ;

    if  ( ! conteudo . trim ( ) )  {
      fs.writeFileSync (​​
        arquivo ,
        JSON.stringify ( padrao , null , 2 )​​
      ) ;

      retornar  padrao ;
    }

    retornar  JSON . analisar ( conteudo ) ;
  }  catch  ( erro )  {
    console.erro (​​
      `Erro ao carregar ${ arquivo } :` ,
      erro
    ) ;

    retornar  padrao ;
  }
}

function salvarArquivo(arquivo, dados) {
  fs.writeFileSync(
    arquivo,
    JSON.stringify(dados, null, 2)
  );
}

// ======================================================
// ADVS
// ======================================================

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

// ======================================================
// CHAVES
// ======================================================

function carregarChaves() {
  const dados = carregarArquivo(
    CHAVES_FILE,
    {
      mesAtual: null,
      proximaChave: 1,
      chaves: [],
      ranking: {},
      organizacao: {},
      historicoMeses: []
    }
  );

  if (!dados.chaves) {
    dados.chaves = [];
  }

  if (!dados.ranking) {
    dados.ranking = {};
  }

  if (!dados.organizacao) {
    dados.organizacao = {};
  }

  if (!dados.historicoMeses) {
    dados.historicoMeses = [];
  }

  if (!dados.proximaChave) {
    dados.proximaChave = 1;
  }

  return dados;
}

function salvarChaves(dados) {
  salvarArquivo(
    CHAVES_FILE,
    dados
  );
}

// ======================================================
// MESES
// ======================================================

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
      organizacao: dados.organizacao,
      encerradoEm:
        new Date().toISOString()
    });

    dados.mesAtual = mes;
    dados.ranking = {};
    dados.organizacao = {};

    salvarChaves(dados);
  }

  return dados;
}

// ======================================================
// CARGOS ADV
// ======================================================

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

// ======================================================
// COMANDOS
// ======================================================

const comandos = [

  // ====================================================
  // ADV
  // ====================================================

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

  // ====================================================
  // CHAVES
  // ====================================================

  new SlashCommandBuilder()
    .setName("chavesbdr")
    .setDescription(
      "Cria uma nova chave da BDR."
    )
    .addIntegerOption(option =>
      option
        .setName("tamanho")
        .setDescription(
          "Quantidade de MCs na chave."
        )
        .setRequired(true)
        .addChoices(
          {
            name: "4 MCs",
            value: 4
          },
          {
            name: "8 MCs",
            value: 8
          }
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
    .setName("perfil")
    .setDescription(
      "Mostra o perfil de um MC nas Chaves BDR."
    )
    .addUserOption(option =>
      option
        .setName("membro")
        .setDescription(
          "MC que deseja consultar."
        )
        .setRequired(false)
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

// ======================================================
// REGISTRAR COMANDOS
// ======================================================

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

// ======================================================
// CONFRONTOS
// ======================================================

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

// ======================================================
// RANKING
// ======================================================

function recalcularRanking(
  dados,
  mes
) {
  const ranking = {};
  const organizacao = {};

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

    // Campeão
    adicionar(
      resultado.campeao,
      5
    );

    // Vice
    adicionar(
      resultado.vice,
      3
    );

    // Classificados
    if (
      Array.isArray(
        resultado.classificados
      )
    ) {
      for (
        const id of
        resultado.classificados
      ) {
        adicionar(
          id,
          1
        );
      }
    } else {
      // Compatibilidade com sistema antigo
      adicionar(
        resultado.passou1,
        1
      );

      adicionar(
        resultado.passou2,
        1
      );
    }

    // ==================================================
    // ORGANIZAÇÃO
    // ==================================================

    const organizador =
      chave.criadaPor;

    if (organizador) {
      if (!organizacao[organizador]) {
        organizacao[organizador] = 0;
      }

      organizacao[organizador] += 2;
    }
  }

  dados.ranking =
    ranking;

  dados.organizacao =
    organizacao;

  salvarChaves(
    dados
  );
}

// ======================================================
// MENUS DE RESULTADO
// ======================================================

function criarMenuResultado(
  numero,
  campo,
  placeholder,
  selecionado,
  participantes
) {
  const menu =
    new StringSelectMenuBuilder()
      .setCustomId(
        `resultado_select_${numero}_${campo}`
      )
      .setPlaceholder(
        placeholder
      )
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        participantes.map(
          (id, index) => ({
            label:
              `MC ${index + 1}`,
            description:
              `Selecionar ${id}`,
            value:
              id,
            default:
              selecionado === id
          })
        )
      );

  return new ActionRowBuilder()
    .addComponents(
      menu
    );
}

function criarComponentesResultado(
  numero,
  resultado,
  participantes
) {
  const componentes = [];

  // CAMPEÃO
  componentes.push(
    criarMenuResultado(
      numero,
      "campeao",
      "🥇 Selecionar campeão",
      resultado.campeao,
      participantes
    )
  );

  // VICE
  componentes.push(
    criarMenuResultado(
      numero,
      "vice",
      "🥈 Selecionar vice-campeão",
      resultado.vice,
      participantes
    )
  );

  // CLASSIFICADOS
  const quantidadeClassificados =
    participantes.length === 8 ? 4 : 2;

  const classificados =
    Array.isArray(resultado.classificados)
      ? resultado.classificados.filter(Boolean)
      : [];

  const menuClassificados =
    new StringSelectMenuBuilder()
      .setCustomId(
        `resultado_select_${numero}_classificados`
      )
      .setPlaceholder(
        `✅ Selecione ${quantidadeClassificados} classificados`
      )
      .setMinValues(
        quantidadeClassificados
      )
      .setMaxValues(
        quantidadeClassificados
      )
      .addOptions(
        participantes.map((id, index) => ({
          label: `MC ${index + 1}`,
          description: `Selecionar <@${id}>`,
          value: id,
          default: classificados.includes(id)
        }))
      );

  componentes.push(
    new ActionRowBuilder().addComponents(
      menuClassificados
    )
  );

  // CONFIRMAR
  const quantidadeNecessaria =
    2 + quantidadeClassificados;

  const ids = [
    resultado.campeao,
    resultado.vice,
    ...classificados
  ];

  const preenchido =
    ids.length === quantidadeNecessaria &&
    ids.every(Boolean);

  componentes.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `confirmar_resultado_${numero}`
        )
        .setLabel("Confirmar resultado")
        .setEmoji("🏆")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!preenchido)
    )
  );

  return componentes;
}
// ======================================================
// TEXTO PARTICIPANTES
// ======================================================

function textoParticipantes(ids) {
  if (!ids.length) {
    return "⏳ Nenhum MC selecionado.";
  }

  return ids
    .map(
      (id, i) =>
        `**${i + 1}.** <@${id}>`
    )
    .join("\n");
}

// ======================================================
// BOT ONLINE
// ======================================================

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

// ======================================================
// INTERAÇÕES
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {

    try {

      // ==================================================
      // SLASH COMMANDS
      // ==================================================

      if (
        interaction.isChatInputCommand()
      ) {

        // ================================================
        // ADV
        // ================================================

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
              embeds: [
                embedBase(
                  "❌ MEMBRO NÃO ENCONTRADO",
                  COR_ERRO
                ).setDescription(
                  "Não encontrei esse membro no servidor."
                )
              ],
              ephemeral: true
            });
          }

          if (
            membro.id ===
            interaction.user.id
          ) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ AÇÃO NÃO PERMITIDA",
                  COR_ERRO
                ).setDescription(
                  "Você não pode aplicar ADV em si mesmo."
                )
              ],
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
                .historico
                .length + 1,

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

          const campos = [
            {
              nome: "👤 Membro",
              valor:
                `<@${usuario.id}>`
            },
            {
              nome: "📌 ADV",
              valor:
                `**${numero}**`
            },
            {
              nome: "📝 Motivo",
              valor:
                `**${motivo}**`
            }
          ];

          let embed =
            embedAdv(
              "⚠️ ADVERTÊNCIA APLICADA",
              campos
            );

          if (numero === 2) {

            await membro
              .timeout(
                60 * 60 * 1000,
                `ADV 2: ${motivo}`
              )
              .catch(() => {});

            embed.addFields({
              name:
                "⏱️ Punição",
              value:
                "**Timeout de 1 hora.**"
            });
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

            embed.addFields({
              name:
                "⏱️ Punição",
              value:
                "**Timeout de 1 hora.**"
            });
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

            embed.addFields({
              name:
                "⏱️ Punição",
              value:
                "**Timeout de 1 dia.**"
            });
          }

          if (numero === 4) {

            embed.addFields({
              name:
                "🚪 Punição",
              value:
                "**Membro expulso do servidor.**"
            });

            await membro
              .kick(
                `ADV 4: ${motivo}`
              )
              .catch(() => {});
          }

          if (numero > 4) {
            embed.addFields({
              name:
                "⚠️ Observação",
              value:
                "**O membro já ultrapassou o limite de 4 ADVs.**"
            });
          }

          await interaction.reply({
            embeds: [
              embed
            ]
          });

          return;
        }

        // ================================================
        // ADVLIST
        // ================================================

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
              embeds: [
                embedBase(
                  "✅ NENHUMA ADVERTÊNCIA",
                  COR_SUCESSO
                ).setDescription(
                  `<@${usuario.id}> não possui advertências registradas.`
                )
              ],
              ephemeral: true
            });
          }

          const embed =
            embedBase(
              `⚠️ ADVERTÊNCIAS DE ${usuario.username}`
            );

          let descricao = "";

          for (
            const adv of
            registro.historico
          ) {
            descricao +=
              `**ADV ${adv.numero}** — ID ${adv.id}\n` +
              `📝 ${adv.motivo}\n` +
              `👮 <@${adv.aplicadoPor}>\n\n`;
          }

          embed.setDescription(
            descricao
          );

          await interaction.reply({
            embeds: [
              embed
            ]
          });

          return;
        }

        // ================================================
        // ADVREMOVE
        // ================================================

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
              embeds: [
                embedBase(
                  "❌ ADV NÃO ENCONTRADA",
                  COR_ERRO
                ).setDescription(
                  "Esse membro não possui ADVs."
                )
              ],
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
              embeds: [
                embedBase(
                  "❌ ADV NÃO ENCONTRADA",
                  COR_ERRO
                ).setDescription(
                  `Não encontrei a ADV **${id}** desse membro.`
                )
              ],
              ephemeral: true
            });
          }

          dados[usuario.id]
            .historico
            .splice(
              indice,
              1
            );

          salvarAdvs(
            dados
          );

          await interaction.reply({
            embeds: [
              embedBase(
                "✅ ADV REMOVIDA",
                COR_SUCESSO
              ).setDescription(
                `A ADV **${id}** de <@${usuario.id}> foi removida do histórico.`
              )
            ]
          });

          return;
        }

        // ================================================
        // ADVS
        // ================================================

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
            recentes.length ===
              0
          ) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "✅ ADVERTÊNCIAS",
                  COR_SUCESSO
                ).setDescription(
                  "Nenhuma advertência registrada."
                )
              ]
            });
          }

          let descricao = "";

          for (
            const adv of recentes
          ) {

            descricao +=
              `👤 <@${adv.userId}>\n` +
              `📌 **ADV ${adv.numero}**\n` +
              `📝 ${adv.motivo}\n` +
              `👮 <@${adv.aplicadoPor}>\n\n`;
          }

          await interaction.reply({
            embeds: [
              embedBase(
                "⚠️ ADVERTÊNCIAS RECENTES"
              ).setDescription(
                descricao
              )
            ]
          });

          return;
        }

        // ================================================
        // CHAVESBDR
        // ================================================

        if (
          interaction.commandName ===
          "chavesbdr"
        ) {

          const tamanho =
            interaction.options.getInteger(
              "tamanho"
            );

          const chaveDados =
            `${interaction.user.id}_${Date.now()}`;

          criacoesPendentes.set(
            chaveDados,
            {
              tamanho,
              participantes: []
            }
          );

          const seletor =
            new UserSelectMenuBuilder()
              .setCustomId(
                `criar_chave_select_${chaveDados}`
              )
              .setPlaceholder(
                `Selecionar ${tamanho} MCs`
              )
              .setMinValues(
                tamanho
              )
              .setMaxValues(
                tamanho
              );

          const confirmar =
            new ButtonBuilder()
              .setCustomId(
                `confirmar_criacao_chave_${chaveDados}`
              )
              .setLabel(
                "Criar chave"
              )
              .setEmoji("☀️")
              .setStyle(
                ButtonStyle.Success
              )
              .setDisabled(true);

          const embed =
            embedBase(
              "☀️ NOVA CHAVE BDR"
            )
              .setDescription(
                `📊 **Tamanho:** ${tamanho} MCs\n\n` +
                `Selecione os **${tamanho} MCs** que participarão da chave.\n\n` +
                `👥 **Participantes selecionados:**\n` +
                `⏳ Nenhum MC selecionado.`
              );

          await interaction.reply({
            embeds: [
              embed
            ],
            components: [
              new ActionRowBuilder()
                .addComponents(
                  seletor
                ),
              new ActionRowBuilder()
                .addComponents(
                  confirmar
                )
            ]
          });

          return;
        }

        // ================================================
        // RANKING
        // ================================================

        if (
          interaction.commandName ===
          "rankingchaves"
        ) {

          const dados =
            garantirMesAtual();

          recalcularRanking(
            dados,
            dados.mesAtual
          );

          const ranking =
            Object.entries(
              dados.ranking
            ).sort(
              (a, b) =>
                b[1] - a[1]
            );

          const embed =
            embedBase(
              `🏆 RANKING BDR — ${nomeMes(
                dados.mesAtual
              )}`
            );

          if (
            ranking.length ===
              0
          ) {
            embed.setDescription(
              "Ainda não existem pontos neste mês."
            );

            return interaction.reply({
              embeds: [
                embed
              ]
            });
          }

          let descricao = "";

          ranking.forEach(
            ([id, pontos], index) => {

              const medalha =
                index === 0
                  ? "🥇"
                  : index === 1
                  ? "🥈"
                  : index === 2
                  ? "🥉"
                  : `**${index + 1}.**`;

              descricao +=
                `${medalha} <@${id}> — **${pontos} pts**\n`;
            }
          );

          embed.setDescription(
            descricao
          );

          await interaction.reply({
            embeds: [
              embed
            ]
          });

          return;
        }

        // ================================================
        // PERFIL
        // ================================================

        if (
          interaction.commandName ===
          "perfil"
        ) {

          const usuario =
            interaction.options.getUser(
              "membro"
            ) ||
            interaction.user;

          const dados =
            garantirMesAtual();

          recalcularRanking(
            dados,
            dados.mesAtual
          );

          let pontos = 0;
          let titulos = 0;
          let participacoes = 0;

          for (
            const chave of
            dados.chaves
          ) {

            if (
              chave.mes !==
              dados.mesAtual
            ) {
              continue;
            }

            if (
              !chave.participantes.includes(
                usuario.id
              )
            ) {
              continue;
            }

            participacoes++;

            if (
              chave.resultado &&
              chave.resultado.campeao ===
                usuario.id
            ) {
              titulos++;
            }
          }

          pontos =
            dados.ranking[
              usuario.id
            ] || 0;

          const ranking =
            Object.entries(
              dados.ranking
            ).sort(
              (a, b) =>
                b[1] - a[1]
            );

          const posicao =
            ranking.findIndex(
              ([id]) =>
                id === usuario.id
            ) + 1;

          const embed =
            embedBase(
              `👤 PERFIL BDR — ${usuario.username}`
            );

          embed.addFields(
            {
              name:
                "🏆 Títulos",
              value:
                `**${titulos}**`,
              inline: true
            },
            {
              name:
                "📊 Pontuação",
              value:
                `**${pontos} pts**`,
              inline: true
            },
            {
              name:
                "⚔️ Participações",
              value:
                `**${participacoes}**`,
              inline: true
            },
            {
              name:
                "📍 Posição",
              value:
                posicao > 0
                  ? `**#${posicao}**`
                  : "**Sem posição**",
              inline: true
            }
          );

          await interaction.reply({
            embeds: [
              embed
            ]
          });

          return;
        }

        // ================================================
        // EDITAR RANKING
        // ================================================

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
              embeds: [
                embedBase(
                  "❌ CHAVE NÃO ENCONTRADA",
                  COR_ERRO
                ).setDescription(
                  `Não encontrei a Chave **#${numero}** neste mês.`
                )
              ],
              ephemeral: true
            });
          }

          if (!chave.resultado) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ SEM RESULTADO",
                  COR_ERRO
                ).setDescription(
                  "Essa chave ainda não possui resultado."
                )
              ],
              ephemeral: true
            });
          }

          const classificados =
            chave.resultado.classificados ||
            [
              chave.resultado.passou1,
              chave.resultado.passou2
            ].filter(Boolean);

          const resultado = {
            campeao:
              chave.resultado.campeao,

            vice:
              chave.resultado.vice,

            classificados: [
              ...classificados
            ]
          };

          resultadosPendentes.set(
            `${interaction.user.id}_${numero}`,
            resultado
          );

          const embed =
            embedBase(
              `✏️ EDITAR RESULTADO — CHAVE #${numero}`
            ).setDescription(
              "Selecione novamente os resultados da chave abaixo."
            );

          await interaction.reply({
            embeds: [
              embed
            ],
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

        // ================================================
        // LIMPAR RANKING
        // ================================================

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
                  .setEmoji("🧹")
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
            embeds: [
              embedBase(
                "⚠️ ENCERRAR RANKING",
                COR_AVISO
              ).setDescription(
                "Tem certeza que deseja encerrar o ranking atual?\n\n" +
                "O ranking será arquivado e um novo ranking será iniciado."
              )
            ],
            components: [
              row
            ],
            ephemeral: true
          });

          return;
        }
      }

      // ==================================================
      // SELECT MENUS
      // ==================================================

      if (
        interaction.isUserSelectMenu() ||
        interaction.isStringSelectMenu()
      ) {

        const partes =
          interaction.customId.split(
            "_"
          );

        // ==================================================
        // SELEÇÃO DE MCs DA CHAVE
        // ==================================================

        if (
          partes[0] === "criar" &&
          partes[1] === "chave" &&
          partes[2] === "select"
        ) {

          const chaveDados =
            partes
              .slice(3)
              .join("_");

          const pendente =
            criacoesPendentes.get(
              chaveDados
            );

          if (!pendente) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ CRIAÇÃO EXPIRADA",
                  COR_ERRO
                ).setDescription(
                  "Esta criação de chave expirou. Use `/chavesbdr` novamente."
                )
              ],
              ephemeral: true
            });
          }

          pendente.participantes =
            [
              ...interaction.values
            ];

          const seletor =
            new UserSelectMenuBuilder()
              .setCustomId(
                `criar_chave_select_${chaveDados}`
              )
              .setPlaceholder(
                `Selecionar ${pendente.tamanho} MCs`
              )
              .setMinValues(
                pendente.tamanho
              )
              .setMaxValues(
                pendente.tamanho
              );

          const confirmar =
            new ButtonBuilder()
              .setCustomId(
                `confirmar_criacao_chave_${chaveDados}`
              )
              .setLabel(
                "Criar chave"
              )
              .setEmoji("☀️")
              .setStyle(
                ButtonStyle.Success
              )
              .setDisabled(
                pendente.participantes.length !==
                  pendente.tamanho
              );

          const embed =
            embedBase(
              "☀️ NOVA CHAVE BDR"
            ).setDescription(
              `📊 **Tamanho:** ${pendente.tamanho} MCs\n\n` +
              `👥 **Participantes selecionados:**\n` +
              `${textoParticipantes(
                pendente.participantes
              )}`
            );

          await interaction.update({
            embeds: [
              embed
            ],
            components: [
              new ActionRowBuilder()
                .addComponents(
                  seletor
                ),
              new ActionRowBuilder()
                .addComponents(
                  confirmar
                )
            ]
          });

          return;
        }

        // ==================================================
        // RESULTADO
        // ==================================================

        if (
          partes[0] ===
          "resultado" &&
          partes[1] ===
            "select"
        ) {

          const numero =
            Number(
              partes[2]
            );

          const campo =
            partes
              .slice(3)
              .join("");

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
              classificados: []
            };
          }

          if (campo === "classificados") {
  resultado.classificados = [...interaction.values];
} else {
  resultado[campo] = interaction.values[0];
}

resultadosPendentes.set(
  chaveDados,
  resultado
);

const dados = garantirMesAtual();

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
              embeds: [
                embedBase(
                  "❌ CHAVE NÃO ENCONTRADA",
                  COR_ERRO
                )
              ],
              ephemeral: true
            });
          }

          const classificados =
            resultado.classificados ||
            [];

          const embed =
            embedBase(
              `🏆 RESULTADO DA CHAVE #${numero}`
            ).setDescription(
              `🥇 **Campeão:** ${
                resultado.campeao
                  ? `<@${resultado.campeao}>`
                  : "⏳ Não selecionado"
              }\n\n` +

              `🥈 **Vice:** ${
                resultado.vice
                  ? `<@${resultado.vice}>`
                  : "⏳ Não selecionado"
              }\n\n` +

              `✅ **Classificados:**\n` +
              (
                classificados.length
                  ? classificados
                      .map(
                        id =>
                          `<@${id}>`
                      )
                      .join("\n")
                  : "⏳ Nenhum selecionado"
              )
            );

          await interaction.update({
            embeds: [
              embed
            ],
            components:
              criarComponentesResultado(
                numero,
                resultado,
                chave.participantes
              )
          });

          return;
        }

        // ==================================================
        // TROCAR MC
        // ==================================================

        if (
          partes[0] ===
            "trocar" &&
          partes[1] ===
            "mc" &&
          partes[2] ===
            "selecionar"
        ) {

          const numero =
            Number(
              partes[3]
            );

          const tipo =
            partes[4];

          const chaveDados =
            `${interaction.user.id}_${numero}`;

          const pendente =
            trocasPendentes.get(
              chaveDados
            );

          if (!pendente) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ TROCA EXPIRADA",
                  COR_ERRO
                ).setDescription(
                  "Abra novamente o botão **Trocar MC**."
                )
              ],
              ephemeral: true
            });
          }

          if (
            tipo ===
              "antigo"
          ) {
            pendente.antigo =
              interaction.values[0];
          }

          if (
            tipo ===
              "novo"
          ) {
            pendente.novo =
              interaction.values[0];
          }

          trocasPendentes.set(
            chaveDados,
            pendente
          );

          const embed =
            embedBase(
              `🔄 TROCAR MC — CHAVE #${numero}`
            ).setDescription(
              `👤 **MC ausente:** ${
                pendente.antigo
                  ? `<@${pendente.antigo}>`
                  : "⏳ Não selecionado"
              }\n\n` +
              `🆕 **Novo MC:** ${
                pendente.novo
                  ? `<@${pendente.novo}>`
                  : "⏳ Não selecionado"
              }`
            );

          const confirmar =
            new ButtonBuilder()
              .setCustomId(
                `confirmar_troca_${numero}`
              )
              .setLabel(
                "Confirmar troca"
              )
              .setEmoji("🔄")
              .setStyle(
                ButtonStyle.Success
              )
              .setDisabled(
                !pendente.antigo ||
                !pendente.novo
              );

          await interaction.update({
            embeds: [
              embed
            ],
            components: [
              new ActionRowBuilder()
                .addComponents(
                  criarSeletorTrocaAntigo(
                    numero,
                    pendente.participantes,
                    pendente.antigo
                  )
                ),
              new ActionRowBuilder()
                .addComponents(
                  criarSeletorTrocaNovo(
                    numero,
                    pendente.participantes,
                    pendente.novo
                  )
                ),
              new ActionRowBuilder()
                .addComponents(
                  confirmar
                )
            ]
          });

          return;
        }
      }

      // ==================================================
      // BOTÕES
      // ==================================================

      if (
        interaction.isButton()
      ) {

        // ==================================================
        // CONFIRMAR CRIAÇÃO
        // ==================================================

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
            criacoesPendentes.get(
              chaveDados
            );

          if (!pendente) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ CRIAÇÃO EXPIRADA",
                  COR_ERRO
                ).setDescription(
                  "Use `/chavesbdr` novamente."
                )
              ],
              ephemeral: true
            });
          }

          if (
            pendente.participantes.length !==
            pendente.tamanho
          ) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ PARTICIPANTES INCOMPLETOS",
                  COR_ERRO
                ).setDescription(
                  `Selecione exatamente **${pendente.tamanho} MCs** antes de criar a chave.`
                )
              ],
              ephemeral: true
            });
          }

          const dados =
            garantirMesAtual();

          const numero =
            dados.proximaChave;

          const chave = {
            numero,
            mes:
              dados.mesAtual,
            tamanho:
              pendente.tamanho,
            participantes:
              pendente.participantes,
            confrontos:
              criarConfrontos(
                pendente.participantes
              ),
            fechada:
              false,
            resultado:
              null,
            criadaPor:
              interaction.user.id,
            criadaEm:
              new Date().toISOString()
          };

          dados.chaves.push(
            chave
          );

          dados.proximaChave++;

          salvarChaves(
            dados
          );

          criacoesPendentes.delete(
            chaveDados
          );

          const confrontosTexto =
            chave.confrontos
              .map(
                (
                  confronto,
                  index
                ) =>
                  `**${index + 1}.** <@${confronto.mc1}> × <@${confronto.mc2}>`
              )
              .join("\n");

          const embed =
            embedBase(
              `☀️ CHAVE BDR #${numero}`
            ).setDescription(
              `👥 **${tamanhoTexto(
                chave.tamanho
              )} MCs participantes**\n\n` +
              `⚔️ **CONFRONTOS**\n\n` +
              `${confrontosTexto}`
            )
              .addFields({
                name:
                  "📌 Status",
                value:
                  "🟢 **Em andamento**",
                inline: true
              });

          const row =
            new ActionRowBuilder()
              .addComponents(

                new ButtonBuilder()
                  .setCustomId(
                    `encerrar_chave_${numero}`
                  )
                  .setLabel(
                    "Encerrar chave"
                  )
                  .setEmoji("🏆")
                  .setStyle(
                    ButtonStyle.Success
                  ),

                new ButtonBuilder()
                  .setCustomId(
                    `trocar_mc_${numero}`
                  )
                  .setLabel(
                    "Trocar MC"
                  )
                  .setEmoji("🔄")
                  .setStyle(
                    ButtonStyle.Secondary
                  )
              );

          await interaction.update({
            embeds: [
              embed
            ],
            components: [
              row
            ]
          });

          return;
        }

        // ==================================================
        // ENCERRAR CHAVE
        // ==================================================

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
              embeds: [
                embedBase(
                  "❌ CHAVE NÃO ENCONTRADA",
                  COR_ERRO
                )
              ],
              ephemeral: true
            });
          }

          if (chave.fechada) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ CHAVE JÁ ENCERRADA",
                  COR_ERRO
                ).setDescription(
                  "Essa chave já foi encerrada."
                )
              ],
              ephemeral: true
            });
          }

          const chaveDados =
            `${interaction.user.id}_${numero}`;

          const resultadoExistente = {
            campeao:
              null,
            vice:
              null,
            classificados:
              []
          };

          resultadosPendentes.set(
            chaveDados,
            resultadoExistente
          );

          const embed =
            embedBase(
              `🏆 RESULTADO DA CHAVE #${numero}`
            ).setDescription(
              `Selecione os participantes do resultado abaixo.\n\n` +

              `🥇 **Campeão — +5 pts**\n` +
              `🥈 **Vice — +3 pts**\n` +
              `✅ **Classificados — +1 pt cada**`
            );

          await interaction.reply({
            embeds: [
              embed
            ],
            components:
              criarComponentesResultado(
                numero,
                resultadoExistente,
                chave.participantes
              )
          });

          return;
        }

        // ==================================================
        // TROCAR MC
        // ==================================================

        if (
          interaction.customId.startsWith(
            "trocar_mc_"
          )
        ) {

          const numero =
            Number(
              interaction.customId.replace(
                "trocar_mc_",
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
              embeds: [
                embedBase(
                  "❌ CHAVE NÃO ENCONTRADA",
                  COR_ERRO
                )
              ],
              ephemeral: true
            });
          }

          if (chave.fechada) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ CHAVE ENCERRADA",
                  COR_ERRO
                ).setDescription(
                  "Não é possível trocar MC depois do encerramento."
                )
              ],
              ephemeral: true
            });
          }

          const chaveDados =
            `${interaction.user.id}_${numero}`;

          const pendente = {
            participantes:
              [...chave.participantes],
            antigo:
              null,
            novo:
              null
          };

          trocasPendentes.set(
            chaveDados,
            pendente
          );

          const embed =
            embedBase(
              `🔄 TROCAR MC — CHAVE #${numero}`
            ).setDescription(
              `Use os dois seletores abaixo:\n\n` +
              `👤 **1. MC ausente:** selecione quem não apareceu.\n` +
              `🆕 **2. Novo MC:** selecione quem entrará no lugar.`
            );

          const confirmar =
            new ButtonBuilder()
              .setCustomId(
                `confirmar_troca_${numero}`
              )
              .setLabel(
                "Confirmar troca"
              )
              .setEmoji("🔄")
              .setStyle(
                ButtonStyle.Success
              )
              .setDisabled(true);

          await interaction.reply({
            embeds: [
              embed
            ],
            components: [
              new ActionRowBuilder()
                .addComponents(
                  criarSeletorTrocaAntigo(
                    numero,
                    chave.participantes,
                    null
                  )
                ),
              new ActionRowBuilder()
                .addComponents(
                  criarSeletorTrocaNovo(
                    numero,
                    chave.participantes,
                    null
                  )
                ),
              new ActionRowBuilder()
                .addComponents(
                  confirmar
                )
            ],
            ephemeral: true
          });

          return;
        }

        // ==================================================
        // CONFIRMAR TROCA
        // ==================================================

        if (
          interaction.customId.startsWith(
            "confirmar_troca_"
          )
        ) {

          const numero =
            Number(
              interaction.customId.replace(
                "confirmar_troca_",
                ""
              )
            );

          const chaveDados =
            `${interaction.user.id}_${numero}`;

          const pendente =
            trocasPendentes.get(
              chaveDados
            );

          if (!pendente) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ TROCA EXPIRADA",
                  COR_ERRO
                ).setDescription(
                  "Abra novamente o botão **Trocar MC**."
                )
              ],
              ephemeral: true
            });
          }

          if (
            !pendente.antigo ||
            !pendente.novo
          ) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ TROCA INCOMPLETA",
                  COR_ERRO
                ).setDescription(
                  "Selecione o MC ausente e o novo MC."
                )
              ],
              ephemeral: true
            });
          }

          if (
            pendente.antigo ===
            pendente.novo
          ) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ TROCA INVÁLIDA",
                  COR_ERRO
                ).setDescription(
                  "O novo MC não pode ser o mesmo MC que está sendo substituído."
                )
              ],
              ephemeral: true
            });
          }

          if (
            pendente.participantes.includes(
              pendente.novo
            )
          ) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ MC JÁ PARTICIPA",
                  COR_ERRO
                ).setDescription(
                  `<@${pendente.novo}> já está nesta chave.`
                )
              ],
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
              embeds: [
                embedBase(
                  "❌ CHAVE NÃO ENCONTRADA",
                  COR_ERRO
                )
              ],
              ephemeral: true
            });
          }

          if (chave.fechada) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ CHAVE ENCERRADA",
                  COR_ERRO
                )
              ],
              ephemeral: true
            });
          }

          const indice =
            chave.participantes.indexOf(
              pendente.antigo
            );

          if (indice === -1) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ MC NÃO ENCONTRADO",
                  COR_ERRO
                ).setDescription(
                  "O MC selecionado não pertence mais a esta chave."
                )
              ],
              ephemeral: true
            });
          }

          chave.participantes[
            indice
          ] =
            pendente.novo;

          for (
            const confronto of
            chave.confrontos
          ) {

            if (
              confronto.mc1 ===
                pendente.antigo
            ) {
              confronto.mc1 =
                pendente.novo;
            }

            if (
              confronto.mc2 ===
                pendente.antigo
            ) {
              confronto.mc2 =
                pendente.novo;
            }
          }

          salvarChaves(
            dados
          );

          trocasPendentes.delete(
            chaveDados
          );

          const confrontosTexto =
            chave.confrontos
              .map(
                (
                  confronto,
                  index
                ) =>
                  `**${index + 1}.** <@${confronto.mc1}> × <@${confronto.mc2}>`
              )
              .join("\n");

          const embed =
            embedBase(
              `☀️ CHAVE BDR #${numero}`
            )
              .setDescription(
                `⚔️ **CONFRONTOS ATUALIZADOS**\n\n` +
                confrontosTexto
              )
              .addFields({
                name:
                  "🔄 Troca realizada",
                value:
                  `<@${pendente.antigo}> → <@${pendente.novo}>`
              });

          const row =
            new ActionRowBuilder()
              .addComponents(

                new ButtonBuilder()
                  .setCustomId(
                    `encerrar_chave_${numero}`
                  )
                  .setLabel(
                    "Encerrar chave"
                  )
                  .setEmoji("🏆")
                  .setStyle(
                    ButtonStyle.Success
                  ),

                new ButtonBuilder()
                  .setCustomId(
                    `trocar_mc_${numero}`
                  )
                  .setLabel(
                    "Trocar MC"
                  )
                  .setEmoji("🔄")
                  .setStyle(
                    ButtonStyle.Secondary
                  )
              );

          await interaction.reply({
            embeds: [
              embed
            ],
            components: [
              row
            ]
          });

          return;
        }

        // ==================================================
        // CONFIRMAR RESULTADO
        // ==================================================

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
              embeds: [
                embedBase(
                  "❌ RESULTADO NÃO ENCONTRADO",
                  COR_ERRO
                ).setDescription(
                  "Abra novamente a chave."
                )
              ],
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
              embeds: [
                embedBase(
                  "❌ CHAVE NÃO ENCONTRADA",
                  COR_ERRO
                )
              ],
              ephemeral: true
            });
          }

          if (chave.fechada) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ CHAVE JÁ ENCERRADA",
                  COR_ERRO
                )
              ],
              ephemeral: true
            });
          }

          const quantidadeClassificados =
            chave.tamanho === 8
              ? 4
              : 2;

          const classificados =
            Array.isArray(
              resultado.classificados
            )
              ? resultado.classificados
              : [];

          if (
            classificados.length !==
            quantidadeClassificados ||
            classificados.some(
              id => !id
            )
          ) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ RESULTADO INCOMPLETO",
                  COR_ERRO
                ).setDescription(
                  `Selecione os **${quantidadeClassificados} classificados** desta chave.`
                )
              ],
              ephemeral: true
            });
          }

          if (
            !resultado.campeao ||
            !resultado.vice
          ) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ RESULTADO INCOMPLETO",
                  COR_ERRO
                ).setDescription(
                  "Selecione campeão e vice."
                )
              ],
              ephemeral: true
            });
          }

          const ids = [
            resultado.campeao,
            resultado.vice,
            ...classificados
          ];

          if (
            new Set(ids).size !==
            ids.length
          ) {
            return interaction.reply({
              embeds: [
                embedBase(
                  "❌ RESULTADO INVÁLIDO",
                  COR_ERRO
                ).setDescription(
                  "Um mesmo MC não pode ocupar duas posições."
                )
              ],
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
                embeds: [
                  embedBase(
                    "❌ MC INVÁLIDO",
                    COR_ERRO
                  ).setDescription(
                    `<@${id}> não participou desta chave.`
                  )
                ],
                ephemeral: true
              });
            }
          }

          chave.resultado = {
            campeao:
              resultado.campeao,

            vice:
              resultado.vice,

            classificados:
              [...classificados]
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

          const classificacaoTexto =
            classificados
              .map(
                id =>
                  `✅ <@${id}> — **+1 pt**`
              )
              .join("\n");

          const embed =
            embedBase(
              `🏆 RESULTADO OFICIAL — CHAVE #${numero}`
            )
              .setDescription(
                `🥇 **Campeão:** <@${resultado.campeao}> — **+5 pts**\n\n` +
                `🥈 **Vice:** <@${resultado.vice}> — **+3 pts**\n\n` +
                `✅ **Classificados:**\n${classificacaoTexto}`
              )
              .addFields({
                name:
                  "📊 Pontuação registrada",
                value:
                  `🥇 Campeão: **+5**\n` +
                  `🥈 Vice: **+3**\n` +
                  `✅ Cada classificado: **+1**`
              });

          if (
            chave.criadaPor
          ) {
            embed.addFields({
              name:
                "👑 Organização",
              value:
                `<@${chave.criadaPor}> recebeu **+2 pontos de organização**.`
            });
          }

          await interaction.update({
            embeds: [
              embed
            ],
            components: []
          });

          return;
        }

        // ==================================================
        // CONFIRMAR LIMPEZA
        // ==================================================

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

              organizacao:
                dados.organizacao,

              encerradoEm:
                new Date().toISOString()
            });
          }

          dados.ranking = {};
          dados.organizacao = {};

          dados.mesAtual =
            mesAtual();

          salvarChaves(
            dados
          );

          await interaction.update({
            embeds: [
              embedBase(
                "✅ RANKING ENCERRADO",
                COR_SUCESSO
              ).setDescription(
                `🏆 O ranking de **${nomeMes(
                  dados.mesAtual
                )}** começou agora.`
              )
            ],
            components: []
          });

          return;
        }

        // ==================================================
        // CANCELAR LIMPEZA
        // ==================================================

        if (
          interaction.customId ===
          "cancelar_limpar_ranking"
        ) {

          await interaction.update({
            embeds: [
              embedBase(
                "❌ LIMPEZA CANCELADA",
                COR_ERRO
              ).setDescription(
                "O ranking atual continua ativo."
              )
            ],
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
            embeds: [
              embedBase(
                "❌ ERRO",
                COR_ERRO
              ).setDescription(
                "Ocorreu um erro ao executar essa ação."
              )
            ],
            ephemeral: true
          })
          .catch(() => {});
      }
    }
  }
);

// ======================================================
// FUNÇÕES DOS SELETORES DE TROCA
// ======================================================

function criarSeletorTrocaAntigo(
  numero,
  participantes,
  selecionado
) {

  return new UserSelectMenuBuilder()
    .setCustomId(
      `trocar_mc_selecionar_${numero}_antigo`
    )
    .setPlaceholder(
      "👤 Selecionar MC ausente"
    )
    .setMinValues(1)
    .setMaxValues(1);
}

function criarSeletorTrocaNovo(
  numero,
  participantes,
  selecionado
) {

  return new UserSelectMenuBuilder()
    .setCustomId(
      `trocar_mc_selecionar_${numero}_novo`
    )
    .setPlaceholder(
      "🆕 Selecionar novo MC"
    )
    .setMinValues(1)
    .setMaxValues(1);
}

function tamanhoTexto(tamanho) {
  return tamanho === 8
    ? "8"
    : "4";
}

// ======================================================
// LOGIN
// ======================================================

if (!TOKEN) {

  console.error(
    "❌ DISCORD_TOKEN não encontrado."
  );

  process.exit(1);
}

client.login(TOKEN);
