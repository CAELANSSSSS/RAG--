// 未來語音助手應用
document.addEventListener('DOMContentLoaded', function() {
  // DOM 元素
  const voiceButton = document.querySelector('.voice-button');
  const voiceOrb = document.querySelector('.voice-orb');
  const orbInner = document.querySelector('.orb-inner');
  const userMessage = document.querySelector('.user-message');
  const assistantMessage = document.querySelector('.assistant-message');
  const techStatus = document.querySelector('.tech-readout-status');
  const techData = document.querySelector('.tech-readout-data');
  const messageDisplay = document.querySelector('.message-display');
  
  // 添加RAG連接時間變數
  let ragConnectionTime = null;
  
  // 嘗試從localStorage讀取上次的連接時間
  const savedConnectionTime = localStorage.getItem('ragConnectionTime');
  if (savedConnectionTime) {
    try {
      ragConnectionTime = new Date(savedConnectionTime);
      console.log("從localStorage讀取RAG連接時間:", ragConnectionTime);
    } catch (e) {
      console.error("無法解析存儲的連接時間:", e);
    }
  }
  
  // 添加圖標到圓形中心
  const orbIcon = document.createElement('img');
  orbIcon.src = 'ic.png';
  orbIcon.alt = 'Voice Assistant';
  orbInner.appendChild(orbIcon);
  
  // 創建語音波形元素
  const voiceWaves = document.createElement('div');
  voiceWaves.className = 'voice-waves';
  for (let i = 0; i < 5; i++) {
    const wave = document.createElement('div');
    wave.className = 'voice-wave';
    voiceWaves.appendChild(wave);
  }
  voiceOrb.appendChild(voiceWaves);
  
  // 創建提示文字
  const speechPrompt = document.createElement('div');
  speechPrompt.className = 'speech-prompt';
  speechPrompt.textContent = '請說話...';
  document.querySelector('.voice-container').appendChild(speechPrompt);
  
  // 創建按鈕提示
  const buttonHint = document.createElement('div');
  buttonHint.className = 'button-hint';
  buttonHint.textContent = '點擊麥克風按鈕啟動語音介面';
  document.querySelector('.voice-container').appendChild(buttonHint);
  
  // 語音識別功能 (STT - Speech to Text)
  let recognition;
  let isRecording = false;
  let speechToTextSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  
  // 文字轉語音功能 (TTS - Text to Speech)
  let synthesis = window.speechSynthesis;
  let synthVoices = [];
  let synthSupported = 'speechSynthesis' in window;
  let isSpeaking = false;
  
  // AI 回應選項
  const aiResponses = [
    "正在分析您的請求，處理中...",
    "已接收到資訊指令，正在執行相關計算...",
    "系統已啟動回應程序，正在評估最佳解決方案...",
    "已解析您的問題，根據資料庫分析結果...",
    "已掃描相關參數，推薦解決方案如下...",
    "已連接中央資料庫，尋找最適合的回應...",
    "智能分析引擎已啟動，結果顯示...",
    "已匹配到相關指令，優先級處理中...",
    "量子運算模組已啟動，正在生成最佳答案...",
    "全功能人工智能系統響應，正在形成回應..."
  ];
  
  // 語音識別設置
  const STT_CONFIG = {
    lang: 'zh-TW',        // 繁體中文
    continuous: false,    // 不連續識別
    interimResults: true, // 顯示中間結果
    maxAlternatives: 1    // 最多替代結果數
  };
  
  // 語音合成設置
  const TTS_CONFIG = {
    lang: 'zh-TW',        // 繁體中文
    rate: 1.0,            // 語速 (0.1 to 10)
    pitch: 1.0,           // 音調 (0 to 2)
    volume: 1.0           // 音量 (0 to 1)
  };
  
  // 啟動視覺效果
  initVisualEffects();
  
  // 初始化語音識別 (STT)
  function initSpeechRecognition() {
    updateTechReadout('STATUS: INITIALIZING', 'CONFIGURING SPEECH RECOGNITION');
    techStatus.style.backgroundColor = '#ffaa40'; // 初始化中狀態
    
    if (speechToTextSupported) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        // 應用配置
        recognition.continuous = STT_CONFIG.continuous;
        recognition.interimResults = STT_CONFIG.interimResults;
        recognition.maxAlternatives = STT_CONFIG.maxAlternatives;
        recognition.lang = STT_CONFIG.lang;
        
        // 設置事件處理器
        configureSTTEventHandlers();
        
        updateTechReadout('STATUS: READY', 'SPEECH RECOGNITION INITIALIZED');
        techStatus.style.backgroundColor = '#40ff80'; // 成功狀態
      } catch (error) {
        console.error('語音識別初始化錯誤:', error);
        showErrorMessage('語音識別初始化失敗');
        updateTechReadout('STATUS: ERROR', 'SPEECH RECOGNITION INITIALIZATION FAILED');
        techStatus.style.backgroundColor = '#ff4040'; // 錯誤狀態
      }
    } else {
      voiceButton.style.display = 'none';
      showErrorMessage('您的瀏覽器不支援語音識別功能');
      updateTechReadout('STATUS: ERROR', 'BROWSER NOT SUPPORTED');
      techStatus.style.backgroundColor = '#ff4040'; // 錯誤狀態
    }
  }
  
  // 配置語音識別事件處理器
  function configureSTTEventHandlers() {
    // 開始識別
    recognition.onstart = function() {
      isRecording = true;
      updateRecordingState(true);
      updateTechReadout('STATUS: LISTENING', 'VOICE INPUT: ACTIVE');
      techStatus.style.backgroundColor = '#40a0ff'; // 處理中狀態
      console.log('語音識別已啟動');
      
      // 更新按鈕提示
      buttonHint.textContent = '正在聆聽...點擊停止';
      buttonHint.style.opacity = '0.8';
      
      // 顯示提示
      speechPrompt.textContent = '請說出您想問的問題...';
      speechPrompt.style.color = '#a0d0ff';
    };
    
    // 有識別結果
    recognition.onresult = function(event) {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript;
      const confidence = event.results[lastResultIndex][0].confidence;
      
      // 顯示用戶訊息
      updateUserMessage(transcript);
      
      // 縮短輸入文本顯示
      let displayText = transcript;
      if (displayText.length > 20) {
        displayText = displayText.substring(0, 20) + '...';
      }
      
      updateTechReadout(displayText, 'PROCESSING', 'normal');
      techStatus.style.backgroundColor = '#40a0ff'; // 處理中狀態
      
      // 如果是最終結果
      if (event.results[lastResultIndex].isFinal) {
        // 增強圓球效果
        animateOrbResponse();
        console.log(`最終識別結果: ${transcript} (信心度: ${Math.floor(confidence * 100)}%)`);
      }
      
      // 更新提示文字
      if (transcript && transcript.length > 0) {
        speechPrompt.textContent = '繼續說或點擊按鈕結束';
        speechPrompt.style.color = '#80c0ff';
      }
    };
    
    // 識別結束
    recognition.onend = function() {
      isRecording = false;
      updateRecordingState(false);
      
      // 恢復按鈕提示
      buttonHint.textContent = '點擊麥克風按鈕啟動語音介面';
      buttonHint.style.opacity = '0.6';
      
      // 恢復提示文字
      speechPrompt.textContent = '請說話...';
      speechPrompt.style.color = '#a0c0ff';
      
      // 提取用戶訊息
      const text = userMessage.textContent;
      console.log(`語音識別結束，獲取文本: "${text}"`);
      
      if (text && text.trim() !== '') {
        // 處理回覆
        updateTechReadout('STATUS: ANALYZING', 'GENERATING RESPONSE');
        techStatus.style.backgroundColor = '#40a0ff'; // 處理中狀態
        console.log(`開始處理用戶問題: "${text}"`);
        
        setTimeout(() => {
          processResponse(text)
            .then(() => {
              console.log('回應處理完成');
            })
            .catch(error => {
              console.error('處理回應時出錯:', error);
              updateAssistantMessage('處理您的請求時發生錯誤，請再試一次。');
            });
        }, 1000);
      } else {
        updateTechReadout('STATUS: ONLINE', 'AWAITING INPUT');
        techStatus.style.backgroundColor = '#40ff80'; // 成功狀態
        console.log('未獲取到有效語音輸入');
      }
      
      console.log('語音識別已結束');
    };
    
    // 識別錯誤
    recognition.onerror = function(event) {
      console.error('語音識別錯誤:', event.error);
      isRecording = false;
      updateRecordingState(false);
      
      let errorMessage;
      switch(event.error) {
        case 'no-speech':
          errorMessage = '未檢測到語音，請再試一次';
          break;
        case 'audio-capture':
          errorMessage = '無法捕獲音頻，請檢查麥克風';
          break;
        case 'not-allowed':
          errorMessage = '麥克風訪問被拒絕，請允許使用麥克風';
          break;
        case 'network':
          errorMessage = '網絡錯誤，請檢查您的連接';
          break;
        case 'aborted':
          errorMessage = '語音識別被中止';
          break;
        default:
          errorMessage = '語音識別發生錯誤，請再試一次';
      }
      
      showErrorMessage(errorMessage);
      updateTechReadout('STATUS: ERROR', `RECOGNITION ERROR: ${event.error.toUpperCase()}`);
      techStatus.style.backgroundColor = '#ff4040'; // 錯誤狀態
    };
    
    // 識別無匹配
    recognition.onnomatch = function() {
      showErrorMessage('無法識別您的語音，請再試一次');
      updateTechReadout('STATUS: WARNING', 'NO SPEECH MATCH FOUND');
      techStatus.style.backgroundColor = '#ffaa40'; // 警告狀態
    };
  }
  
  // 初始化語音合成 (TTS)
  function initSpeechSynthesis() {
    updateTechReadout('STATUS: INITIALIZING', 'CONFIGURING SPEECH SYNTHESIS');
    techStatus.style.backgroundColor = '#ffaa40'; // 初始化中狀態
    
    if (synthSupported) {
      try {
        // 載入所有可用的聲音
        loadVoices().then(voices => {
          synthVoices = voices;
          console.log(`已載入 ${voices.length} 個聲音`);
          updateTechReadout('STATUS: READY', `SPEECH SYNTHESIS INITIALIZED (${voices.length} VOICES)`);
          techStatus.style.backgroundColor = '#40ff80'; // 成功狀態
        });
        
        // 監聽合成狀態變更
        synthesis.addEventListener('voiceschanged', () => {
          loadVoices().then(voices => {
            synthVoices = voices;
          });
        });
      } catch (error) {
        console.error('語音合成初始化錯誤:', error);
        showErrorMessage('語音合成初始化失敗');
        updateTechReadout('STATUS: ERROR', 'SPEECH SYNTHESIS INITIALIZATION FAILED');
        techStatus.style.backgroundColor = '#ff4040'; // 錯誤狀態
      }
    } else {
      showErrorMessage('您的瀏覽器不支援語音合成功能');
      updateTechReadout('STATUS: WARNING', 'SPEECH SYNTHESIS NOT SUPPORTED');
      techStatus.style.backgroundColor = '#ffaa40'; // 警告狀態
    }
  }
  
  // 更新錄音狀態
  function updateRecordingState(isRecording) {
    if (isRecording) {
      voiceButton.classList.add('recording');
      voiceWaves.classList.add('active');
      speechPrompt.classList.add('active');
      buttonHint.style.opacity = '0';
      
      // 增強圓球動畫
      orbInner.style.animation = 'pulse 1s infinite alternate';
      
      // 添加錄音中視覺效果
      document.body.classList.add('recording-active');
    } else {
      voiceButton.classList.remove('recording');
      voiceWaves.classList.remove('active');
      speechPrompt.classList.remove('active');
      buttonHint.style.opacity = '0.6';
      
      // 恢復正常動畫
      orbInner.style.animation = 'pulse 3s infinite alternate';
      
      // 移除錄音中視覺效果
      document.body.classList.remove('recording-active');
    }
  }
  
  // 格式化RAG連接時間字符串
  function formatRagConnectionTime() {
    if (!ragConnectionTime) return "未知連接時間";
    
    try {
      const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
      };
      return ragConnectionTime.toLocaleString('zh-TW', options);
    } catch (e) {
      console.error("格式化連接時間錯誤:", e);
      return ragConnectionTime.toString();
    }
  }
  
  // 更新技術讀數
  function updateTechReadout(message, status, statusColor = "normal") {
    const techReadout = document.querySelector('.tech-readout');
    const techReadoutData = document.querySelector('.tech-readout-data');
    const techStatus = document.querySelector('.tech-readout-status');
    
    if (!techReadout || !techReadoutData || !techStatus) return;
    
    // 設置狀態顏色
    switch(statusColor) {
        case "success":
            techStatus.style.color = "#40ff80";
            break;
        case "error":
            techStatus.style.color = "#ff4040";
            break;
        case "warning":
            techStatus.style.color = "#ffaa40";
            break;
        default:
            techStatus.style.color = "#40a9ff";
    }
    
   
    
    // 更新數據顯示，始終添加RAG連接時間
    const connectionTime = formatRagConnectionTime();
    
    // 如果消息自身就包含連接時間信息，則不重複添加
    if (message.indexOf('RAG系統連接時間') === -1) {
      techReadoutData.textContent = `最後資料更新時間: ${connectionTime} `;
    } else {
      techReadoutData.textContent = message;
    }
  }
  
  // 更新用戶訊息
  function updateUserMessage(text) {
    userMessage.textContent = text;
    userMessage.classList.add('active');
    
    // 添加科技感掃描效果
    addScanEffect(userMessage);
  }
  
  // 更新助手訊息
  function updateAssistantMessage(text, speed = 20) {
    assistantMessage.textContent = '';
    assistantMessage.classList.add('active');
    
    // 打字機效果
    return typeWriter(assistantMessage, text, 0, speed).then(() => {
      return Promise.resolve();
    });
  }
  
  // 打字機效果
  function typeWriter(element, text, index, speed) {
    return new Promise((resolve) => {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        
        // 如果是標點符號，稍微增加延遲
        const currentChar = text.charAt(index);
        const isSpecialChar = /[，。！？、：；]/.test(currentChar);
        const nextDelay = isSpecialChar ? speed * 3 : speed;
        
        // 打字中的技術讀數更新
        if (index % 10 === 0) {
          updateTechReadout('STATUS: RESPONDING', `OUTPUT: ${Math.round((index / text.length) * 100)}%`);
        }
        
        setTimeout(() => {
          typeWriter(element, text, index + 1, speed).then(resolve);
        }, nextDelay);
      } else {
        updateTechReadout('STATUS: ONLINE', 'RESPONSE COMPLETE');
        resolve();
      }
    });
  }
  
  // 科技感掃描效果
  function addScanEffect(element) {
    const scanEffect = document.createElement('div');
    scanEffect.className = 'scan-effect';
    element.appendChild(scanEffect);
    
    setTimeout(() => {
      element.removeChild(scanEffect);
    }, 1000);
  }
  
  // 創建消息元素
  function createMessageElement(sender, text, type = 'system') {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}-message`;
    messageElement.innerHTML = `
      <div class="message-bubble ${type}-bubble">
        <div class="message-sender">${sender}</div>
        <div class="message-text">${text}</div>
      </div>
    `;
    return messageElement;
  }
  
  // 獲取 AI 回應
  async function getAIResponse(message) {
    updateTechReadout("正在連接到AI模型...", "處理中", "warning");
    console.log("嘗試發送問題到RAG服務器:", message);
    
    // 更新視覺效果顯示處理狀態
    voiceOrb.classList.remove("recording");
    voiceOrb.classList.add("processing");
    
    try {
        // 根據初始化時的檢測結果決定使用哪個端點
        const useQaEndpoint = window._useQaEndpoint === true;
        const endpoint = useQaEndpoint ? '/qa' : '/ask';
        const contentType = useQaEndpoint ? 'application/x-www-form-urlencoded' : 'application/json';
        
        console.log(`發送請求到 http://120.108.111.136:5000${endpoint} (${useQaEndpoint ? 'form' : 'json'}格式)`);
        
        // 準備請求內容
        let body;
        if (useQaEndpoint) {
            // 使用表單格式（適用於/qa端點）
            body = new URLSearchParams({
                'question': message
            });
        } else {
            // 使用JSON格式（適用於/ask端點）
            body = JSON.stringify({ question: message });
        }
        
        // 發送請求
        const response = await fetch(`https://120.108.111.136:5000${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'Accept': 'application/json'
            },
            body: body,
            // 添加超時設置
            signal: AbortSignal.timeout(50000) // 50秒超時
        });
        
        console.log("收到響應狀態碼:", response.status, response.statusText);
        
        if (!response.ok) {
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || `伺服器錯誤: ${response.status}`;
                console.error("伺服器返回錯誤:", errorData);
            } catch (jsonError) {
                errorMessage = `伺服器錯誤: ${response.status}`;
                console.error("無法解析錯誤響應:", jsonError);
            }
            throw new Error(errorMessage);
        }
        
        console.log("解析響應JSON...");
        const data = await response.json();
        console.log("響應數據:", data);
        
        // 更新技術讀數顯示成功狀態
        updateTechReadout(`回應已生成`, "就緒", "success");
        
        // 轉換回來正常狀態
        voiceOrb.classList.remove("processing");
        
        // 兼容多種不同的回應格式
        if (data.answer) {
            console.log("成功獲取回答，長度:", data.answer.length);
            return data.answer;
        } else if (data.response) {
            console.log("成功獲取回答(response格式)，長度:", data.response.length);
            return data.response;
        } else if (data.status === "success" && data.message) {
            console.log("成功獲取回答(message格式)，長度:", data.message.length);
            return data.message;
        } else if (typeof data === 'string') {
            console.log("成功獲取回答(字符串格式)，長度:", data.length);
            return data;
        } else {
            console.error("響應缺少answer字段:", data);
            return "無法解析伺服器回應，請確認RAG系統設置是否正確。";
        }
    } catch (error) {
        // 根據錯誤類型提供不同反饋
        console.error("獲取AI回應失敗:", error.message);
        voiceOrb.classList.remove("processing");
        
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            updateTechReadout("無法連接到伺服器", "錯誤", "error");
            return "無法連接到後端系統，請確認系統是否在執行中。可能原因: 伺服器未啟動、網絡連接問題或CORS限制。";
        } else {
            updateTechReadout(`錯誤: ${error.message}`, "錯誤", "error");
            return `處理您的請求時發生錯誤: ${error.message}。請檢查伺服器日誌以獲取更多信息。`;
        }
    }
  }
  
  // 文字轉語音 (TTS)
  function speakText(text) {
    if (!synthSupported || !text) return;
    
    try {
      // 如果已經在播放，先停止
      if (isSpeaking) {
        synthesis.cancel();
      }
      
      updateTechReadout('STATUS: SPEAKING', 'VOICE SYNTHESIS ACTIVE');
      techStatus.style.backgroundColor = '#40a0ff'; // 處理中狀態
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // 應用配置
      utterance.lang = TTS_CONFIG.lang;
      utterance.rate = TTS_CONFIG.rate;
      utterance.pitch = TTS_CONFIG.pitch;
      utterance.volume = TTS_CONFIG.volume;
      
      // 選擇合適的聲音
      const selectedVoice = getBestVoice();
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`使用語音: ${selectedVoice.name} (${selectedVoice.lang})`);
      }
      
      // 設置 TTS 事件處理器
      configureTTSEventHandlers(utterance);
      
      // 開始播放
      synthesis.speak(utterance);
      isSpeaking = true;
      
      // 顯示播放中視覺效果
      animateOrbSpeaking();
      document.body.classList.add('speaking');
      
    } catch (error) {
      console.error('語音合成錯誤:', error);
      updateTechReadout('STATUS: ERROR', 'SPEECH SYNTHESIS FAILED');
      techStatus.style.backgroundColor = '#ff4040'; // 錯誤狀態
      isSpeaking = false;
    }
  }
  
  // 配置語音合成事件處理器
  function configureTTSEventHandlers(utterance) {
    // 播放開始
    utterance.onstart = function() {
      console.log('語音播放開始');
      // 啟動波浪動畫
      voiceWaves.classList.add('speaking');
      
      // 更新狀態
      updateTechReadout('STATUS: SPEAKING', 'TTS PLAYBACK ACTIVE');
      techStatus.style.backgroundColor = '#40a0ff'; // 處理中狀態
    };
    
    // 播放結束
    utterance.onend = function() {
      console.log('語音播放結束');
      isSpeaking = false;
      orbInner.style.animation = 'pulse 3s infinite alternate';
      document.body.classList.remove('speaking');
      // 停止波浪動畫
      voiceWaves.classList.remove('active');
      voiceWaves.classList.remove('speaking');
      updateTechReadout('STATUS: ONLINE', 'AWAITING INPUT');
      techStatus.style.backgroundColor = '#40ff80'; // 成功狀態
    };
    
    // 播放出錯
    utterance.onerror = function(event) {
      console.error('語音播放錯誤:', event.error);
      isSpeaking = false;
      document.body.classList.remove('speaking');
      updateTechReadout('STATUS: ERROR', `SYNTHESIS ERROR: ${event.error || 'UNKNOWN'}`);
      techStatus.style.backgroundColor = '#ff4040'; // 錯誤狀態
    };
    
    // 播放暫停
    utterance.onpause = function() {
      console.log('語音播放暫停');
      updateTechReadout('STATUS: PAUSED', 'VOICE SYNTHESIS PAUSED');
      techStatus.style.backgroundColor = '#ffaa40'; // 警告狀態
    };
    
    // 播放恢復
    utterance.onresume = function() {
      console.log('語音播放恢復');
      updateTechReadout('STATUS: SPEAKING', 'VOICE SYNTHESIS RESUMED');
      techStatus.style.backgroundColor = '#40a0ff'; // 處理中狀態
    };
    
    // 播放進度更新
    utterance.onboundary = function(event) {
      // 邊界事件 (單詞或句子)
      if (event.name === 'word') {
        // 可以在這裡高亮當前單詞
        // 保持狀態顯示為處理中
        techStatus.style.backgroundColor = '#40a0ff';
      }
    };
  }
  
  // 獲取最佳語音
  function getBestVoice() {
    if (!synthVoices || synthVoices.length === 0) {
      return null;
    }
    
    // 優先選擇繁體中文女聲
    let bestVoice = synthVoices.find(voice => 
      voice.lang.includes('zh-TW') && voice.name.toLowerCase().includes('female'));
    
    // 其次選擇任何繁體中文聲音
    if (!bestVoice) {
      bestVoice = synthVoices.find(voice => voice.lang.includes('zh-TW'));
    }
    
    // 再次選擇任何中文聲音
    if (!bestVoice) {
      bestVoice = synthVoices.find(voice => voice.lang.includes('zh'));
    }
    
    // 最後選擇默認聲音
    if (!bestVoice && synthVoices.length > 0) {
      bestVoice = synthVoices[0];
    }
    
    return bestVoice;
  }
  
  // 處理回應
  async function processResponse(userText) {
    // 更新技術讀數顯示正在處理
    updateTechReadout('STATUS: QUERYING', 'CONNECTING TO RAG DATABASE');
    techStatus.style.backgroundColor = '#40a0ff'; // 處理中狀態
    console.log(`開始處理回應流程，問題: "${userText}"`);
    
    // 根據使用者文字獲取RAG系統回應
    try {
      console.log("嘗試獲取AI回應...");
      
      // 先清空助手訊息，並顯示處理中狀態
      assistantMessage.textContent = '正在查詢相關資料...';
      assistantMessage.classList.add('active');
      
      const response = await getAIResponse(userText);
      console.log(`成功獲取AI回應，長度: ${response.length} 字元`);
      
      // 更新技術讀數顯示生成回應
      updateTechReadout('STATUS: GENERATING', 'FORMATTING RESPONSE');
      techStatus.style.backgroundColor = '#40a0ff'; // 處理中狀態
      console.log("更新助手訊息...");
      
      // 大型回應處理：如果回應太長，提高打字機效果速度
      const typeSpeed = response.length > 500 ? 10 : 20;
      await updateAssistantMessage(response, typeSpeed);
      console.log("助手訊息更新完成");
      
      // 語音播放回應
      updateTechReadout('STATUS: SPEAKING', 'TEXT-TO-SPEECH ACTIVE');
      techStatus.style.backgroundColor = '#40a0ff'; // 處理中狀態
      console.log("開始語音播放回應...");
      speakText(response);
      
      // 添加科技感掃描效果
      addScanEffect(assistantMessage);
      console.log("處理回應流程完成");
      return response; // 返回回應以便鏈式處理
    } catch (error) {
      console.error('處理回應錯誤:', error);
      updateTechReadout('STATUS: ERROR', 'PROCESSING FAILED');
      techStatus.style.backgroundColor = '#ff4040'; // 錯誤狀態
      await updateAssistantMessage("很抱歉，處理您的請求時發生錯誤。請確認RAG服務器是否正常運行。");
      throw error; // 往外拋出錯誤以便更高層級處理
    }
  }
  
  // 顯示錯誤訊息
  function showErrorMessage(message) {
    const errorMessage = document.createElement('div');
    errorMessage.textContent = message;
    errorMessage.style.position = 'fixed';
    errorMessage.style.top = '20px';
    errorMessage.style.left = '50%';
    errorMessage.style.transform = 'translateX(-50%)';
    errorMessage.style.backgroundColor = 'rgba(255, 64, 128, 0.9)';
    errorMessage.style.color = 'white';
    errorMessage.style.padding = '10px 20px';
    errorMessage.style.borderRadius = '5px';
    errorMessage.style.zIndex = '1000';
    errorMessage.style.fontFamily = "'Rajdhani', sans-serif";
    errorMessage.style.boxShadow = '0 0 20px rgba(255, 64, 128, 0.5)';
    
    document.body.appendChild(errorMessage);
    
    setTimeout(() => {
      errorMessage.style.opacity = '0';
      errorMessage.style.transition = 'opacity 0.5s ease';
      
      setTimeout(() => {
        if (errorMessage.parentNode) {
          document.body.removeChild(errorMessage);
        }
      }, 500);
    }, 3000);
  }
  
  // 初始化視覺效果
  function initVisualEffects() {
    updateTechReadout('STATUS: INITIALIZING', 'LOADING VISUAL MODULES');
    
    // 添加額外的科技裝飾元素
    for (let i = 0; i < 8; i++) {
      const techDot = document.createElement('div');
      techDot.className = 'tech-dot';
      techDot.style.top = Math.random() * 100 + '%';
      techDot.style.left = Math.random() * 100 + '%';
      techDot.style.animationDelay = (Math.random() * 5) + 's';
      techDot.style.opacity = 0.2 + Math.random() * 0.4;
      techDot.style.transform = `scale(${0.5 + Math.random()})`;
      document.querySelector('.voice-container').appendChild(techDot);
    }
    
    // 添加3D視差效果
    const voiceContainer = document.querySelector('.voice-container');
    voiceContainer.classList.add('parallax-container');
    
    const techCircle = document.querySelector('.tech-circle');
    if (techCircle) {
      techCircle.classList.add('parallax-deep');
      techCircle.style.animation = 'rotate 60s linear infinite';
    }
    
    // 添加滑鼠視差效果
    document.addEventListener('mousemove', function(e) {
      const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
      const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
      voiceOrb.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg) translate3d(0, 0, 0)`;
    });
    
    // 添加CSS樣式
    const style = document.createElement('style');
    style.textContent = `
      .tech-dot {
        position: absolute;
        width: 4px;
        height: 4px;
        background-color: rgba(64, 128, 255, 0.6);
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(64, 128, 255, 0.8);
        animation: pulse 3s infinite alternate;
        z-index: 0;
      }
      
      .scan-effect {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(to bottom, 
          rgba(64, 128, 255, 0), 
          rgba(64, 128, 255, 0.2), 
          rgba(64, 128, 255, 0)
        );
        animation: scan 1s ease-out;
        pointer-events: none;
        z-index: 10;
      }
      
      body.recording-active {
        background: linear-gradient(135deg, #1a1a2e, #2a0a20) !important;
      }
      
      body.processing {
        background: linear-gradient(135deg, #0a1a30, #1a1a2e) !important;
      }
      
      body.speaking {
        background: linear-gradient(135deg, #0a1a2e, #0a2a30) !important;
      }
      
      @keyframes scan {
        0% {
          transform: translateY(-100%);
          opacity: 0;
        }
        50% {
          opacity: 0.8;
        }
        100% {
          transform: translateY(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
    
    // 添加初始動畫
    voiceOrb.style.opacity = '0';
    techStatus.textContent = 'STATUS: BOOTING';
    
    // 如果已有儲存的連接時間，立即顯示
    if (ragConnectionTime) {
      const connectionTimeStr = formatRagConnectionTime();
      techData.textContent = `RAG系統連接時間: ${connectionTimeStr} | INITIALIZING SYSTEMS`;
    } else {
      techData.textContent = 'INITIALIZING SYSTEMS';
    }
    
    // 順序啟動元素
    setTimeout(() => {
      voiceOrb.style.opacity = '1';
      voiceOrb.style.transition = 'opacity 1.5s cubic-bezier(0.2, 0.8, 0.2, 1.0)';
      
      setTimeout(() => {
        document.querySelector('.tech-circle').style.opacity = '1';
        document.querySelector('.tech-lines').style.opacity = '1';
        
        setTimeout(() => {
          document.querySelector('.voice-button').style.opacity = '1';
          document.querySelector('.tech-readout').style.opacity = '1';
        }, 300);
      }, 500);
    }, 800);
  }
  
  // 圓球響應動畫
  function animateOrbResponse() {
    orbInner.style.animation = 'none';
    
    setTimeout(() => {
      orbInner.style.animation = 'pulse 1.5s infinite alternate';
    }, 50);
  }
  
  // 圓球說話動畫
  function animateOrbSpeaking() {
    orbInner.style.animation = 'none';
    
    setTimeout(() => {
      orbInner.style.animation = 'pulse 0.8s infinite alternate';
      
      // 顯示波形動畫
      voiceWaves.classList.add('active');
      
      // 使波浪根據聲音大小變化
      const waves = voiceWaves.querySelectorAll('.voice-wave');
      waves.forEach((wave, index) => {
        wave.style.animation = `voice-wave 0.${5 + index}s infinite alternate`;
        wave.style.animationDelay = `0.${index}s`;
      });
    }, 50);
  }
  
  // 處理按鈕點擊
  function handleVoiceButtonClick() {
    if (!isRecording) {
      // 如果正在播放語音，先停止
      if (isSpeaking) {
        synthesis.cancel();
        isSpeaking = false;
        document.body.classList.remove('speaking');
      }
      
      // 科技按下效果
      voiceButton.classList.add('button-press');
      setTimeout(() => voiceButton.classList.remove('button-press'), 300);
      
      // 清空之前的訊息
      userMessage.textContent = '';
      userMessage.classList.remove('active');
      assistantMessage.textContent = '';
      assistantMessage.classList.remove('active');
      
      // 技術讀數更新
      updateTechReadout('STATUS: INITIALIZING', 'VOICE CAPTURE STARTING');
      techStatus.style.backgroundColor = '#ffaa40'; // 初始化中狀態
      
      // 開始錄音
      setTimeout(() => {
        try {
          recognition.start();
        } catch (error) {
          console.error('啟動語音識別錯誤:', error);
          showErrorMessage('無法啟動語音識別，請重新加載頁面');
          updateTechReadout('STATUS: ERROR', 'FAILED TO START RECOGNITION');
          techStatus.style.backgroundColor = '#ff4040'; // 錯誤狀態
        }
      }, 500);
    } else {
      // 停止錄音
      try {
        recognition.stop();
        updateTechReadout('STATUS: PROCESSING', 'FINALIZING RECOGNITION');
        techStatus.style.backgroundColor = '#40a0ff'; // 處理中狀態
      } catch (error) {
        console.error('停止語音識別錯誤:', error);
        updateTechReadout('STATUS: ERROR', 'FAILED TO STOP RECOGNITION');
        techStatus.style.backgroundColor = '#ff4040'; // 錯誤狀態
      }
    }
  }
  
  // 載入語音合成聲音
  function loadVoices() {
    return new Promise((resolve) => {
      let voices = synthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
      } else {
        const voicesChangedCallback = () => {
          voices = synthesis.getVoices();
          synthesis.removeEventListener('voiceschanged', voicesChangedCallback);
          resolve(voices);
        };
        synthesis.addEventListener('voiceschanged', voicesChangedCallback);
        
        // 設置超時，防止無限等待
        setTimeout(() => {
          if (!voices.length) {
            synthesis.removeEventListener('voiceschanged', voicesChangedCallback);
            resolve([]);
          }
        }, 1000);
      }
    });
  }
  
  // 應用初始化時檢查RAG服務器可用性
  async function checkServerStatus() {
    try {
      updateTechReadout('STATUS: CHECKING', 'VERIFYING RAG SERVER');
      // 更新視覺樣式為未確認狀態
      techStatus.style.backgroundColor = '#ffaa40';
      
      try {
        // 嘗試GET請求，測試服務器響應
        const statusResponse = await fetch('https://120.108.111.136:5000/status', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          // 添加超時設置
          signal: AbortSignal.timeout(5000)
        });
        
        if (statusResponse.ok) {
          try {
            const data = await statusResponse.json();
            console.log('服務器狀態數據:', data);
            
            // 顯示模型信息（如果有）
            let modelName = '';
            if (data.model) {
              modelName = data.model;
            } else if (data.model_name) {
              modelName = data.model_name;
            }
            
            updateTechReadout('STATUS: CONNECTED', `RAG SERVER ONLINE ${modelName ? '(' + modelName + ')' : ''}`);
            techStatus.style.backgroundColor = '#40ff80'; // 成功狀態
            console.log('RAG服務器連接成功');
            
            // 保存RAG系統啟動時間
            if (data.start_time) {
              ragConnectionTime = new Date(data.start_time);
              console.log("RAG啟動時間:", ragConnectionTime);
            } else {
              ragConnectionTime = new Date();
            }
            
            // 儲存RAG連接時間到localStorage以便下次使用
            try {
              localStorage.setItem('ragConnectionTime', ragConnectionTime.toISOString());
              console.log("RAG連接時間已儲存到localStorage");
            } catch (e) {
              console.error("無法儲存RAG連接時間:", e);
            }
            
            // 顯示RAG系統連接時間
            const timeString = ragConnectionTime.toLocaleDateString() + ' ' + ragConnectionTime.toLocaleTimeString();
            updateTechReadout(`RAG系統連接時間: ${timeString}`, 'STATUS: ONLINE', 'success');
            
            // 設置使用的端點
            window._useQaEndpoint = data.endpoints && data.endpoints.includes('/qa');
            
            return true;
          } catch (jsonError) {
            console.warn('無法解析狀態響應，但伺服器可用:', jsonError);
            updateTechReadout('STATUS: CONNECTED', 'RAG SERVER ONLINE');
            techStatus.style.backgroundColor = '#40ff80'; // 成功狀態
            return true;
          }
        } else {
          console.error('status端點響應錯誤:', statusResponse.status);
          throw new Error(`服務器狀態檢查失敗: ${statusResponse.status}`);
        }
      } catch (statusError) {
        console.warn('Status端點檢查失敗，嘗試檢查Ask端點:', statusError);
        
        // 嘗試檢查ask端點是否可用（作為備選方案）
        try {
          const askTest = await fetch('https://120.108.111.136:5000/ask', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ question: "測試連接" }),
            // 添加超時設置
            signal: AbortSignal.timeout(5000)
          });
          
          if (askTest.ok) {
            updateTechReadout('STATUS: CONNECTED', 'RAG SERVER ONLINE (PARTIAL)');
            techStatus.style.backgroundColor = '#40ff80'; // 成功狀態
            console.log('RAG服務器連接成功（通過ask端點）');
            return true;
          } else {
            throw new Error(`服務器響應異常: ${askTest.status}`);
          }
        } catch (askError) {
          console.error('Ask端點測試失敗:', askError);
          
          // 最後嘗試檢查qa端點
          try {
            const qaTest = await fetch('https://120.108.111.136:5000/qa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                'question': '測試連接'
              }),
              // 添加超時設置
              signal: AbortSignal.timeout(5000)
            });
            
            if (qaTest.ok) {
              updateTechReadout('STATUS: CONNECTED', 'RAG SERVER ONLINE (QA API)');
              techStatus.style.backgroundColor = '#40ff80'; // 成功狀態
              console.log('RAG服務器連接成功（通過qa端點）');
              
              // 這裡我們檢測到qa端點可用，但ask端點不可用，因此需要修改getAIResponse函數使用qa端點
              window._useQaEndpoint = true;
              console.warn('將使用/qa端點替代/ask端點');
              return true;
            } else {
              throw new Error(`所有端點測試失敗`);
            }
          } catch (qaError) {
            console.error('Qa端點測試失敗:', qaError);
            throw qaError;
          }
        }
      }
    } catch (error) {
      console.error('RAG服務器連接失敗:', error);
      
      updateTechReadout('STATUS: DISCONNECTED', 'RAG SERVER UNAVAILABLE');
      
      // 更新視覺樣式為未連接狀態
      techStatus.style.backgroundColor = '#ff4040'; // 錯誤狀態
      showErrorMessage('無法連接到RAG服務器，請確認服務器已啟動');
      return false;
    }
  }
  
  // 初始化應用
  async function init() {
    // 技術讀數更新
    updateTechReadout('STATUS: INITIALIZING', 'BOOTING QUANTUM SYSTEMS');
    techStatus.style.backgroundColor = '#ffaa40'; // 初始化中狀態
    console.log('初始化語音助手應用');
    
    // 隱藏載入動畫的計時器
    setTimeout(() => {
      const loadingOverlay = document.querySelector('.loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
          if (loadingOverlay.parentNode) {
            loadingOverlay.style.display = 'none';
          }
        }, 1000);
      }
    }, 2000);
    
    // 初始化語音合成
    if (synthSupported) {
      initSpeechSynthesis();
    } else {
      console.warn('瀏覽器不支援語音合成');
      techStatus.style.backgroundColor = '#ffaa40'; // 警告狀態
    }
    
    // 初始化語音識別
    if (speechToTextSupported) {
      initSpeechRecognition();
    } else {
      console.warn('瀏覽器不支援語音識別');
      techStatus.style.backgroundColor = '#ff4040'; // 錯誤狀態
    }
    
    // 添加視差效果
    initParallaxEffect();
    
    // 添加按鈕點擊事件
    voiceButton.addEventListener('click', handleVoiceButtonClick);
    
    // 添加鍵盤快捷鍵
    document.addEventListener('keydown', (event) => {
      // 空格鍵啟動/停止語音識別
      if (event.code === 'Space' && event.target === document.body) {
        event.preventDefault();
        handleVoiceButtonClick();
      }
      
      // ESC 鍵停止所有活動
      if (event.code === 'Escape') {
        if (isRecording) {
          try { recognition.stop(); } catch (e) {}
        }
        if (isSpeaking) {
          synthesis.cancel();
          isSpeaking = false;
          document.body.classList.remove('speaking');
        }
        updateTechReadout('STATUS: CANCELED', 'ALL OPERATIONS TERMINATED');
        techStatus.style.backgroundColor = '#ffaa40'; // 警告狀態
      }
    });
    
    // 檢查RAG服務器狀態
    const serverStatus = await checkServerStatus();
    
    // 添加初始動畫和設置狀態
    setTimeout(() => {
      if (serverStatus) {
        updateTechReadout('STATUS: ONLINE', 'RAG SYSTEM CONNECTED');
        techStatus.style.backgroundColor = '#40ff80'; // 成功連接
      } else {
        updateTechReadout('STATUS: WARNING', 'RAG SYSTEM OFFLINE');
        techStatus.style.backgroundColor = '#ffaa40'; // 警告
      }
      showBootSequence();
      console.log('語音助手已就緒');
    }, 2500);
  }
  
  // 啟動視差效果
  function initParallaxEffect() {
    const container = document.querySelector('.voice-container');
    const orb = document.querySelector('.voice-orb');
    const orbInner = document.querySelector('.orb-inner');
    const techCircle = document.querySelector('.tech-circle');
    const techCircleOuter = document.querySelector('.tech-circle-outer');
    
    document.addEventListener('mousemove', function(e) {
      if (!container) return;
      
      // 計算滑鼠位置相對於視窗中心的偏移量
      const xAxis = (window.innerWidth / 2 - e.pageX) / 35;
      const yAxis = (window.innerHeight / 2 - e.pageY) / 35;
      
      // 設置不同元素的視差效果 (數值越大，移動越多)
      if (orb) orb.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg) translateZ(10px)`;
      if (orbInner) orbInner.style.transform = `translateX(${xAxis * 0.5}px) translateY(${yAxis * 0.5}px)`;
      if (techCircle) techCircle.style.transform = `translate(-50%, -50%) translateX(${xAxis * 2}px) translateY(${yAxis * 2}px)`;
      if (techCircleOuter) techCircleOuter.style.transform = `translate(-50%, -50%) translateX(${xAxis * 3}px) translateY(${yAxis * 3}px)`;
    });
  }
  
  // 顯示啟動序列
  function showBootSequence() {
    const elements = [
      '.voice-orb',
      '.tech-circle',
      '.tech-circle-outer',
      '.tech-lines',
      '.voice-button',
      '.tech-readout'
    ];
    
    // 依次顯示各元素
    elements.forEach((selector, index) => {
      setTimeout(() => {
        const element = document.querySelector(selector);
        if (element) element.style.opacity = '1';
      }, 300 * index);
    });
    
   
  }
  
  // 啟動應用
  init();
});


