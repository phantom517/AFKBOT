const { createClient } = require('bedrock-protocol');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const config = require('./config.js'); // Import your config file

let mcBot;
let botPosition = { x: 0, y: 0, z: 0 };
let runtimeEntityId = null;
const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Auto-correct function
function autoCorrect(text, correction) {
    const reg = new RegExp(Object.keys(correction).join("|"), "g");
    return text.replace(reg, (matched) => correction[matched]);
}

// Connect to Discord
const setupDiscordBot = () => {
    discordClient.once('ready', () => {
        console.log(`Discord bot logged in as ${discordClient.user.tag}`);
    });

    discordClient.on('messageCreate', (message) => {
        if (!message.author.bot && message.channel.id === config.discord.channelId) {
            const msg = message.content;
            if (mcBot) {
                mcBot.queue('text', {
                    type: 'chat',
                    needs_translation: false,
                    source_name: mcBot.username,
                    xuid: '',
                    platform_chat_id: '',
                    filtered_message: '',
                    message: msg,
                });
                console.log(`Sent to Minecraft: ${msg}`);
            }
        }
    });

    discordClient.on('error', (err) => {
        console.error('Discord Bot Error:', err);
    });

    discordClient.login(config.discord.token);
};

// Send a message to Discord
const sendToDiscord = (playerName, playerMessage) => {
    const channel = discordClient.channels.cache.get(config.discord.channelId);
    if (channel) {
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Minecraft Chat Message')
            .addFields(
                { name: 'Player', value: playerName, inline: true },
                { name: 'Message', value: playerMessage, inline: true }
            )
            .setTimestamp();

        channel.send({ embeds: [embed] });
    } else {
        console.error('Discord channel not found! Check the channel ID in the config.');
    }
};

// Create Minecraft Bot with Bedrock Protocol
const createMinecraftBot = () => {
    mcBot = createClient({
        host: config.minecraft.host,
        port: config.minecraft.port,
        username: config.minecraft.username,
        offline: false,
        auth: config.minecraft.auth,
    });

    console.log('Connecting to the server...');

    // Handle the bot start game event
    mcBot.on('start_game', (packet) => {
        runtimeEntityId = packet.runtime_entity_id;
        console.log(`Runtime Entity ID: ${runtimeEntityId}`);

        // Initialize the player
        mcBot.queue('serverbound_loading_screen', { type: 1 });
        mcBot.queue('serverbound_loading_screen', { type: 2 });
        mcBot.queue('set_local_player_as_initialized', {
            runtime_entity_id: runtimeEntityId,
        });
    });

    // Handle spawn event
    mcBot.on('spawn', () => {
        console.log('Bot has spawned into the world.');
        if (mcBot.entity) {
            botPosition = mcBot.entity.position || { x: 0, y: 0, z: 0 };
            console.log(`Spawn Coordinates: x=${botPosition.x}, y=${botPosition.y}, z=${botPosition.z}`);
        } else {
            console.error('Error: mcBot.entity is undefined after spawn.');
        }
    });

    // Track bot's position during movement
    mcBot.on('move', () => {
        if (mcBot.entity) {
            botPosition = mcBot.entity.position || { x: 0, y: 0, z: 0 };
            console.log(`Moved to: x=${botPosition.x}, y=${botPosition.y}, z=${botPosition.z}`);
        } else {
            console.error('Error: mcBot.entity is undefined during move event.');
        }
    });

    // Listen for experience updates
    mcBot.on('update_attributes', (packet) => {
        const experienceLevel = packet.attributes.find(attr => attr.name === 'current');
        console.log(packet)
        const channel = discordClient.channels.cache.get(config.discord.channelId);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('Player Experience Update')
                    .addFields(
                        { name: 'Level', value: `${JSON.stringify(packet)}`, inline: true }
                    )
                    .setTimestamp();

                channel.send({ embeds: [embed] });
            } else {
                console.error('Discord channel not found! Check the channel ID in the config.');
            }

    });


    

    // Handle chat messages from the server and send to Discord
    mcBot.on('text', (packet) => {
        if (packet.type === 'chat') {
            const message = packet.message.replace(/§[0-9a-fk-or]/g, ''); // Remove formatting codes
            sendToDiscord('Minecraft', message);
        }
    });

    // Handle bot connection event
    mcBot.on('connect', () => {
        console.log('Bot is connecting...');
    });

    // Handle disconnection
    mcBot.on('end', () => {
        console.log('Bot has disconnected from the server.');
    });

    // Handle errors
    mcBot.on('error', (err) => {
        console.error('Minecraft Bot Error:', err);
    });
};

// Stop the Minecraft bot
const stopMinecraftBot = () => {
    if (mcBot) {
        mcBot.end();
        console.log('Bot has been stopped.');
        mcBot = null;
    } else {
        console.log('Bot is not running.');
    }
};

// Main function to control the bot
const main = () => {
    console.log('Starting Minecraft and Discord bots...');
    setupDiscordBot();
    createMinecraftBot();
};

// Start the script
main();
