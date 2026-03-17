import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import { handleMessage } from './handlers/messageHandler.js';
import { registerSlashCommands } from './commands/index.js';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

client.commands = new Collection();

// 机器人就绪
client.once('ready', async () => {
  console.log(`✅ Discord bot logged in as ${client.user.tag}`);
  
  // 注册斜杠命令
  try {
    await registerSlashCommands(client);
    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error('❌ Failed to register slash commands:', error);
  }
  
  // 设置状态
  client.user.setPresence({
    activities: [{ name: '和你聊天 💕' }],
    status: 'online'
  });
});

// 处理消息
client.on('messageCreate', async (message) => {
  // 忽略机器人自己的消息
  if (message.author.bot) return;
  
  // 只响应 DM 或提及
  const isDM = !message.guild;
  const isMentioned = message.mentions.has(client.user);
  
  if (isDM || isMentioned) {
    await handleMessage(message, client);
  }
});

// 处理斜杠命令
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Command error:', error);
    const reply = {
      content: '执行命令时出错了 😢',
      ephemeral: true
    };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// 错误处理
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// 登录 (仅在启用 Discord 时)
if (process.env.ENABLE_DISCORD === 'true' && process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN).catch((error) => {
    console.error('❌ Failed to login to Discord:', error);
  });
} else {
  console.log('ℹ️ Discord bot is disabled or token not configured');
}

export default client;
