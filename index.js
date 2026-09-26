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

// Arquivo onde as advertências ficam salvas
const FILE = "./advs.json";

if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
}

function carregarAdvs() {
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function salvarAdvs(advs) {
  fs.writeFileSync(FILE, JSON.stringify(advs, null, 2));
}

// Comando /adv
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
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("Registrando comando /adv...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("Comando /adv registrado!");
  } catch (error) {
    console.error(error);
  }
})();

client.once("ready", () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "adv") {
    const membro = interaction.options.getUser("membro");
    const motivo = interaction.options.getString("motivo");

    const advs = carregarAdvs();

    if (!advs[membro.id]) {
      advs[membro.id] = {
        total: 0,
        historico: []
      };
    }

    advs[membro.id].total += 1;

    const numero = advs[membro.id].total;

    advs[membro.id].historico.push({
      motivo: motivo,
      data: new Date().toISOString(),
      aplicador: interaction.user.id
    });

    salvarAdvs(advs);

    let proximaConsequencia = "";

    if (numero === 1) {
      proximaConsequencia = "A próxima advertência será a 2ª.";
    } else if (numero === 2) {
      proximaConsequencia = "A próxima advertência poderá resultar em suspensão de 24h.";
    } else {
      proximaConsequencia = "A equipe da BDR deverá avaliar a próxima consequência.";
    }

    await interaction.reply({
      content:
        `⚠️ **ADVERTÊNCIA APLICADA**\n\n` +
        `👤 **Membro:** ${membro}\n` +
        `📋 **Advertência:** ${numero}\n` +
        `📝 **Motivo:** ${motivo}\n\n` +
        `📌 ${proximaConsequencia}`,
      ephemeral: false
    });

    try {
      await membro.send(
        `⚠️ **Você recebeu uma advertência na BDR.**\n\n` +
        `📋 **Advertência:** ${numero}\n` +
        `📝 **Motivo:** ${motivo}\n\n` +
        `${proximaConsequencia}`
      );
    } catch (error) {
      console.log("Não foi possível enviar DM para o membro.");
    }
  }
});

client.login(TOKEN);
