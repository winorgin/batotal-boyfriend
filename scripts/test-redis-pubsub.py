#!/usr/bin/env python3
"""
Redis Pub/Sub 测试脚本
用于验证多服务器 WebSocket 消息广播功能
"""

import asyncio
import redis.asyncio as redis
import json
import sys
from datetime import datetime


async def test_redis_connection(redis_url: str):
    """测试 Redis 连接"""
    print(f"\n{'='*60}")
    print("测试 1: Redis 连接")
    print(f"{'='*60}")
    
    try:
        client = redis.from_url(redis_url, decode_responses=True)
        await client.ping()
        print(f"✓ Redis 连接成功: {redis_url}")
        
        # 获取 Redis 信息
        info = await client.info()
        print(f"✓ Redis 版本: {info.get('redis_version', 'unknown')}")
        print(f"✓ 已连接客户端数: {info.get('connected_clients', 0)}")
        
        await client.close()
        return True
        
    except Exception as e:
        print(f"✗ Redis 连接失败: {e}")
        return False


async def test_pubsub_basic(redis_url: str):
    """测试基本的 Pub/Sub 功能"""
    print(f"\n{'='*60}")
    print("测试 2: 基本 Pub/Sub 功能")
    print(f"{'='*60}")
    
    try:
        # 创建发布者和订阅者
        publisher = redis.from_url(redis_url, decode_responses=True)
        subscriber = redis.from_url(redis_url, decode_responses=True)
        
        pubsub = subscriber.pubsub()
        
        # 订阅测试频道
        test_channel = "test:channel"
        await pubsub.subscribe(test_channel)
        print(f"✓ 订阅频道: {test_channel}")
        
        # 发布测试消息
        test_message = {"type": "test", "content": "Hello Redis!", "timestamp": datetime.now().isoformat()}
        await publisher.publish(test_channel, json.dumps(test_message))
        print(f"✓ 发布消息: {test_message}")
        
        # 接收消息（超时 5 秒）
        received = False
        timeout = 5
        start_time = asyncio.get_event_loop().time()
        
        async for message in pubsub.listen():
            if message['type'] == 'message':
                received_data = json.loads(message['data'])
                print(f"✓ 接收消息: {received_data}")
                received = True
                break
            
            # 超时检查
            if asyncio.get_event_loop().time() - start_time > timeout:
                print(f"✗ 接收消息超时（{timeout}秒）")
                break
        
        await pubsub.unsubscribe(test_channel)
        await publisher.close()
        await subscriber.close()
        
        return received
        
    except Exception as e:
        print(f"✗ Pub/Sub 测试失败: {e}")
        return False


async def test_pattern_subscribe(redis_url: str):
    """测试模式订阅（user:* 频道）"""
    print(f"\n{'='*60}")
    print("测试 3: 模式订阅 (user:*)")
    print(f"{'='*60}")
    
    try:
        publisher = redis.from_url(redis_url, decode_responses=True)
        subscriber = redis.from_url(redis_url, decode_responses=True)
        
        pubsub = subscriber.pubsub()
        
        # 订阅 user:* 模式
        await pubsub.psubscribe('user:*')
        print("✓ 订阅模式: user:*")
        
        # 发布到不同用户频道
        test_users = ['user:123', 'user:456', 'user:789']
        messages_sent = []
        
        for channel in test_users:
            message = {
                "type": "ai_response",
                "payload": {
                    "content": f"测试消息发送到 {channel}",
                    "timestamp": datetime.now().isoformat()
                }
            }
            await publisher.publish(channel, json.dumps(message))
            messages_sent.append(channel)
            print(f"✓ 发布到 {channel}")
        
        # 接收消息
        messages_received = []
        timeout = 5
        start_time = asyncio.get_event_loop().time()
        
        async for message in pubsub.listen():
            if message['type'] == 'pmessage':
                channel = message['channel']
                data = json.loads(message['data'])
                messages_received.append(channel)
                print(f"✓ 接收自 {channel}: {data['payload']['content']}")
                
                if len(messages_received) >= len(test_users):
                    break
            
            if asyncio.get_event_loop().time() - start_time > timeout:
                print(f"✗ 接收超时，已接收 {len(messages_received)}/{len(test_users)} 条消息")
                break
        
        await pubsub.punsubscribe('user:*')
        await publisher.close()
        await subscriber.close()
        
        success = len(messages_received) == len(test_users)
        if success:
            print(f"✓ 成功接收所有消息 ({len(messages_received)}/{len(test_users)})")
        
        return success
        
    except Exception as e:
        print(f"✗ 模式订阅测试失败: {e}")
        return False


