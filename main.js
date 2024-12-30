const express = require('express');
const { createClient } = require('bedrock-protocol');
const config = require('./config.js'); // Import your config file

const app = express();
const port = 3000; // Port for the Express server

let mcBot;
let botPosition = { x: 0, y: 0, z: 0 };
let runtimeEntityId = null;

// Create Minecraft Bot with Bedrock Protocol
const createMinecraftBot = () => {
  mcBot = createClient({
    host: config.minecraft.host,
    port: config.minecraft.port,
    username: config.minecraft.username,
    offline: false,
    auth: config.minecraft.auth,
  });

  // Handle the bot start game event
  mcBot.on('start_game', (packet) => {
    runtimeEntityId = packet.runtime_entity_id;
    console.log(`Runtime Entity ID saved: ${runtimeEntityId}`);

    mcBot.queue('serverbound_loading_screen', {
      "type": 1
    });
    mcBot.queue('serverbound_loading_screen', {
      "type": 2
    });
    mcBot.queue('interact', {
      "action_id": "mouse_over_entity",
      "target_entity_id": 0n,
      "position": { x: 0, y: 0, z: 0 }
    });

    mcBot.queue('set_local_player_as_initialized', {
      "runtime_entity_id": runtimeEntityId
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

  // Handle errors
  mcBot.on('error', (err) => {
    console.error('Minecraft Bot Error:', err);
  });

  // Handle disconnection
  mcBot.on('end', () => {
    console.log('Bot disconnected.');
  });

  // Log when the bot is connecting
  mcBot.on('connect', () => {
    console.log('Bot is connecting...');
  });
};

// Stop the Minecraft bot
const stopMinecraftBot = () => {
  if (mcBot) {
    mcBot.end();
    console.log('Bot has been stopped.');
  }
};

// Web Routes
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>MCPE Bot Control</h1>
        <p>Status: <span id="status">Loading...</span></p>
        <button onclick="startBot()">Start Bot</button>
        <button onclick="stopBot()">Stop Bot</button>
        <br/><br/>
        <div>
          <h2>Bot Position:</h2>
          <pre id="botPosition">Loading...</pre>
        </div>
        <script>
          async function fetchStatus() {
            const status = await fetch('/status');
            const text = await status.text();
            document.getElementById('status').textContent = text;
          }

          async function fetchPosition() {
            const position = await fetch('/position');
            const text = await position.text();
            document.getElementById('botPosition').textContent = text;
          }

          async function startBot() {
            await fetch('/start');
            fetchStatus();
            fetchPosition();
          }

          async function stopBot() {
            await fetch('/stop');
            fetchStatus();
            fetchPosition();
          }

          fetchStatus();
          fetchPosition();
        </script>
      </body>
    </html>
  `);
});

// Start the Minecraft bot via API
app.get('/start', (req, res) => {
  if (!mcBot) {
    createMinecraftBot();
    res.send('Bot started!');
  } else {
    res.send('Bot is already running.');
  }
});

// Stop the Minecraft bot via API
app.get('/stop', (req, res) => {
  stopMinecraftBot();
  res.send('Bot stopped!');
});

// Get bot's current position
app.get('/position', (req, res) => {
  res.send(`Bot Position: x=${botPosition.x}, y=${botPosition.y}, z=${botPosition.z}`);
});

// Get bot's current status (online or offline)
app.get('/status', (req, res) => {
  if (mcBot) {
    res.send('Bot is online!');
  } else {
    res.send('Bot is offline!');
  }
});

// Start the web server
app.listen(port, () => {
  console.log(`Web server running on http://localhost:${port}`);
});
