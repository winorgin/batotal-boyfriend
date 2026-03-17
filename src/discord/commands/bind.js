import { EmbedBuilder } from 'discord.js';
import { getOrCreateUserByPlatform, bindPlatform } from '../../services/supabase.js';

export async function bindAccountCommand(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const code = interaction.options.getString('code');
    const userId = interaction.user.id;
    const username = interaction.user.username;
    
    // 获取或创建 Discord 用户
    const discordUser = await getOrCreateUserByPlatform('discord', userId, username);
    
    // 验证绑定码并绑定账号
    // 绑定码格式：WEB_{user_id}_{timestamp}_{random}
    if (!code.startsWith('WEB_')) {
      await interaction.editReply({ content: '❌ 无效的绑定码格式' });
      return;
    }
    
    const parts = code.split('_');
    if (parts.length !== 4) {
      await interaction.editReply({ content: '❌ 无效的绑定码' });
      return;
    }
    
    const webUserId = parts[1];
    const timestamp = parseInt(parts[2]);
    
    // 检查绑定码是否过期（5分钟有效期）
    const now = Date.now();
    if (now - timestamp > 5 * 60 * 1000) {
      await interaction.editReply({ content: '❌ 绑定码已过期，请重新生成' });
      return;
    }
    
    // 执行绑定
    const result = await bindPlatform(webUserId, 'discord', userId, username);
    
    if (result.success) {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ 账号绑定成功')
        .setDescription('你的 Discord 账号已成功绑定到 Web 账号！')
        .addFields(
          { name: '💰 DOL 余额', value: `${result.user.dol_balance} DOL`, inline: true },
          { name: '💖 亲密度', value: `${result.user.intimacy}`, inline: true }
        )
        .setFooter({ text: '现在你可以在两个平台使用同一个账号了！' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({ content: `❌ 绑定失败：${result.error}` });
    }
  } catch (error) {
    console.error('Bind command error:', error);
    await interaction.editReply({ content: '绑定账号时出错了 😢' });
  }
}