async def test_online_users_set(redis_url: str):
    """测试在线用户集合"""
    print(f"\n{'='*60}")
    print("测试 4: 在线用户集合")
    print(f"{'='*60}")
    
    try:
        client = redis.from_url(redis_url, decode_responses=True)
        
        # 清空测试集合
        await client.delete('online_users')
        print("✓ 清空在线用户集合")
        
        # 添加测试用户
        test_users = ['user_001', 'user_002', 'user_003']
        for user_id in test_users:
            await client.sadd('online_users', user_id)
            print(f"✓ 添加用户: {user_id}")
        
        # 获取在线用户数
        count = await client.scard('online_users')
        print(f"✓ 在线用户数: {count}")
        
        # 获取所有在线用户
        users = await client.smembers('online_users')
        print(f"✓ 在线用户列表: {users}")
        
        # 移除用户
        await client.srem('online_users', 'user_002')
        print("✓ 移除用户: user_002")
        
        # 验证
        final_count = await client.scard('online_users')
        print(f"✓ 最终在线用户数: {final_count}")
        
        # 清理
        await client.delete('online_users')
        await client.close()
        
        return count == len(test_users) and final_count == len(test_users) - 1
        
    except Exception as e:
        print(f"✗ 在线用户集合测试失败: {e}")
        return False


async def test_multi_server_simulation(redis_url: str):
    """模拟多服务器场景"""
    print(f"\n{'='*60}")
    print("测试 5: 多服务器模拟")
    print(f"{'='*60}")
    
    try:
        # 创建 3 个"服务器"（订阅者）
        servers = []
        for i in range(3):
            client = redis.from_url(redis_url, decode_responses=True)
            pubsub = client.pubsub()
            await pubsub.psubscribe('user:*')
            
            # 等待并消费订阅确认消息
            async for msg in pubsub.listen():
                if msg['type'] == 'psubscribe':
                    print(f"✓ 服务器 {i+1} 订阅确认: {msg['channel']}")
                    break
            
            servers.append((client, pubsub))
            print(f"✓ 服务器 {i+1} 启动并订阅 user:*")
        
        # 短暂延迟确保所有订阅完全生效
        await asyncio.sleep(0.2)
        
        # 创建发布者
        publisher = redis.from_url(redis_url, decode_responses=True)
        
        # 发布消息
        test_message = {
            "type": "ai_response",
            "payload": {"content": "广播消息到所有服务器"}
        }
        await publisher.publish('user:test_user', json.dumps(test_message))
        print(f"✓ 发布广播消息到 user:test_user")
        
        # 每个服务器接收消息
        received_count = 0
        timeout = 3
        
        for i, (client, pubsub) in enumerate(servers):
            try:
                start_time = asyncio.get_event_loop().time()
                message_received = False
                
                async for message in pubsub.listen():
                    if message['type'] == 'pmessage':
                        received_count += 1
                        data = json.loads(message['data'])
                        print(f"✓ 服务器 {i+1} 接收到消息: {data['payload']['content']}")
                        message_received = True
                        break
                    
                    # 超时检查
                    if asyncio.get_event_loop().time() - start_time > timeout:
                        print(f"✗ 服务器 {i+1} 接收超时（{timeout}秒）")
                        break
                
                if not message_received:
                    print(f"✗ 服务器 {i+1} 未接收到消息")
                    
            except Exception as e:
                print(f"✗ 服务器 {i+1} 接收异常: {e}")
        
        # 清理
        for client, pubsub in servers:
            await pubsub.punsubscribe('user:*')
            await client.close()
        await publisher.close()
        
        success = received_count == len(servers)
        if success:
            print(f"✓ 所有服务器都接收到消息 ({received_count}/{len(servers)})")
        else:
            print(f"✗ 部分服务器未接收到消息 ({received_count}/{len(servers)})")
        
        return success
        
    except Exception as e:
        print(f"✗ 多服务器模拟失败: {e}")
        return False


async def main():
    """主测试函数"""
    print("\n" + "="*60)
    print("Redis Pub/Sub 功能测试")
    print("="*60)
    
    # 从命令行参数或环境变量获取 Redis URL
    redis_url = sys.argv[1] if len(sys.argv) > 1 else "redis://localhost:6380"
    print(f"Redis URL: {redis_url}")
    
    # 运行所有测试
    tests = [
        ("Redis 连接", test_redis_connection),
        ("基本 Pub/Sub", test_pubsub_basic),
        ("模式订阅", test_pattern_subscribe),
        ("在线用户集合", test_online_users_set),
        ("多服务器模拟", test_multi_server_simulation),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = await test_func(redis_url)
            results.append((test_name, result))
        except Exception as e:
            print(f"\n✗ 测试 '{test_name}' 异常: {e}")
            results.append((test_name, False))
    
    # 打印测试总结
    print(f"\n{'='*60}")
    print("测试总结")
    print(f"{'='*60}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"{status} - {test_name}")
    
    print(f"\n总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！Redis Pub/Sub 功能正常。")
        return 0
    else:
        print(f"\n⚠ {total - passed} 个测试失败，请检查 Redis 配置。")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
