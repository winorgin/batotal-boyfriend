import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { getUserStats } from './stats.js';
import { rechargeCommand } from './recharge.js';
import { bindAccountCommand } from './bind.js';
import { profileCommand } from './profile.js';

const commands = [
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('查看你的统计信息'),
  
  new SlashCommandBuilder()
    .setName('recharge')
    .setDescription('充值 DOL')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('充值金额（元）')
        .setRequired(true)
        .addChoices(
          { name: '10元 (100 DOL)', value: 10 },
          { name: '30元 (300 DOL)', value: 30 },
          { name: '50元 (500 DOL)', value: 50 },
          { name: '100元 (1000 DOL)', value: 100 }
        )
    ),
  
  new SlashCommandBuilder()
    .setName('bind')
    .setDescription('绑定 Web 账号')
    .addStringOption(option =>
      option.setName('code')
        .setDescription('Web 端生成的绑定码')
        .setRequired(true)
    ),
  
  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('查看你的个人资料')
].map(command => command.toJSON());

export async function registerSlashCommands(client) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  
  try {
    console.log('开始注册斜杠命令...');
    
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    
    // 注册命令处理器
    client.commands.set('stats', { execute: getUserStats });
    client.commands.set('recharge', { execute: rechargeCommand });
    client.commands.set('bind', { execute: bindAccountCommand });
    client.commands.set('profile', { execute: profileCommand });
    
    console.log('✅ 斜杠命令注册成功');
  } catch (error) {
    console.error('❌ 注册斜杠命令失败:', error);
    throw error;
  }
}
