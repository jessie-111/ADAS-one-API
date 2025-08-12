// Ollama AI 客戶端
class OllamaClient {
  constructor(apiUrl = 'http://localhost:11434') {
    this.apiUrl = apiUrl.replace(/\/$/, ''); // 移除尾隨斜線
  }

  // 驗證 API URL 格式
  validateUrl(url) {
    try {
      const parsedUrl = new URL(url);
      // 只允許 http 和 https 協議
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('只支援 HTTP 和 HTTPS 協議');
      }
      
      // 基本的內網 IP 檢查（可選，用於安全考量）
      const hostname = parsedUrl.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || 
          hostname.startsWith('192.168.') || hostname.startsWith('10.') ||
          hostname.startsWith('172.')) {
        // 內網地址，允許通過
        return true;
      }
      
      // 其他地址也允許通過（可根據需要調整）
      return true;
    } catch (error) {
      throw new Error(`無效的 URL 格式: ${error.message}`);
    }
  }

  // 測試連接
  async testConnection() {
    this.validateUrl(this.apiUrl);
    
    try {
      const response = await fetch(`${this.apiUrl}/api/tags`, {
        method: 'GET',
        timeout: 10000, // 10秒超時
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Ollama 服務連接成功',
        modelCount: data.models ? data.models.length : 0
      };
    } catch (error) {
      console.error('Ollama 連接測試失敗:', error);
      throw new Error(`連接失敗: ${error.message}`);
    }
  }

  // 獲取可用模型列表
  async getModels() {
    this.validateUrl(this.apiUrl);
    
    try {
      const response = await fetch(`${this.apiUrl}/api/tags`, {
        method: 'GET',
        timeout: 15000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.models || !Array.isArray(data.models)) {
        return { models: [] };
      }

      // 格式化模型資訊
      const formattedModels = data.models.map(model => ({
        name: model.name,
        size: this.formatSize(model.size),
        digest: model.digest,
        modified_at: model.modified_at,
        details: model.details || {}
      }));

      return {
        models: formattedModels,
        count: formattedModels.length
      };
    } catch (error) {
      console.error('獲取 Ollama 模型列表失敗:', error);
      throw new Error(`獲取模型列表失敗: ${error.message}`);
    }
  }

  // 生成內容
  async generateContent(model, prompt, options = {}) {
    this.validateUrl(this.apiUrl);
    
    if (!model || !prompt) {
      throw new Error('模型名稱和提示詞不能為空');
    }

    const requestBody = {
      model: model,
      prompt: prompt,
      stream: false, // 不使用串流模式
      options: {
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 0.9,
        top_k: options.top_k || 40,
        num_predict: options.max_tokens || 2048,
        ...options
      }
    };

    try {
      console.log(`🤖 Ollama 生成請求: 模型=${model}, 提示詞長度=${prompt.length}`);
      const startTime = Date.now();

      const response = await fetch(`${this.apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        timeout: 120000, // 2分鐘超時
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      console.log(`✅ Ollama 回應時間: ${responseTime}ms`);

      if (!data.response) {
        throw new Error('Ollama 回應格式異常: 缺少 response 欄位');
      }

      return {
        text: data.response,
        model: data.model,
        created_at: data.created_at,
        done: data.done,
        context: data.context,
        total_duration: data.total_duration,
        load_duration: data.load_duration,
        prompt_eval_count: data.prompt_eval_count,
        prompt_eval_duration: data.prompt_eval_duration,
        eval_count: data.eval_count,
        eval_duration: data.eval_duration,
        responseTime: responseTime
      };
    } catch (error) {
      console.error('Ollama 內容生成失敗:', error);
      throw new Error(`內容生成失敗: ${error.message}`);
    }
  }

  // 檢查模型是否可用
  async isModelAvailable(modelName) {
    try {
      const { models } = await this.getModels();
      return models.some(model => model.name === modelName);
    } catch (error) {
      console.error('檢查模型可用性失敗:', error);
      return false;
    }
  }

  // 格式化檔案大小
  formatSize(bytes) {
    if (!bytes) return 'Unknown';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(1);
    
    return `${size} ${sizes[i]}`;
  }

  // 獲取模型資訊
  async getModelInfo(modelName) {
    this.validateUrl(this.apiUrl);
    
    try {
      const response = await fetch(`${this.apiUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        name: data.modelfile,
        template: data.template,
        parameters: data.parameters,
        model_info: data.model_info || {},
        details: data.details || {}
      };
    } catch (error) {
      console.error('獲取模型資訊失敗:', error);
      throw new Error(`獲取模型資訊失敗: ${error.message}`);
    }
  }

  // 簡單的健康檢查
  async healthCheck() {
    try {
      const response = await fetch(`${this.apiUrl}/`, {
        method: 'GET',
        timeout: 5000,
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

module.exports = OllamaClient; 