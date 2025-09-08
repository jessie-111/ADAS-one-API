import random
import datetime

# OWASP Top 10 2021 專業參考資料
# 來源：https://owasp.org/Top10/
OWASP_TOP_10_REFERENCES = {
    'mainReferences': [
        'https://owasp.org/www-project-top-ten/',
        'https://owasp.org/Top10/',
        'https://cheatsheetseries.owasp.org/'
    ],
    
    'attackTypes': {
        'SQLi': {
            'owasp_category': 'A03:2021 – 注入攻擊',
            'url': 'https://owasp.org/Top10/A03_2021-Injection/',
            'description': 'SQL注入攻擊允許攻擊者在應用程式資料庫查詢中插入惡意代碼',
            'common_patterns': ['SELECT', 'UNION', 'DROP', 'INSERT', 'UPDATE', 'DELETE'],
            'mitigation_focus': '參數化查詢、輸入驗證、最小權限原則'
        },
        'XSS': {
            'owasp_category': 'A03:2021 – 注入攻擊', 
            'url': 'https://owasp.org/Top10/A03_2021-Injection/',
            'description': '跨網站腳本攻擊將惡意腳本注入到可信任的網站中',
            'common_patterns': ['<script>', 'javascript:', 'eval(', 'onload=', 'onerror='],
            'mitigation_focus': '輸出編碼、內容安全策略、輸入驗證'
        },
        'Bot': {
            'owasp_category': 'A05:2021 – 安全設定缺陷',
            'url': 'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/',
            'description': '自動化攻擊工具利用不當的安全配置進行大量請求',
            'common_patterns': ['高頻率請求', '異常User-Agent', '地理異常', 'IP集中攻擊'],
            'mitigation_focus': '速率限制、機器人檢測、流量分析'
        },
        'RCE': {
            'owasp_category': 'A03:2021 – 注入攻擊',
            'url': 'https://owasp.org/Top10/A03_2021-Injection/',
            'description': '遠程代碼執行允許攻擊者在伺服器上執行任意命令',
            'common_patterns': ['system(', 'exec(', 'eval(', 'shell_exec', '命令注入'],
            'mitigation_focus': '輸入驗證、沙盒隔離、代碼審查'
        },
        'Others': {
            'owasp_category': 'A06:2021 – 易受攻擊的元件',
            'url': 'https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/',
            'description': '使用已知漏洞的第三方元件或其他混合攻擊模式',
            'common_patterns': ['已知CVE', '過時套件', '配置錯誤', '權限問題'],
            'mitigation_focus': '定期更新、漏洞掃描、安全配置'
        }
    }
}

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
    
    # 修正阻擋率計算邏輯 - 被阻擋的攻擊數/總攻擊數
    if total_attacks > 0:
        blocked_attacks = random.randint(0, total_attacks)
        blocking_rate = round((blocked_attacks / total_attacks) * 100, 2)
    else:
        blocking_rate = 0.0  # 沒有攻擊就沒有阻擋率
    
    avg_response_time = random.randint(50, 500)
    protected_sites = random.randint(1, 5)
    total_bytes = random.randint(50, 500) * 1024 * 1024  # 50MB~500MB
    
    # 修正惡意流量邏輯 - 與攻擊數量保持一致
    if total_attacks == 0:
        # 零攻擊：0流量或極少量誤判(0-2%)
        false_positive_rate = random.uniform(0, 0.02)
        malicious_bytes = int(total_bytes * false_positive_rate)
    else:
        # 有攻擊：根據攻擊強度計算惡意流量
        attack_intensity = total_attacks / total_requests  # 攻擊密度
        base_malicious_ratio = min(attack_intensity * random.uniform(2, 5), 0.8)  # 基礎惡意比例
        noise_factor = random.uniform(0.9, 1.1)  # 添加合理噪音
        malicious_bytes = int(total_bytes * base_malicious_ratio * noise_factor)
    
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

# 數據邏輯一致性驗證機制
def validate_data_consistency(entry):
    """
    驗證生成的數據邏輯一致性
    返回 (是否通過驗證, 錯誤訊息列表)
    """
    errors = []
    
    # 1. 檢查攻擊數量與惡意流量的一致性
    total_attacks = entry['totalAttacks']
    malicious_bytes = entry['trafficStats']['maliciousBytes']
    total_bytes = entry['trafficStats']['totalBytes']
    malicious_ratio = (malicious_bytes / total_bytes) * 100
    
    if total_attacks == 0:
        # 零攻擊應該有零或極少惡意流量（<5%）
        if malicious_ratio > 5:
            errors.append(f"零攻擊但惡意流量佔比過高: {malicious_ratio:.1f}%")
    else:
        # 有攻擊時惡意流量不應為零
        if malicious_ratio < 1:
            errors.append(f"有{total_attacks}次攻擊但惡意流量過低: {malicious_ratio:.1f}%")
    
    # 2. 檢查阻擋率邏輯
    blocking_rate = entry['blockingRate']
    if total_attacks == 0 and blocking_rate != 0:
        errors.append(f"零攻擊但阻擋率不為零: {blocking_rate}%")
    elif total_attacks > 0 and blocking_rate > 100:
        errors.append(f"阻擋率超過100%: {blocking_rate}%")
    
    # 3. 檢查攻擊類型統計總和
    attack_stats = entry['attackTypeStats']
    stats_total = sum(attack_stats.values())
    if stats_total != total_attacks:
        errors.append(f"攻擊類型統計總和({stats_total})與總攻擊數({total_attacks})不符")
    
    # 4. 檢查威脅分佈百分比
    threat_dist = entry['threatDistribution'] 
    total_percentage = sum(float(v['percentage']) for v in threat_dist.values())
    if abs(total_percentage - 100) > 0.1 and total_attacks > 0:  # 允許0.1%誤差
        errors.append(f"威脅分佈百分比總和不等於100%: {total_percentage:.2f}%")
    
    # 5. 檢查請求數量合理性
    total_requests = entry['totalRequests']
    if total_attacks > total_requests:
        errors.append(f"攻擊數量({total_attacks})大於總請求數({total_requests})")
    
    return len(errors) == 0, errors

