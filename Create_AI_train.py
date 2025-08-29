import random
import datetime

# 工具：產生特定範圍內的隨機日期
def generate_random_date(start_date, end_date):
    delta = end_date - start_date
    rand_days = random.randint(0, delta.days)
    rand_seconds = random.randint(0, 86400)
    return start_date + datetime.timedelta(days=rand_days, seconds=rand_seconds)

# 產生一筆模擬資料
def generate_security_data():
    # 時間範圍
    start_time = generate_random_date(datetime.datetime(2025,8,1), datetime.datetime(2025,8,28))
    end_time = start_time + datetime.timedelta(hours=random.randint(1,3))
    time_format = "%Y-%m-%dT%H:%M:%SZ"
    start_str = start_time.strftime(time_format)
    end_str = end_time.strftime(time_format)
    
    # 其他數值（隨機產生，範圍可調整）
    total_requests = random.randint(500, 5000)
    total_attacks = random.randint(0, int(total_requests*0.2))
    blocking_rate = round((random.randint(0, total_attacks) / total_requests) * 100, 2) if total_requests else 0
    avg_response_time = random.randint(50, 500)
    protected_sites = random.randint(1, 5)
    total_bytes = random.randint(50, 500) * 1024 * 1024  # 50MB~500MB
    malicious_bytes = random.randint(0, total_bytes)
    
    # 攻擊類型分佈
    attack_types = ['SQLi', 'XSS', 'Bot', 'RCE', 'Others']
    attack_type_stats = {}
    remaining = total_attacks
    for atype in attack_types[:-1]:
        count = random.randint(0, remaining)
        attack_type_stats[atype] = count
        remaining -= count
    attack_type_stats[attack_types[-1]] = remaining
    
    # 威脅分佈 (比例)
    total_attack_count = sum(attack_type_stats.values()) or 1
    threat_distribution = {}
    for atype in attack_types:
        count = attack_type_stats.get(atype,0)
        percentage = (count / total_attack_count) * 100
        threat_distribution[atype] = {
            "count": count,
            "percentage": f"{percentage:.2f}"
        }
    
    # 建立字典（符合你範例格式）
    return {
        "timeRange": {"start": start_str, "end": end_str},
        "blockingRate": blocking_rate,
        "avgResponseTime": avg_response_time,
        "totalAttacks": total_attacks,
        "protectedSites": protected_sites,
        "totalRequests": total_requests,
        "attackTypeStats": attack_type_stats,
        "threatDistribution": threat_distribution,
        "trafficStats": {
            "totalBytes": total_bytes,
            "maliciousBytes": malicious_bytes
        }
    }

# 產生100筆資料
data_list = [generate_security_data() for _ in range(100)]

# 轉成文字檔內容
def format_data(entry):
    # 產生模擬AI分析內容（簡單範例，可依需要調整
    return (
        "【摘要】\n"
        "此時間段內網站安全狀況普通，主要威脅為大量Bot攻擊，需進一步強化機器人管理。\n\n"
        "【圖表分析】\n"
        "- 攻擊類型：Bot 佔高比例，RCE較低\n"
        "- 威脅分佈：Bot 96%，其他較少\n"
        "- 性能趨勢：平均回應時間約200-300ms\n"
        "- 流量統計：惡意流量約33.7%\n\n"
        "【建議】\n"
        "- 優先加強機器人管理\n"
        "- 優化伺服器回應時間\n"
        "- 定期調整防護策略\n\n"
        "【下一步】\n"
        "- 立即：啟動新規則\n"
        "- 短期：部署CapTCHA\n"
        "- 中期：引入行為分析模組\n"
        "- 長期：建立預警系統"
    )

with open("ai_training_sample.txt", "w", encoding="utf-8") as f:
    for entry in data_list:
        # 拼出完整的輸入部分
        input_text = (
            "作為一個專業的安全專家，請分析以下防護效能數據並提供專業建議（自然語言、無 JSON、無代碼、無欄位名）。\n"
            "=== 防護統計總覽 ===\n"
            f"時間範圍: {entry['timeRange']['start']} 到 {entry['timeRange']['end']}\n"
            f"- 🛡️ 攻擊阻擋率: {entry['blockingRate']}% \n"
            f"- ⚡ 平均響應時間: {entry['avgResponseTime']}ms\n"
            f"- 🚨 攻擊事件總數: {entry['totalAttacks']} 次\n"
            f"- 🌐 受保護網站數: {entry['protectedSites']} 個\n"
            f"- 📊 總請求數: {entry['totalRequests']} 次\n"
            "=== 攻擊類型分析 ===\n"
            + "\n".join([f"  - {k}: {v} 次" for k, v in entry['attackTypeStats'].items()]) + "\n"
            "=== 威脅分佈 (OWASP 分類) ===\n"
            + "\n".join([f"  - {k}: {v['count']} 次 ({v['percentage']}%)" for k, v in entry['threatDistribution'].items()]) + "\n"
            "=== 流量統計 ===\n"
            f"- 總流量: {(entry['trafficStats']['totalBytes'] / (1024**2)):.2f} MB\n"
            f"- 惡意流量: {(entry['trafficStats']['maliciousBytes'] / (1024**2)):.2f} MB\n"
            f"- 惡意流量佔比: {((entry['trafficStats']['maliciousBytes'] / entry['trafficStats']['totalBytes']) * 100):.2f}%\n"
            + format_data(entry) + "\n\n"
        )
        # 寫入檔案
        f.write(input_text)

print("資料產生完成，檔案名：ai_training_sample.txt")
