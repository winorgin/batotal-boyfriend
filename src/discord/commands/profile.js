import { EmbedBuilder } from 'discord.js';
import { getOrCreateUserByPlatform, getUserFullInfo } from '../../services/supabase.js';

export async function profileCommand(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const userId = interaction.user.id;
    const { data: user } = await getOrCreateUserByPlatform('discord', userId, interaction.user.username);
    const { data: fullInfo } = await getUserFullInfo(user.id);
    
    // 计算等级
    const intimacy = fullInfo?.intimacy_level || 0;
    const level = Math.floor(intimacy / 100) + 1;
    
    // 关系阶段描述
    const stageDescriptions = {
      stranger: '陌生人',
      acquaintance: '熟人',
      friend: '朋友',
      close_friend: '好友',
      lover: '恋人'
    };
    
    // 性格特征描述 (暂时简化)
    const traitsList = '暂无数据';
    
    const embed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle(`💕 ${interaction.user.username} 的个人资料`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: '👤 用户名', value: user.username, inline: true },
        { name: '⭐ 等级', value: `Lv.${level}`, inline: true },
        { name: '💰 DOL 余额', value: `${fullInfo?.dol_balance || 0} DOL`, inline: true },
        { name: '💖 亲密度', value: `${intimacy}`, inline: true },
        { name: '🌟 关系阶段', value: stageDescriptions[fullInfo?.relationship_stage] || '未知', inline: true },
        { name: '💬 总消息数', value: `${fullInfo?.total_messages || 0} 条`, inline: true },
        { name: '🎭 性格特征', value: traitsList, inline: false },
        { name: '📅 注册时间', value: new Date(user.created_at).toLocaleDateString('zh-CN'), inline: true },
        { name: '🕐 最后活跃', value: new Date(user.last_active || user.created_at).toLocaleString('zh-CN'), inline: true }
      )
      .setFooter({ text: '继续和我聊天，让我更了解你吧！' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Profile command error:', error);
    await interaction.editReply({ content: '获取个人资料失败 😢' });
  }
}