# 生成並驗證數據
def generate_validated_security_data():
    """生成經過驗證的安全數據"""
    max_attempts = 10
    for attempt in range(max_attempts):
        entry = generate_security_data()
        is_valid, errors = validate_data_consistency(entry)
        
        if is_valid:
            return entry
        elif attempt == max_attempts - 1:
            # 最後一次嘗試失敗，印出錯誤但仍返回資料
            print(f"警告: 數據驗證失敗但已達最大嘗試次數，錯誤: {errors}")
            return entry
    
    return entry

# 整體品質檢查
def perform_quality_check(data_list):
    """執行整體資料品質檢查"""
    print("=" * 50)
    print("資料品質檢查報告")
    print("=" * 50)
    
    # 統計零攻擊場景數量
    zero_attack_count = sum(1 for entry in data_list if entry['totalAttacks'] == 0)
    total_entries = len(data_list)
    print(f"零攻擊場景: {zero_attack_count}/{total_entries} 筆")
    
    # 統計威脅等級分佈
    threat_levels = {}
    for entry in data_list:
        threat_level, _ = assess_threat_level(entry['blockingRate'], entry['totalAttacks'], entry['totalRequests'])
        threat_levels[threat_level] = threat_levels.get(threat_level, 0) + 1
    
    print("威脅等級分佈:")
    for level, count in sorted(threat_levels.items()):
        print(f"  {level}: {count} 筆")
    
    # 檢查數據一致性
    inconsistent_count = 0
    for entry in data_list:
        is_valid, _ = validate_data_consistency(entry)
        if not is_valid:
            inconsistent_count += 1
    
    print(f"數據邏輯一致性: {total_entries - inconsistent_count} 筆通過驗證")
    
    if inconsistent_count == 0:
        print("✅ 所有數據均通過邏輯一致性檢查")
    else:
        print(f"⚠️  {inconsistent_count} 筆數據存在邏輯不一致問題")
    
    print("=" * 50)

# 威脅等級評估
def assess_threat_level(blocking_rate, total_attacks, total_requests):
    attack_ratio = (total_attacks / total_requests * 100) if total_requests > 0 else 0
    
    # 零攻擊場景專門處理
    if total_attacks == 0:
        return "優秀", "無威脅"
    
    # 根據攻擊數量動態評估威脅等級
    if total_attacks >= 100 or attack_ratio > 20:
        return "緊急", "嚴重"
    elif total_attacks >= 50 or attack_ratio > 10:
        return "警戒", "偏高"  
    elif total_attacks >= 10 or attack_ratio > 2:
        return "注意", "普通"
    else:
        return "良好", "較低"

# 識別主要威脅類型
def identify_primary_threat(attack_stats):
    if not attack_stats or sum(attack_stats.values()) == 0:
        return "暫無明顯威脅", "混合攻擊"
    
    # 找出最高的攻擊類型
    primary_threat = max(attack_stats.items(), key=lambda x: x[1])
    secondary_threats = sorted([(k,v) for k,v in attack_stats.items() if k != primary_threat[0]], 
                              key=lambda x: x[1], reverse=True)
    
    return primary_threat[0], secondary_threats[0][0] if secondary_threats else "其他"

# 生成多樣化摘要
def generate_summary(entry):
    threat_level, severity = assess_threat_level(entry['blockingRate'], entry['totalAttacks'], entry['totalRequests'])
    primary_threat, secondary_threat = identify_primary_threat(entry['attackTypeStats'])
    
    attack_ratio = (entry['totalAttacks'] / entry['totalRequests'] * 100) if entry['totalRequests'] > 0 else 0
    
    summaries = {
        "優秀": [
            "監控期間系統運行穩定，未檢測到任何安全威脅事件，防護系統正常運作，建議維持現有安全水準。",
            "此時間段內網站安全狀況優異，所有流量均為正常使用者訪問，系統防護機制運作良好。",
            "安全監控系統顯示無異常活動，防護設定有效運行，請持續保持當前安全配置並定期檢查。",
            f"系統於{entry['totalRequests']}次請求中未發現任何威脅，安全防護體系運作正常，狀況良好。"
        ],
        "緊急": [
            f"此時間段內檢測到{severity}安全威脅，攻擊事件達{entry['totalAttacks']}次，阻擋率僅{entry['blockingRate']}%，需要立即採取應對措施。",
            f"系統面臨高強度安全攻擊，主要威脅來源為{primary_threat}攻擊，當前防護能力不足，建議緊急升級防護策略。",
            f"檢測到大量惡意活動，攻擊佔總請求{attack_ratio:.1f}%，{primary_threat}攻擊特別活躍，系統安全狀況令人擾憂。"
        ],
        "警戒": [
            f"監控期間發現{entry['totalAttacks']}次攻擊事件，阻擋率{entry['blockingRate']}%，主要威脅為{primary_threat}攻擊，需加強防護措施。",
            f"系統安全狀況處於警戒狀態，{primary_threat}和{secondary_threat}攻擊較為活躍，建議及時調整安全策略。",
            f"當前安全防護效能有待改善，攻擊活動以{primary_threat}為主，佔所有攻擊的較大比例。"
        ],
        "注意": [
            f"系統安全狀況基本穩定，但仍需關注{primary_threat}攻擊活動，目前阻擋率為{entry['blockingRate']}%。",
            f"監控期間檢測到{entry['totalAttacks']}次安全事件，主要為{primary_threat}攻擊，整體風險可控但需持續監控。",
            f"安全防護運行正常，{primary_threat}攻擊有一定活躍度，建議維持現有防護策略並適時調整。"
        ],
        "良好": [
            f"系統安全狀況良好，攻擊阻擋率達{entry['blockingRate']}%，少量{primary_threat}攻擊均被有效攔截。",
            f"防護系統運行穩定，成功應對了{entry['totalAttacks']}次攻擊嘗試，安全狀況令人滿意。",
            f"監控期間系統表現優異，各類攻擊均得到有效控制，{primary_threat}攻擊影響輕微。"
        ]
    }
    
    return random.choice(summaries[threat_level])

