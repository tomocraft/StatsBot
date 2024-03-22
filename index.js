const { createCanvas, Image } = require('canvas');

const fs = require('fs');

const token = 'Your discord bot token';

const subTitle = 'SAMPLE  -  TOMOWARS';

const { Client, GatewayIntentBits, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages]
});

class PlayerInfoManager {
    constructor(filePath) {
        this.filePath = filePath;
        this.players = this.loadPlayers();
    }

    loadPlayers() {
        try {
            const data = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error loading player info: ${error.message}`);
            return [];
        }
    }

    getPlayerByName(name) {
        const lowerCaseName = name.toLowerCase();
        return this.players.find(player => player.name.toLowerCase() === lowerCaseName) || null;
    }
}

const commands = [
    {
        name: 'stats',
        description: 'MCIDを指定してステータス画像を作ります(テスト)',
        options: [
            {
                name: "mcid",
                description: "MCIDを指定します",
                type: 3,
                required: true,
            },
        ],
    },
];

client.once('ready', () => {
    const rest = new REST({ version: '9' }).setToken(token);
    (async () => {
        try {
            console.log('Started refreshing application (/) commands.');
            const response = await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands },
            );
            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    })();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'stats') {
        const mcid = interaction.options.getString('mcid');
        await interaction.deferReply({
            ephemeral: true,
        });
        createStats(mcid)
            .then(() => {
                const file = new AttachmentBuilder('./output/output.png');
                const embed = new EmbedBuilder()
                    .setColor(0x4B4B4B)
                    .setImage('attachment://output.png')
                    .setFooter({ text: "by " + interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynamic: true, size: 256 }) });
                interaction.deleteReply();
                interaction.channel.send({ embeds: [embed], files: [file] });
            })
            .catch((err) => {
                interaction.editReply({
                    content: err,
                });
            });
        return;
    }
});

function createStats(mcid) {
    return new Promise((resolve, reject) => {
        const fileManager = new PlayerInfoManager('players.json');
        const infoData = fileManager.getPlayerByName(mcid);

        if (!infoData) reject('プレイヤーが見つかりませんでした');

        const info = {
            name: mcid,
            level: infoData.level,
            xp: infoData.xp,
            nextxp: infoData.nextxp,
            progress: calculateProgress(infoData.xp, infoData.nextxp),
            gold: infoData.gold,
            death: infoData.death,
            kill: infoData.kill,
            playtime: infoData.playtime,
            win: infoData.win,
            plays: infoData.plays
        };

        function calculateProgress(xp, nextxp) {
            return Math.floor(xp / nextxp * 1000) / 10;
        }

        const canvas = createCanvas(1920, 1080);

        const ctx = canvas.getContext('2d');

        const image = new Image();

        image.onerror = (err) => {
            reject('エラーが発生しました');
        };

        function calculateCenter(text, ctx) {
            return (canvas.width - ctx.measureText(text).width) / 2;
        }

        function calculateLeft(text, ctx) {
            return (canvas.width / 4 - ctx.measureText(text).width / 2);
        }

        function calculateRight(text, ctx) {
            return (3 * (canvas.width / 4) - ctx.measureText(text).width / 2);
        }

        function calculateTime(totalSeconds) {
            const hours = Math.floor(totalSeconds / 3600);

            let remainingSeconds = totalSeconds % 3600;

            const minutes = Math.floor(remainingSeconds / 60);

            remainingSeconds %= 60;

            const seconds = remainingSeconds;

            const formatTwoDigits = (num) => (num < 10 ? `0${num}` : num);

            return `${formatTwoDigits(hours)}:${formatTwoDigits(minutes)}:${formatTwoDigits(seconds)}`;
        }

        image.onload = () => {
            ctx.drawImage(image, 0, 0);

            ctx.font = 'reg 130px "Minecrafter"';
            ctx.fillStyle = '#55ff5f';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 10;
            ctx.shadowOffsetY = 10;

            ctx.fillText(info.name.toUpperCase(), calculateCenter(info.name.toUpperCase(), ctx), 190);

            ctx.font = 'bold 50px "Mojang"';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 4;

            ctx.fillText(subTitle, calculateCenter(subTitle, ctx), 270);

            ctx.font = '90px "OpenMine"';
            ctx.fillStyle = '#cdcdcd';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 4;

            ctx.fillText(`Lv.${info.level} ${info.xp}/${info.nextxp} (${info.progress}%)`, calculateCenter(`Lv.${info.level} ${info.xp}/${info.nextxp} (${Math.floor((info.xp / info.nextxp) * 100)}%)`, ctx), 350);

            const topMargin = 500;
            const rowHeight = 100;
            const subHeight = 240;
            const wowHeight = 340;

            ctx.font = '70px "Unifont"';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('ゴールド', calculateLeft('ゴールド', ctx), topMargin);
            ctx.fillText('デス数', calculateCenter('デス数', ctx), topMargin);
            ctx.fillText('キル数', calculateRight('キル数', ctx), topMargin);

            ctx.font = '120px "OpenMine"';
            ctx.fillStyle = '#cdcdcd';
            ctx.fillText(info.gold, calculateLeft(info.gold, ctx), topMargin + rowHeight);
            ctx.fillText(info.death, calculateCenter(info.death, ctx), topMargin + rowHeight);
            ctx.fillText(info.kill, calculateRight(info.kill, ctx), topMargin + rowHeight);

            ctx.font = '70px "Unifont"';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('プレイ時間', calculateLeft('プレイ時間', ctx), topMargin + subHeight);
            ctx.fillText('勝利数', calculateCenter('勝利数', ctx), topMargin + subHeight);
            ctx.fillText('プレイ回数', calculateRight('プレイ回数', ctx), topMargin + subHeight);

            ctx.font = '120px "OpenMine"';
            ctx.fillStyle = '#cdcdcd';
            ctx.fillText(calculateTime(info.playtime), calculateLeft(calculateTime(info.playtime), ctx), topMargin + wowHeight);
            ctx.fillText(info.win, calculateCenter(info.win, ctx), topMargin + wowHeight);
            ctx.fillText(info.plays, calculateRight(info.plays, ctx), topMargin + wowHeight);

            const buffer = canvas.toBuffer('image/png');

            fs.writeFileSync('./output/output.png', buffer);

            resolve(buffer);
        };

        image.src = './template/template.png';
    });
}

client.login(token);