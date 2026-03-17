import { EmbedBuilder } from 'discord.js';
import { getOrCreateUserByPlatform, getUserFullInfo } from '../../services/supabase.js';

export async function getUserStats(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const userId = interaction.user.id;
    const { data: user } = await getOrCreateUserByPlatform('discord', userId, interaction.user.username);
    const { data: fullInfo } = await getUserFullInfo(user.id);
    
    // 计算等级
    const intimacy = fullInfo?.intimacy_level || 0;
    const level = Math.floor(intimacy / 100) + 1;
    const nextLevelIntimacy = level * 100;
    const progress = intimacy % 100;
    
    // 关系阶段描述
    const stageDescriptions = {
      stranger: '陌生人 - 刚刚认识',
      acquaintance: '熟人 - 开始了解',
      friend: '朋友 - 互相信任',
      close_friend: '好友 - 无话不谈',
      lover: '恋人 - 心心相印'
    };
    
    const embed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle(`💕 ${interaction.user.username} 的统计信息`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: '💰 DOL 余额', value: `${fullInfo?.dol_balance || 0} DOL`, inline: true },
        { name: '⭐ 等级', value: `Lv.${level}`, inline: true },
        { name: '💖 亲密度', value: `${intimacy}/${nextLevelIntimacy} (${progress}%)`, inline: true },
        { name: '🌟 关系阶段', value: stageDescriptions[fullInfo?.relationship_stage] || '未知', inline: true },
        { name: '📅 注册时间', value: new Date(user.created_at).toLocaleDateString('zh-CN'), inline: true },
        { name: '💬 总消息数', value: `${fullInfo?.total_messages || 0} 条`, inline: true }
      )
      .setFooter({ text: '继续聊天来提升亲密度吧！' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Stats command error:', error);
    await interaction.editReply({ content: '获取统计信息失败 😢' });
  }
}