# 生成圖表分析
def generate_chart_analysis(entry):
    attack_stats = entry['attackTypeStats']
    total_attacks = sum(attack_stats.values())
    
    # 找出最高和最低的攻擊類型
    if total_attacks == 0:
        malicious_ratio = (entry['trafficStats']['maliciousBytes'] / entry['trafficStats']['totalBytes']) * 100
        # 判斷性能狀況
        response_time = entry['avgResponseTime']
        if response_time < 100:
            performance_desc = "優異"
        elif response_time < 300:
            performance_desc = "良好"
        else:
            performance_desc = "正常"
            
        return ("- 攻擊類型：本期間無攻擊事件記錄\n"
               "- 威脅分佈：系統安全狀況優異，無任何威脅活動\n"
               f"- 性能趨勢：平均回應時間{response_time}ms，系統性能{performance_desc}\n"
               f"- 流量統計：正常流量佔比{(100-malicious_ratio):.1f}%，{'少量誤判流量' if malicious_ratio > 0 else '無異常流量'}")
    
    sorted_attacks = sorted(attack_stats.items(), key=lambda x: x[1], reverse=True)
    highest_attack = sorted_attacks[0]
    lowest_attacks = [item for item in sorted_attacks if item[1] == sorted_attacks[-1][1]]
    
    highest_percentage = (highest_attack[1] / total_attacks * 100)
    
    # 回應時間評估
    response_time = entry['avgResponseTime']
    if response_time < 100:
        performance_desc = "優異"
    elif response_time < 300:
        performance_desc = "正常"
    elif response_time < 500:
        performance_desc = "偏慢"
    else:
        performance_desc = "需要優化"
    
    malicious_ratio = (entry['trafficStats']['maliciousBytes'] / entry['trafficStats']['totalBytes']) * 100
    
    return (f"- 攻擊類型：{highest_attack[0]} 佔最高比例({highest_percentage:.1f}%)，{lowest_attacks[0][0]}相對較少\n"
           f"- 威脅分佈：{highest_attack[0]} {highest_percentage:.1f}%，其他攻擊類型分佈相對平均\n"
           f"- 性能趨勢：平均回應時間{response_time}ms，系統性能{performance_desc}\n"
           f"- 流量統計：惡意流量佔比{malicious_ratio:.1f}%")

# 全域建議使用追蹤器 - 確保重複性控制
recommendation_usage_tracker = {}
MAX_RECOMMENDATION_USAGE = 2

