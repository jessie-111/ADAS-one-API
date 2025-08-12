const { GoogleGenerativeAI } = require('@google/generative-ai');
const OllamaClient = require('./ollamaClient');

// Gemini 客戶端包裝器
class GeminiClient {
  constructor(apiKey, model = 'gemini-2.5-flash') {
    if (!apiKey) {
      throw new Error('Gemini API Key 不能為空');
    }
    this.apiKey = apiKey;
    this.model = model;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async testConnection() {
    try {
      console.log('🧪 開始 Gemini AI 連接測試...');
      
      // 確保只測試 Gemini AI，不依賴任何外部服務
      const genModel = this.genAI.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          maxOutputTokens: 100, // 限制輸出長度，加快測試速度
          temperature: 0.1      // 降低隨機性，確保一致的測試結果
        }
      });
      
      const testPrompt = "請回答：連接測試成功";
      
      console.log(`🤖 使用模型 ${this.model} 進行純 AI 測試...`);
      const startTime = Date.now();
      
      const result = await genModel.generateContent(testPrompt);
      const response = result.response;
      const text = response.text();
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ Gemini AI 測試完成，耗時 ${responseTime}ms`);

      return {
        success: true,
        message: `Gemini AI 連接測試成功 (${responseTime}ms)`,
        response: text,
        model: this.model,
        responseTime: responseTime
      };
    } catch (error) {
      console.error('❌ Gemini 連接測試失敗:', error);
      
      // 詳細的錯誤分類
      let errorMessage = 'Gemini 連接失敗';
      if (error.message.includes('API_KEY_INVALID')) {
        errorMessage = 'API Key 無效，請檢查您的 Gemini API Key';
      } else if (error.message.includes('QUOTA_EXCEEDED')) {
        errorMessage = 'API 配額已超限，請稍後再試';
      } else if (error.message.includes('MODEL_NOT_FOUND')) {
        errorMessage = `模型 ${this.model} 不存在或不可用`;
      } else if (error.message.includes('PERMISSION_DENIED')) {
        errorMessage = 'API Key 權限不足，請檢查 API Key 設定';
      } else if (error.message.includes('NETWORK')) {
        errorMessage = '網路連接失敗，請檢查網路狀況';
      }
      
      throw new Error(`${errorMessage}: ${error.message}`);
    }
  }

  async generateContent(prompt, options = {}) {
    try {
      const genModel = this.genAI.getGenerativeModel({ model: this.model });
      const startTime = Date.now();
      
      console.log(`🤖 Gemini 生成請求: 模型=${this.model}, 提示詞長度=${prompt.length}`);
      
      const result = await genModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      const responseTime = Date.now() - startTime;

      console.log(`✅ Gemini 回應時間: ${responseTime}ms`);

      return {
        text: text,
        model: this.model,
        responseTime: responseTime
      };
    } catch (error) {
      console.error('Gemini 內容生成失敗:', error);
      throw new Error(`Gemini 內容生成失敗: ${error.message}`);
    }
  }

  async getModels() {
    // Gemini 的可用模型是固定的
    return {
      models: [
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' }
      ]
    };
  }
}

// AI 提供商管理器
class AIProviderManager {
  constructor() {
    this.providers = {};
    this.supportedProviders = ['gemini', 'ollama'];
  }

  // 建立並快取提供商實例
  getProvider(providerType, config) {
    if (!this.supportedProviders.includes(providerType)) {
      throw new Error(`不支援的 AI 提供商: ${providerType}`);
    }

    const cacheKey = `${providerType}_${JSON.stringify(config)}`;
    
    if (this.providers[cacheKey]) {
      return this.providers[cacheKey];
    }

    let provider;
    switch (providerType) {
      case 'gemini':
        if (!config.apiKey) {
          throw new Error('Gemini 需要 API Key');
        }
        provider = new GeminiClient(config.apiKey, config.model);
        break;
        
      case 'ollama':
        if (!config.apiUrl) {
          throw new Error('Ollama 需要 API URL');
        }
        provider = new OllamaClient(config.apiUrl);
        break;
        
      default:
        throw new Error(`未實現的提供商: ${providerType}`);
    }

    this.providers[cacheKey] = provider;
    return provider;
  }

  // 測試提供商連接
  async testProvider(providerType, config) {
    try {
      const provider = this.getProvider(providerType, config);
      return await provider.testConnection();
    } catch (error) {
      console.error(`測試 ${providerType} 連接失敗:`, error);
      throw error;
    }
  }

  // 使用指定提供商生成內容
  async generateContent(providerType, config, prompt, options = {}) {
    try {
      const provider = this.getProvider(providerType, config);
      
      // 根據提供商類型調整參數
      if (providerType === 'ollama' && config.model) {
        return await provider.generateContent(config.model, prompt, options);
      } else {
        return await provider.generateContent(prompt, options);
      }
    } catch (error) {
      console.error(`${providerType} 內容生成失敗:`, error);
      throw error;
    }
  }

  // 獲取提供商的可用模型
  async getProviderModels(providerType, config) {
    try {
      const provider = this.getProvider(providerType, config);
      return await provider.getModels();
    } catch (error) {
      console.error(`獲取 ${providerType} 模型列表失敗:`, error);
      throw error;
    }
  }

  // 驗證提供商配置
  validateProviderConfig(providerType, config) {
    const validators = {
      gemini: (cfg) => {
        if (!cfg.apiKey) throw new Error('缺少 Gemini API Key');
        if (!cfg.model) throw new Error('缺少 Gemini 模型名稱');
        return true;
      },
      ollama: (cfg) => {
        if (!cfg.apiUrl) throw new Error('缺少 Ollama API URL');
        if (!cfg.model) throw new Error('缺少 Ollama 模型名稱');
        
        // 驗證 URL 格式
        try {
          new URL(cfg.apiUrl);
        } catch (error) {
          throw new Error('Ollama API URL 格式無效');
        }
        return true;
      }
    };

    const validator = validators[providerType];
    if (!validator) {
      throw new Error(`不支援的提供商: ${providerType}`);
    }

    return validator(config);
  }

  // 清除快取
  clearCache() {
    this.providers = {};
  }

  // 獲取提供商資訊
  getProviderInfo(providerType) {
    const providerInfo = {
      gemini: {
        name: 'Google Gemini',
        type: 'cloud',
        description: '基於雲端的 Google Gemini AI 服務',
        requiredFields: ['apiKey', 'model'],
        features: ['高品質回應', '快速響應', '多語言支援'],
        limitations: ['需要網路連接', 'API 配額限制', '資料外送']
      },
      ollama: {
        name: 'Ollama',
        type: 'local',
        description: '本地部署的開源 AI 服務',
        requiredFields: ['apiUrl', 'model'],
        features: ['完全離線', '資料隱私', '無配額限制', '可自定義模型'],
        limitations: ['需要本地部署', '硬體需求較高', '模型品質可能較低']
      }
    };

    return providerInfo[providerType] || null;
  }

  // 列出所有支援的提供商
  listSupportedProviders() {
    return this.supportedProviders.map(type => ({
      type,
      info: this.getProviderInfo(type)
    }));
  }
}

// 建立全域實例
const aiProviderManager = new AIProviderManager();

module.exports = {
  AIProviderManager,
  GeminiClient,
  aiProviderManager
}; 