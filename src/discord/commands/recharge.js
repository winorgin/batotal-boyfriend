import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getOrCreateUserByPlatform, createPayment } from '../../services/supabase.js';

export async function rechargeCommand(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const amount = interaction.options.getInteger('amount');
    const userId = interaction.user.id;
    const user = await getOrCreateUserByPlatform('discord', userId, interaction.user.username);
    
    // 创建支付订单
    const payment = await createPayment(user.id, 'discord', amount, amount * 10);
    
    // 生成支付链接（这里需要集成实际的支付服务）
    const paymentUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/payment/${payment.id}`;
    
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('💰 充值 DOL')
      .setDescription(`充值金额：¥${amount}\n获得 DOL：${amount * 10}`)
      .addFields(
        { name: '订单号', value: payment.id, inline: false },
        { name: '支付方式', value: '支持支付宝、微信支付', inline: false }
      )
      .setFooter({ text: '请在15分钟内完成支付' })
      .setTimestamp();
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('前往支付')
          .setStyle(ButtonStyle.Link)
          .setURL(paymentUrl)
      );
    
    await interaction.editReply({ 
      embeds: [embed],
      components: [row]
    });
  } catch (error) {
    console.error('Recharge command error:', error);
    await interaction.editReply({ content: '创建充值订单失败 😢' });
  }
}