# 擴展建議選項池
def get_expanded_recommendations():
    return {
        "SQLi": {
            "技術防護": [
                "實施嚴格的參數化查詢機制",
                "部署SQL注入防護中介軟體", 
                "強化資料庫存取層驗證邏輯",
                "啟用資料庫查詢防護機制",
                "建立SQL語法白名單過濾系統",
                "實施動態資料庫查詢檢查",
                "部署資料庫存取代理防護",
                "加強stored procedure使用規範",
                "實施ORM框架安全配置",
                "建立資料庫連線池安全管理",
                "啟用資料庫查詢日誌監控",
                "實施資料庫欄位加密保護",
                "部署資料庫防火牆規則",
                "強化資料庫使用者權限管控",
                "建立資料庫異常行為檢測",
                "實施SQL執行時間限制機制",
                "部署資料庫活動監控系統",
                "建立查詢複雜度檢測器",
                "強化資料庫schema保護",
                "實施資料庫連線加密協定",
                "建立SQL指令執行追蹤",
                "部署資料庫存取憑證管理",
                "實施查詢結果集大小限制",
                "強化資料庫表結構保護",
                "建立動態SQL檢測機制",
                "實施資料庫交易安全控制",
                "部署查詢效能異常檢測",
                "建立資料庫備份完整性驗證",
                "強化資料庫配置安全掃描",
                "實施SQL注入模式學習系統",
                "建立資料庫存取時間窗控制",
                "部署查詢語意分析引擎",
                "實施資料庫操作稽核追蹤",
                "強化資料庫災難復原機制",
                "建立SQL執行環境隔離"
            ],
            "監控分析": [
                "建立SQL異常模式檢測系統",
                "加強資料庫存取行為監控", 
                "實施查詢效能異常警報",
                "部署資料庫流量分析工具",
                "建立SQL注入攻擊特徵庫",
                "強化資料庫稽核日誌分析",
                "實施即時資料庫威脅檢測",
                "建立資料庫存取模式分析",
                "加強異常查詢行為警示",
                "實施資料庫安全事件關聯分析"
            ],
            "架構強化": [
                "設計資料庫存取權限最小化",
                "建立多層資料庫防護架構",
                "實施資料庫隔離部署策略",
                "強化應用程式與資料庫分離",
                "建立資料庫備份與復原機制",
                "實施資料庫讀寫分離架構",
                "加強資料庫網路隔離設計",
                "建立資料庫災難復原計畫",
                "實施資料庫版本控制管理",
                "強化資料庫配置安全基準"
            ]
        },
        "XSS": {
            "輸出防護": [
                "強化HTML輸出編碼機制",
                "實施JavaScript安全編碼",
                "部署內容安全策略(CSP)規則",
                "加強URL編碼輸出處理",
                "建立CSS安全過濾機制",
                "實施DOM操作安全驗證",
                "強化JSON輸出安全編碼",
                "部署XSS過濾中介軟體",
                "建立模板引擎安全配置",
                "實施瀏覽器安全標頭設定",
                "加強富文本編輯器防護",
                "建立動態內容安全檢查",
                "實施iframe安全沙盒機制",
                "強化AJAX回應安全處理",
                "建立前端安全驗證框架"
            ],
            "輸入驗證": [
                "實施嚴格的輸入白名單驗證",
                "建立輸入內容格式檢查機制",
                "加強表單欄位長度限制",
                "實施使用者輸入淨化處理",
                "建立惡意腳本檢測系統",
                "強化檔案上傳內容驗證",
                "實施輸入資料類型嚴格檢查",
                "建立特殊字符過濾機制",
                "加強API參數驗證規則",
                "實施輸入來源可信度檢查"
            ],
            "前端安全": [
                "強化瀏覽器安全策略配置",
                "實施Same-Origin Policy加強",
                "建立Cookie安全屬性設定",
                "加強Session管理安全機制",
                "實施HTTPS強制重導向",
                "建立前端資源完整性驗證",
                "強化第三方腳本安全管控",
                "實施前端安全監控機制",
                "建立用戶端安全事件追蹤",
                "加強瀏覽器相容性安全測試"
            ]
        },
        "Bot": {
            "檢測識別": [
                "部署機器人行為模式分析系統",
                "實施流量異常檢測機制",
                "建立使用者代理字串分析",
                "加強請求頻率異常檢測",
                "實施瀏覽器指紋識別技術",
                "建立自動化行為特徵檢測",
                "強化IP位址信譽評估系統",
                "實施驗證碼智慧觸發機制",
                "建立會話行為分析系統",
                "加強JavaScript挑戰驗證",
                "實施鼠標移動軌跡分析",
                "建立鍵盤輸入模式檢測",
                "強化設備指紋識別系統",
                "實施網路延遲模式分析",
                "建立機器人攻擊模式庫"
            ],
            "流量控制": [
                "實施動態速率限制機制",
                "建立智慧流量整形系統",
                "加強連線數限制管控",
                "實施彈性頻寬分配策略",
                "建立地理位置流量過濾",
                "強化時間窗口流量控制",
                "實施優先級流量管理",
                "建立異常流量自動阻斷",
                "加強CDN邊緣節點防護",
                "實施流量清洗服務集成"
            ],
            "人機驗證": [
                "部署進階CAPTCHA驗證系統",
                "實施生物特徵驗證機制",
                "建立多層次身分驗證",
                "加強行為驗證挑戰機制",
                "實施智慧風險評分系統",
                "建立設備信任度管理",
                "強化無障礙驗證選項",
                "實施隱形驗證技術",
                "建立驗證結果快取機制",
                "加強驗證繞過檢測"
            ]
        },
        "RCE": {
            "系統加固": [
                "實施嚴格的檔案執行權限管控",
                "建立系統指令白名單機制",
                "加強應用程式沙盒隔離",
                "實施程序執行監控系統",
                "建立系統呼叫過濾機制",
                "強化檔案系統存取權限",
                "實施動態程序行為分析",
                "建立可疑執行檔檢測",
                "加強記憶體保護機制",
                "實施系統資源使用限制",
                "建立核心模組保護機制",
                "強化系統服務安全配置",
                "實施程序間通訊安全檢查",
                "建立系統完整性監控",
                "加強啟動程序安全驗證"
            ],
            "代碼安全": [
                "實施安全的代碼執行環境",
                "建立輸入參數嚴格驗證",
                "加強動態代碼生成防護",
                "實施代碼注入檢測機制",
                "建立安全的API呼叫框架",
                "強化第三方函式庫安全檢查",
                "實施代碼執行路徑驗證",
                "建立惡意載荷檢測系統",
                "加強序列化安全處理",
                "實施代碼簽章驗證機制"
            ],
            "網路隔離": [
                "實施網路微分段架構",
                "建立零信任網路模型",
                "加強防火牆規則精細化",
                "實施出站流量監控機制",
                "建立網路存取控制清單",
                "強化VPN存取安全管控",
                "實施網路流量加密保護",
                "建立異常網路連線檢測",
                "加強內網橫向移動防護",
                "實施網路行為基準分析"
            ]
        },
        "Others": {
            "綜合防護": [
                "建立多層次安全防護體系",
                "實施威脅情報整合分析",
                "加強安全事件關聯分析",
                "建立統一安全管理平台",
                "實施自動化安全回應機制",
                "強化安全監控中心(SOC)能力",
                "建立安全基準配置管理",
                "實施持續安全評估機制",
                "加強第三方安全風險管理",
                "建立安全意識培訓計畫",
                "實施安全合規檢查機制",
                "強化供應鏈安全管理",
                "建立災難復原演練計畫",
                "實施安全指標監控儀表板",
                "加強安全投資效益分析"
            ]
        }
    }