// 等到第一次觸控，就用一個靜音的 Utterance 來解鎖 autoplay 權限
function unlockSpeech() {
  const silent = new SpeechSynthesisUtterance('');
  silent.volume = 0;              // 完全靜音
  window.speechSynthesis.speak(silent);
  window.removeEventListener('touchend', unlockSpeech);
}

// iOS Safari 會在 touchend 後給予「使用者啟動」
// 之後的 speak() 都能自動播放
window.addEventListener('touchend', unlockSpeech, { once: true });



let synthVoices = [];

function loadVoices() {
  synthVoices = window.speechSynthesis.getVoices();
}

window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();  // 以防事件先觸發完畢






function speakText(text) {
  if (!synthVoices.length) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-TW';
  // 優先取繁中女聲
  utterance.voice = synthVoices.find(v=>v.lang.includes('zh-TW') && v.name.toLowerCase().includes('female'))
                   || synthVoices.find(v=>v.lang.includes('zh-TW'));
  window.speechSynthesis.speak(utterance);
}













// 檢查頁面元素並添加必要的 HTML 結構
(function setupChatInterface() {
  // 如果頁面中沒有所需的聊天界面元素，則創建它們
  const chatContainerExists = document.querySelector('.chat-container');
  
  if (!chatContainerExists) {
    const chatContainer = document.createElement('div');
    chatContainer.className = 'chat-container';
    
 
    
    const chatInputContainer = document.createElement('div');
    chatInputContainer.className = 'chat-input-container';
    
    const chatInput = document.createElement('input');
    chatInput.type = 'text';
    chatInput.className = 'chat-input';
    chatInput.placeholder = '輸入訊息或按下麥克風按鈕說話...';
    
    const micButton = document.createElement('button');
    micButton.className = 'mic-button';
    micButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="currentColor"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="currentColor"/></svg>';
    
    const sendButton = document.createElement('button');
    sendButton.className = 'send-button';
    sendButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg>';
    
    chatInputContainer.appendChild(chatInput);
    chatInputContainer.appendChild(micButton);
    chatInputContainer.appendChild(sendButton);
    
    chatContainer.appendChild(chatMessages);
    chatContainer.appendChild(chatInputContainer);
    
    // 將聊天界面插入到 body 中
    document.body.appendChild(chatContainer);
  }

  
})();