# 基於OWASP標準的實用建議生成器
def generate_dynamic_recommendations(attack_type, threat_level, count=3):
    # 零攻擊場景專門建議
    if threat_level == "優秀":
        zero_attack_recommendations = [
            "持續監控系統日誌以檢測潛在威脅",
            "定期檢視和更新安全防護規則",
            "執行例行安全配置基準檢查",
            "維護防火牆和安全設備運行狀態", 
            "定期備份重要系統配置文件",
            "檢查SSL/TLS憑證有效期限",
            "更新防毒軟體和惡意軟體定義檔",
            "執行弱點掃描以識別潜在風險",
            "檢視使用者存取權限和帳戶狀態",
            "測試災難復原和備份還原程序",
            "檢查系統補丁和更新狀態",
            "驗證監控告警機制正常運作"
        ]
        
        # 隨機選擇實用建議
        selected_recs = random.sample(zero_attack_recommendations, min(count, len(zero_attack_recommendations)))
        
        # 更新使用次數
        for rec in selected_recs:
            recommendation_usage_tracker[rec] = recommendation_usage_tracker.get(rec, 0) + 1
            
        return selected_recs
    
    # 有攻擊情況：基於OWASP標準的專業建議
    owasp_info = OWASP_TOP_10_REFERENCES['attackTypes'].get(attack_type, OWASP_TOP_10_REFERENCES['attackTypes']['Others'])
    mitigation_focus = owasp_info['mitigation_focus']
    
    # 動詞變化
    action_verbs = ["實施", "建立", "部署", "強化", "加強", "執行", "啟用", "配置", "優化", "升級"]
    
    # 基於OWASP標準的實用建議模板庫 
    practical_recommendations = {
        "SQLi": [
            "在所有資料庫查詢中使用參數化查詢或預備語句",
            "對所有用戶輸入進行嚴格的類型和長度驗證", 
            "實施最小權限原則限制資料庫用戶權限",
            "部署Web應用防火牆(WAF)阻擋SQL注入攻擊",
            "定期檢查和修正應用程式代碼中的SQL查詢",
            "啟用資料庫查詢日誌監控異常SQL操作",
            "使用白名單方式驗證允許的SQL操作", 
            "對敏感資料庫欄位進行加密儲存",
            "建立資料庫存取異常的即時告警機制",
            "定期進行SQL注入漏洞掃描測試"
        ],
        "XSS": [
            "對所有輸出到HTML的內容進行適當編碼",
            "實施內容安全策略(CSP)限制腳本執行", 
            "使用安全的HTML淨化函式庫過濾用戶輸入",
            "設定HttpOnly和Secure標記保護Cookie",
            "驗證和過濾所有反射回頁面的用戶輸入",
            "使用框架內建的XSS防護機制",
            "對JSON回應進行適當的內容類型設定",
            "避免在JavaScript中使用eval()等危險函數",
            "定期檢查第三方JavaScript函式庫安全性",
            "建立前端安全標頭X-XSS-Protection設定"
        ],
        "Bot": [
            "實施速率限制防止大量自動化請求",
            "部署CAPTCHA驗證機制識別真實用戶",
            "分析User-Agent字串識別異常的機器人",
            "監控IP地址請求頻率設定合理閾值",
            "使用JavaScript挑戰驗證瀏覽器真實性", 
            "建立IP白名單和黑名單管理機制",
            "分析請求模式識別自動化行為特徵",
            "設定Fail2Ban自動封鎖惡意IP地址",
            "使用CDN服務進行流量清洗和過濾",
            "監控異常地理位置的大量訪問請求"
        ],
        "RCE": [
            "禁止在應用程式中執行系統命令",
            "對所有文件上傳進行嚴格的類型和內容檢查",
            "使用安全的程式語言函式避免代碼注入", 
            "實施應用程式沙盒限制執行權限",
            "定期更新系統和應用程式補丁",
            "禁用不必要的系統服務和功能",
            "使用白名單方式限制可執行的指令",
            "監控系統程序執行異常活動", 
            "實施網路隔離限制橫向移動",
            "建立檔案完整性監控機制"
        ],
        "Others": [
            "定期更新所有軟體元件至最新安全版本",
            "執行全面的安全漏洞掃描和評估",
            "建立完整的安全事件記錄和監控",
            "實施多因素認證保護重要帳戶",
            "定期備份重要資料並測試復原程序", 
            "建立安全意識培訓計畫提升人員能力",
            "制定和測試事件回應處理程序",
            "實施網路分段降低攻擊影響範圍",
            "定期檢視和更新安全政策文件",
            "建立供應商和第三方風險評估機制"
        ]
    }
    
    # 根據攻擊類型選擇實用建議
    available_recs = practical_recommendations.get(attack_type, practical_recommendations["Others"])
    
    # 過濾已使用過多的建議
    filtered_recs = [
        rec for rec in available_recs
        if recommendation_usage_tracker.get(rec, 0) < MAX_RECOMMENDATION_USAGE
    ]
    
    # 如果可用建議不足，放寬限制
    if len(filtered_recs) < count:
        filtered_recs = [
            rec for rec in available_recs
            if recommendation_usage_tracker.get(rec, 0) < MAX_RECOMMENDATION_USAGE + 1
        ]
        
    if len(filtered_recs) < count:
        filtered_recs = available_recs
    
    # 隨機選擇建議
    selected_recs = random.sample(filtered_recs, min(count, len(filtered_recs)))
    
    # 更新使用次數
    for rec in selected_recs:
        recommendation_usage_tracker[rec] = recommendation_usage_tracker.get(rec, 0) + 1
    
    return selected_recs

# 從可用建議中選擇唯一建議
def get_unique_recommendations(attack_type, threat_level, count=3):
    return generate_dynamic_recommendations(attack_type, threat_level, count)

# 根據威脅等級添加情境化建議
def get_contextual_recommendations(threat_level, response_time):
    contextual_recs = []
    
    if threat_level in ["緊急", "警戒"]:
        emergency_templates = [
            "{urgency}{action}安全事件回應{scope}",
            "{urgency}{action}安全應變團隊{type}",
            "{urgency}{action}攻擊影響{scope}評估",
            "{urgency}通報管理階層與{scope}",
            "{urgency}{action}關鍵系統資料{type}",
            "{urgency}隔離受影響的{scope}",
            "{urgency}{action}威脅評估{type}",
            "{urgency}聯繫{scope}安全專家",
            "{urgency}{action}緊急防護{type}",
            "{urgency}啟動{scope}作戰室",
            "{urgency}{action}事件分析{type}",
            "{urgency}通知{scope}利害關係人"
        ]
        
        urgency_words = ["立即", "緊急", "即刻", "迅速", "快速", "馬上", "第一時間", "優先"]
        action_words = ["啟動", "執行", "實施", "開始", "進行", "推動", "展開", "召集"]
        scope_words = ["程序", "機制", "體系", "流程", "措施", "策略", "計畫", "方案"]
        type_words = ["支援", "協助", "備份", "保護", "檢查", "分析", "評估", "處理"]
        
        emergency_recs = []
        for _ in range(20):  # 生成更多選項
            template = random.choice(emergency_templates)
            suggestion = template.format(
                urgency=random.choice(urgency_words),
                action=random.choice(action_words),
                scope=random.choice(scope_words),
                type=random.choice(type_words)
            )
            if suggestion not in emergency_recs:
                emergency_recs.append(suggestion)
        available_emergency = [
            rec for rec in emergency_recs
            if recommendation_usage_tracker.get(rec, 0) < MAX_RECOMMENDATION_USAGE
        ]
        
        # 如果沒有可用的緊急建議，放寬限制
        if not available_emergency:
            available_emergency = [
                rec for rec in emergency_recs
                if recommendation_usage_tracker.get(rec, 0) < MAX_RECOMMENDATION_USAGE + 1
            ]
        
        if not available_emergency:
            available_emergency = sorted(emergency_recs, 
                                       key=lambda x: recommendation_usage_tracker.get(x, 0))[:1]
        
        if available_emergency:
            selected = random.choice(available_emergency)
            contextual_recs.append(selected)
            recommendation_usage_tracker[selected] = recommendation_usage_tracker.get(selected, 0) + 1
    
    if response_time > 400:
        performance_templates = [
            "{action}伺服器回應時間{method}",
            "{action}系統資源{method}配置",
            "{action}網路頻寬{method}最佳化",
            "{action}快取機制{method}提升",
            "{action}資料庫查詢{method}調校",
            "{action}CDN加速服務{method}",
            "{action}應用程式{method}優化",
            "{action}靜態資源{method}策略",
            "{action}負載均衡{method}改善",
            "{action}記憶體使用{method}調整",
            "{action}CPU效能{method}提升",
            "{action}磁碟I/O{method}最佳化"
        ]
        
        action_words = ["優化", "調整", "改善", "強化", "提升", "檢視", "評估", "升級", "精進", "完善"]
        method_words = ["策略", "機制", "方法", "技術", "架構", "流程", "設定", "參數", "配置", "方案"]
        
        performance_recs = []
        for _ in range(15):
            template = random.choice(performance_templates)
            suggestion = template.format(
                action=random.choice(action_words),
                method=random.choice(method_words)
            )
            if suggestion not in performance_recs:
                performance_recs.append(suggestion)
        available_performance = [
            rec for rec in performance_recs
            if recommendation_usage_tracker.get(rec, 0) < MAX_RECOMMENDATION_USAGE
        ]
        
        # 如果沒有可用的性能建議，放寬限制
        if not available_performance:
            available_performance = [
                rec for rec in performance_recs
                if recommendation_usage_tracker.get(rec, 0) < MAX_RECOMMENDATION_USAGE + 1
            ]
        
        if not available_performance:
            available_performance = sorted(performance_recs, 
                                         key=lambda x: recommendation_usage_tracker.get(x, 0))[:1]
        
        if available_performance:
            selected = random.choice(available_performance)
            contextual_recs.append(selected)
            recommendation_usage_tracker[selected] = recommendation_usage_tracker.get(selected, 0) + 1
    
    return contextual_recs

# 生成針對性建議
def generate_recommendations(entry):
    primary_threat, _ = identify_primary_threat(entry['attackTypeStats'])
    threat_level, _ = assess_threat_level(entry['blockingRate'], entry['totalAttacks'], entry['totalRequests'])
    
    # 獲取主要建議（2-3個）
    main_recs = get_unique_recommendations(primary_threat, threat_level, random.randint(2, 3))
    
    # 獲取情境化建議
    contextual_recs = get_contextual_recommendations(threat_level, entry['avgResponseTime'])
    
    # 合併建議，確保總數不超過4個
    all_recs = main_recs + contextual_recs
    final_recs = all_recs[:4]
    
    return final_recs

# 下一步行動追蹤器
next_steps_usage_tracker = {}
MAX_NEXT_STEPS_USAGE = 2

# 實用下一步行動計畫池
def get_diverse_next_steps():
    return {
        "優秀": {
            "立即": [
                "保持現有安全監控設定",
                "檢查系統安全狀態指標",
                "執行例行安全檢查程序",
                "維持防護系統正常運作",
                "持續觀察網路流量狀況",
                "確認監控告警功能正常",
                "檢視系統效能運作狀態",
                "維護安全設備運行狀況"
            ],
            "短期": [
                "執行定期安全規則更新",
                "進行系統補丁狀態檢查", 
                "執行漏洞掃描評估作業",
                "檢視使用者帳戶存取權限",
                "測試備份和復原機制",
                "更新防毒軟體病毒定義",
                "檢查SSL憑證有效期限",
                "執行安全配置基準檢查"
            ],
            "中期": [
                "規劃下一季安全檢測計畫",
                "評估現有防護工具效能",
                "建立安全意識培訓課程",
                "檢視和更新安全政策文件",
                "執行災難復原演練測試",
                "評估第三方服務安全性",
                "規劃安全預算和資源配置",
                "建立安全指標監控儀表板"
            ],
            "長期": [
                "制定年度資訊安全策略計畫",
                "評估和引入新興安全技術",
                "建立完善的安全管理制度",
                "發展內部安全專業能力",
                "建立安全事件處理標準程序",
                "完善風險評估和管理機制",
                "建立安全效益評估機制",
                "發展安全合規管理能力"
            ]
        },
        "緊急": {
            "立即": [
                "啟動緊急事件回應機制",
                "召集核心安全應變團隊", 
                "執行緊急威脅評估程序",
                "立即實施臨時防護強化",
                "通知高階管理層與利害關係人",
                "啟動危機管理作戰室",
                "緊急隔離受威脅系統元件",
                "執行關鍵資料緊急備份",
                "啟動業務持續營運計畫",
                "立即通報監管機關",
                "召開緊急安全會議",
                "執行威脅範圍快速評估"
            ],
            "短期": [
                "部署緊急安全修補程式",
                "強化即時威脅監控機制",
                "執行全面安全態勢評估",
                "加強事件回應團隊人力",
                "實施緊急存取控制措施",
                "啟動第三方安全顧問支援",
                "強化日誌收集與分析頻率",
                "執行緊急滲透測試評估",
                "加強供應鏈安全檢查",
                "實施緊急通訊管道",
                "執行關鍵系統健康檢查",
                "強化員工安全意識宣導"
            ],
            "中期": [
                "重新設計整體安全架構",
                "建立進階威脅獵捕能力",
                "實施零信任安全模型",
                "強化安全運營中心能力",
                "建立威脅情報整合平台",
                "執行全面安全風險評估",
                "強化第三方安全整合",
                "建立自動化事件回應機制",
                "實施進階行為分析系統",
                "強化安全指標監控儀表板",
                "建立跨部門協作機制",
                "實施持續安全評估流程"
            ],
            "長期": [
                "建立完善的安全管理制度和流程",
                "發展自動化安全監控和回應能力",
                "建立安全團隊專業技能培訓計畫",
                "發展內部安全事件處理專業能力",
                "建立與安全廠商的技術合作關係",
                "實施組織安全文化改善計畫",
                "建立安全技術研究和測試環境",
                "評估和導入新興安全防護技術",
                "建立多地點安全監控協作機制",
                "實施安全預算和效益管理制度",
                "建立安全領域專業人才培育機制",
                "發展安全供應商和合作夥伴網路"
            ]
        },
        "警戒": {
            "立即": [
                "調整現有防護參數設定",
                "加強即時安全監控強度",
                "準備進階應對預案",
                "強化威脅檢測靈敏度",
                "檢視當前安全政策有效性",
                "加強關鍵資產監控",
                "提升安全警報回應速度",
                "強化異常行為檢測",
                "檢查防護系統運行狀態",
                "加強安全事件關聯分析"
            ],
            "短期": [
                "優化安全規則引擎效能",
                "強化安全日誌分析能力",
                "提升攻擊阻擋成功率",
                "加強威脅狩獵活動",
                "實施安全控制措施驗證",
                "強化安全指標追蹤",
                "優化安全工具整合",
                "加強安全團隊培訓",
                "實施安全流程改善",
                "強化供應商安全檢查"
            ],
            "中期": [
                "部署下世代防護技術模組",
                "強化機器學習威脅檢測",
                "改善自動化回應機制",
                "建立威脅情報分享機制",
                "實施進階安全分析平台",
                "強化跨域安全整合",
                "建立安全效能基準",
                "實施持續合規監控",
                "強化業務風險管理整合",
                "建立安全創新試點項目"
            ],
            "長期": [
                "建立整合式安全防護管理平台",
                "完善自動化安全預警機制",
                "提升安全事件回應處理效率",
                "建立安全效能評估和改善機制", 
                "實施安全投資回報分析制度",
                "建立組織安全管理標準作業程序",
                "發展安全技術專業團隊能力",
                "建立安全創新技術評估機制",
                "實施長期安全策略規劃",
                "建立安全管理核心競爭力"
            ]
        },
        "注意": {
            "立即": [
                "維持當前監控強度水準",
                "執行防護規則微調最佳化",
                "持續觀察安全威脅趨勢變化",
                "檢查系統安全狀態指標",
                "維護既有安全控制措施",
                "監控安全指標異常變化",
                "執行例行安全檢查程序",
                "維持安全團隊警戒狀態"
            ],
            "短期": [
                "最佳化現有防護效能表現",
                "執行定期安全規則更新",
                "強化安全日誌追蹤分析",
                "實施預防性維護作業",
                "檢視安全政策適用性",
                "加強安全意識宣導活動",
                "執行安全控制有效性驗證",
                "優化安全工具配置參數"
            ],
            "中期": [
                "引入進階行為分析模組",
                "執行預防性安全調整",
                "持續最佳化系統效能",
                "建立安全趨勢預測能力",
                "實施安全創新技術試點",
                "強化安全與業務整合",
                "建立安全效益評估機制",
                "實施下世代安全技術評估"
            ],
            "長期": [
                "建立自動化安全預警系統",
                "實現安全維運作業自動化",
                "建立持續改進和優化管理流程",
                "發展組織安全技術專業能力",
                "建立完整的安全管理生態",
                "實施安全技術現代化轉型",
                "建立安全領導地位",
                "發展安全策略思維"
            ]
        },
        "良好": {
            "立即": [
                "保持現有優秀安全設定",
                "執行定期監控檢查作業",
                "維護系統穩定運行狀態",
                "持續監控安全指標表現",
                "維持安全團隊專業水準",
                "執行例行安全維護程序",
                "保持安全政策更新",
                "維護安全工具最佳狀態"
            ],
            "短期": [
                "執行定期安全規則更新",
                "進行系統效能微調最佳化",
                "實施預防性維護策略",
                "強化安全知識管理",
                "執行安全最佳實務檢視",
                "加強團隊專業技能培訓",
                "實施安全創新概念驗證",
                "優化安全流程效率"
            ],
            "中期": [
                "探索新興安全防護技術",
                "提升安全自動化程度",
                "最佳化使用者體驗設計",
                "建立安全創新實驗環境",
                "實施安全技術標準化",
                "強化安全與業務價值整合",
                "建立安全卓越實務",
                "實施安全領導力發展"
            ],
            "長期": [
                "推動持續技術創新發展",
                "全面提升防護能力等級",
                "建立業界安全最佳實務標竿",
                "發展安全技術思想領導力",
                "建立安全創新生態圈",
                "實施安全價值創造策略",
                "建立安全文化優勢",
                "發展安全策略競爭力"
            ]
        }
    }

# 獲取唯一的下一步行動建議
def get_unique_next_steps(threat_level):
    all_steps = get_diverse_next_steps()
    current_level_steps = all_steps[threat_level]
    
    result = []
    for timeframe, actions in current_level_steps.items():
        # 過濾已使用過多的行動
        available_actions = [
            action for action in actions
            if next_steps_usage_tracker.get(action, 0) < MAX_NEXT_STEPS_USAGE
        ]
        
        # 如果可用行動不足，放寬使用次數限制
        if not available_actions:
            available_actions = [
                action for action in actions
                if next_steps_usage_tracker.get(action, 0) < MAX_NEXT_STEPS_USAGE + 1
            ]
        
        # 如果還是不足，再放寬
        if not available_actions:
            available_actions = [
                action for action in actions
                if next_steps_usage_tracker.get(action, 0) < MAX_NEXT_STEPS_USAGE + 2
            ]
        
        # 最後回退：使用所有行動但優先選擇使用次數較少的
        if not available_actions:
            available_actions = sorted(actions, 
                                     key=lambda x: next_steps_usage_tracker.get(x, 0))
        
        # 隨機選擇一個行動
        selected_action = random.choice(available_actions)
        next_steps_usage_tracker[selected_action] = next_steps_usage_tracker.get(selected_action, 0) + 1
        
        result.append(f"- {timeframe}：{selected_action}")
    
    return result

# 生成下一步行動計畫
def generate_next_steps(entry):
    threat_level, _ = assess_threat_level(entry['blockingRate'], entry['totalAttacks'], entry['totalRequests'])
    return get_unique_next_steps(threat_level)

# 轉成文字檔內容
def format_data(entry):
    summary = generate_summary(entry)
    chart_analysis = generate_chart_analysis(entry)
    recommendations = generate_recommendations(entry)
    next_steps = generate_next_steps(entry)
    
    # 隨機選擇建議數量 (2-4個)
    selected_recs = random.sample(recommendations, min(len(recommendations), random.randint(2, 4)))
    
    return (
        "【摘要】\n"
        f"{summary}\n\n"
        "【圖表分析】\n"
        f"{chart_analysis}\n\n"
        "【建議】\n"
        + "\n".join([f"- {rec}" for rec in selected_recs]) + "\n\n"
        "【下一步】\n"
        + "\n".join(next_steps)
    )

# ==================== 主程式執行區域 ====================

if __name__ == "__main__":
    # 產生200筆經過驗證的資料
    print("開始產生訓練資料...")
    data_list = []
    for i in range(200):
        if (i + 1) % 40 == 0:
            print(f"已產生 {i + 1}/200 筆資料")
        data_list.append(generate_validated_security_data())

    print("資料產生完成，開始品質驗證...")

    # 執行品質檢查
    perform_quality_check(data_list)

    # 生成訓練檔案
    print("\n開始生成訓練檔案...")
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

    print("✅ 資料產生完成，檔案名：ai_training_sample.txt")
    print("\n🎉 優化完成！主要改善項目：")
    print("   ✅ 修正數據邏輯一致性問題")
    print("   ✅ 實現零攻擊場景專門處理")
    print("   ✅ 整合OWASP Top 10專業知識")
    print("   ✅ 重構為實用可操作建議")
    print("   ✅ 添加數據品質驗證機制")
