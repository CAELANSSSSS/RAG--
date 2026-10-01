const LETTER_POOL = getEl('letter-pool'), // 定義常量 LETTER_POOL，對應 ID 為 'letter-pool' 的元素
  TEMP_LETTER_POOL = getEl('temp-letter-pool'), // 定義常量 TEMP_LETTER_POOL，對應 ID 為 'temp-letter-pool' 的元素
  LETTER_OVERLAY = getEl('letter-overlay'), // 定義常量 LETTER_OVERLAY，對應 ID 為 'letter-overlay' 的元素
  CHAT_MESSAGE_COLUMN_WRAPPER = getEl('chat-message-column-wrapper'), // 定義常量 CHAT_MESSAGE_COLUMN_WRAPPER，對應 ID 為 'chat-message-column-wrapper' 的元素
  CHAT_MESSAGE_COLUMN = getEl('chat-message-column'), // 定義常量 CHAT_MESSAGE_COLUMN，對應 ID 為 'chat-message-column' 的元素
  MESSAGE_INPUT = getEl('message-input'), // 定義常量 MESSAGE_INPUT，對應 ID 為 'message-input' 的元素
  MESSAGE_INPUT_FIELD = getEl('message-input-field'), // 定義常量 MESSAGE_INPUT_FIELD，對應 ID 為 'message-input-field' 的元素
  CHAT_BOT_MOOD = getEl('chat-bot-mood'), // 定義常量 CHAT_BOT_MOOD，對應 ID 為 'chat-bot-mood' 的元素
  CHAT_BOT_MOOD_VALUE = getEl('chat-bot-mood-value'); // 定義常量 CHAT_BOT_MOOD_VALUE，對應 ID 為 'chat-bot-mood-value' 的元素

const STATE = {
  isUserSendingMessage: false, // 定義狀態 isUserSendingMessage，初始值為 false
  isChatBotSendingMessage: false, // 定義狀態 isChatBotSendingMessage，初始值為 false
  letterPool: {
    transitionPeriod: 30000, // 定義字母池的過渡期為 30000 毫秒
    intervals: [] // 定義間隔數組，初始為空
  },
  moods: ['friendly', 'suspicious', 'boastful'], // 定義心情列表
  currentMood: '', // 定義當前心情，初始為空
  chatbotMessageIndex: 0, // 定義聊天機器人消息索引，初始值為 0
  nLetterSets: 4 // 定義字母集合數量，初始值為 4
};

const getRandMood = () => {
  const rand = getRand(1, 1); // (原始邏輯，此處未做更改)
  return STATE.moods[rand - 1];
};

const setChatbotMood = () => {
  STATE.currentMood = getRandMood();
  for (let i = 0; i < STATE.moods.length; i++) {
    removeClass(CHAT_BOT_MOOD, STATE.moods[i]);
  }
  addClass(CHAT_BOT_MOOD, STATE.currentMood);
  CHAT_BOT_MOOD_VALUE.innerHTML = STATE.currentMood;
};

const createLetter = (cName, val) => {
  const letter = document.createElement('div');
  addClass(letter, cName);
  setAttr(letter, 'data-letter', val);
  letter.innerHTML = val;
  return letter;
};

const getAlphabet = isUpperCase => {
  let letters = [];
  for (let i = 65; i <= 90; i++) {
    let val = String.fromCharCode(i),
      letter = null;
    if (!isUpperCase) val = val.toLowerCase();
    letter = createLetter('pool-letter', val);
    letters.push(letter);
  }
  return letters;
};

const startNewLetterPath = (letter, nextRand, interval) => {
  clearInterval(interval);
  nextRand = getRandExcept(1, 4, nextRand);
  let nextPos = getRandPosOffScreen(nextRand),
    transitionPeriod = STATE.letterPool.transitionPeriod,
    delay = getRand(0, STATE.letterPool.transitionPeriod),
    transition = `left ${transitionPeriod}ms linear ${delay}ms, top ${transitionPeriod}ms linear ${delay}ms, opacity 0.5s`;
  setElPos(letter, nextPos.x, nextPos.y);
  setStyle(letter, 'transition', transition);
  interval = setInterval(() => {
    startNewLetterPath(letter, nextRand, interval);
  }, STATE.letterPool.transitionPeriod + delay);
  STATE.letterPool.intervals.push(interval);
};

const setRandLetterPaths = letters => {
  for (let i = 0; i < letters.length; i++) {
    let letter = letters[i],
      startRand = getRand(1, 4),
      nextRand = getRandExcept(1, 4, startRand),
      startPos = getRandPosOffScreen(startRand),
      nextPos = getRandPosOffScreen(nextRand),
      transitionPeriod = STATE.letterPool.transitionPeriod,
      delay = getRand(0, STATE.letterPool.transitionPeriod) * -1,
      transition = `left ${transitionPeriod}ms linear ${delay}ms, top ${transitionPeriod}ms linear ${delay}ms, opacity 0.5s`;
    setElPos(letter, startPos.x, startPos.y);
    setStyle(letter, 'transition', transition);
    addClass(letter, 'invisible');
    LETTER_POOL.appendChild(letter);
    setTimeout(() => {
      setElPos(letter, nextPos.x, nextPos.y);
      removeClass(letter, 'invisible');
      let interval = setInterval(() => {
        startNewLetterPath(letter, nextRand, interval);
      }, STATE.letterPool.transitionPeriod + delay);
    }, 1);
  }
};

const fillLetterPool = (nSets = 1) => {
  for (let i = 0; i < nSets; i++) {
    const lCaseLetters = getAlphabet(false),
      uCaseLetters = getAlphabet(true);
    setRandLetterPaths(lCaseLetters);
    setRandLetterPaths(uCaseLetters);
  }
};

const findMissingLetters = (letters, lCount, isUpperCase) => {
  let missingLetters = [];
  for (let i = 65; i <= 90; i++) {
    let val = isUpperCase ? String.fromCharCode(i) : String.fromCharCode(i).toLowerCase(),
      nLetter = letters.filter(letter => letter === val).length;
    if (nLetter < lCount) {
      let j = nLetter;
      while (j < lCount) {
        missingLetters.push(val);
        j++;
      }
    }
  }
  return missingLetters;
};

const replenishLetterPool = (nSets = 1) => {
  const poolLetters = LETTER_POOL.childNodes;
  let currentLetters = [],
      missingLetters = [],
      lettersToAdd = [];
  for (let i = 0; i < poolLetters.length; i++) {
    currentLetters.push(poolLetters[i].dataset.letter);
  }
  missingLetters = [...missingLetters, ...findMissingLetters(currentLetters, nSets, false)];
  missingLetters = [...missingLetters, ...findMissingLetters(currentLetters, nSets, true)];
  for (let i = 0; i < missingLetters.length; i++) {
    const val = missingLetters[i];
    lettersToAdd.push(createLetter('pool-letter', val));
  }
  setRandLetterPaths(lettersToAdd);
};

const clearLetterPool = () => {
  removeAllChildren(LETTER_POOL);
};

const scrollToBottomOfMessages = () => {
  CHAT_MESSAGE_COLUMN_WRAPPER.scrollTop = CHAT_MESSAGE_COLUMN_WRAPPER.scrollHeight;
};

const checkMessageColumnHeight = () => {
  if (CHAT_MESSAGE_COLUMN.clientHeight >= window.innerHeight) {
    removeClass(CHAT_MESSAGE_COLUMN, 'static');
  } else {
    addClass(CHAT_MESSAGE_COLUMN, 'static');
  }
};

const appendContentText = (contentText, text) => {
  for (let i = 0; i < text.length; i++) {
    const letter = document.createElement('span');
    letter.innerHTML = text[i];
    setAttr(letter, 'data-letter', text[i]);
    contentText.appendChild(letter);
  }
};

const createChatMessage = (text, isReceived) => {
  let message = document.createElement('div'),
      profileIcon = document.createElement('div'),
      icon = document.createElement('i'),
      content = document.createElement('div'),
      contentText = document.createElement('h1'),
      direction = isReceived ? 'received' : 'sent';
  addClass(content, 'content');
  addClass(content, 'invisible');
  addClass(contentText, 'text');
  addClass(contentText, 'invisible');
  appendContentText(contentText, text);
  content.appendChild(contentText);
  addClass(profileIcon, 'profile-icon');
  addClass(profileIcon, 'invisible');
  profileIcon.appendChild(icon);
  addClass(message, 'message');
  addClass(message, direction);
  if (isReceived) {
    addClass(icon, 'fab');
    addClass(message, STATE.currentMood);
    message.appendChild(profileIcon);
    message.appendChild(content);
  } else {
    addClass(icon, 'far');
    addClass(icon, 'fa-user');
    message.appendChild(content);
    message.appendChild(profileIcon);
  }
  message.dataset.timestamp = Date.now();
  return message;
};

const findLetterInPool = targetLetter => {
  let letters = LETTER_POOL.childNodes,
      foundLetter = null;
  for (let i = 0; i < letters.length; i++) {
    const nextLetter = letters[i];
    if (nextLetter.dataset.letter === targetLetter && !nextLetter.dataset.found) {
      foundLetter = letters[i];
      setAttr(foundLetter, 'data-found', true);
      break;
    }
  }
  return foundLetter;
};

const createOverlayLetter = val => {
  const overlayLetter = document.createElement('span');
  addClass(overlayLetter, 'overlay-letter');
  addClass(overlayLetter, 'in-flight');
  overlayLetter.innerHTML = val;
  return overlayLetter;
};

const removePoolLetter = letter => {
  addClass(letter, 'invisible');
  setTimeout(() => {
    removeChild(LETTER_POOL, letter);
  }, 500);
};

const setElPosFromRight = (el, x, y) => {
  setStyle(el, 'right', x + 'px');
  setStyle(el, 'top', y + 'px');
};

const animateOverlayLetter = (letter, contentText, finalPos, isReceived) => {
  removePoolLetter(letter);
  const initPos = letter.getBoundingClientRect(),
        overlayLetter = createOverlayLetter(letter.dataset.letter);
  if (isReceived) {
    setElPos(overlayLetter, initPos.left, initPos.top);
  } else {
    setElPosFromRight(overlayLetter, window.innerWidth - initPos.right, initPos.top);
  }
  LETTER_OVERLAY.appendChild(overlayLetter);
  setTimeout(() => {
    if (isReceived) {
      setElPos(overlayLetter, finalPos.left, finalPos.top);
    } else {
      setElPosFromRight(overlayLetter, window.innerWidth - finalPos.right, finalPos.top);
    }
    setTimeout(() => {
      removeClass(contentText, 'invisible');
      addClass(overlayLetter, 'invisible');
      setTimeout(() => {
        removeChild(LETTER_OVERLAY, overlayLetter);
      }, 1000);
    }, 1500);
  }, 100);
};

const animateMessageLetters = (message, isReceived) => {
  const content = message.getElementsByClassName('content')[0],
        contentText = content.getElementsByClassName('text')[0],
        letters = contentText.childNodes,
        textPos = contentText.getBoundingClientRect();
  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i],
          targetLetter = findLetterInPool(letter.dataset.letter),
          finalPos = letter.getBoundingClientRect();
    if (targetLetter) {
      animateOverlayLetter(targetLetter, contentText, finalPos, isReceived);
    } else {
      const tempLetter = createLetter('temp-letter', letter.dataset.letter),
            pos = getRandPosOffScreen();
      addClass(tempLetter, 'invisible');
      setElPos(tempLetter, pos.x, pos.y);
      TEMP_LETTER_POOL.appendChild(tempLetter);
      animateOverlayLetter(tempLetter, contentText, finalPos, isReceived);
      setTimeout(() => {
        removeChild(TEMP_LETTER_POOL, tempLetter);
      }, 100);
    }
  }
};

const addChatMessage = (text, isReceived) => {
  const message = createChatMessage(text, isReceived),
        content = message.getElementsByClassName('content')[0],
        profileIcon = message.getElementsByClassName('profile-icon')[0];
  CHAT_MESSAGE_COLUMN.appendChild(message);
  
  if (isReceived) {
    const voicePlayButton = document.createElement('button');
    voicePlayButton.className = 'voice-play-button';
    voicePlayButton.setAttribute('aria-label', '大聲朗讀');
    const voicePlayIcon = document.createElement('span');
    voicePlayIcon.className = 'voice-play-icon';
    voicePlayIcon.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-md-heavy">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M11 4.91C11 4.47 10.48 4.25 10.16 4.54L6.68 7.74C6.49 7.91 6.25 8 6 8H4C3.45 8 3 8.45 3 9V15C3 15.55 3.45 16 4 16H6C6.25 16 6.49 16.09 6.68 16.26L10.16 19.46C10.48 19.75 11 19.53 11 19.09V4.91ZM8.81 3.07C10.41 1.6 13 2.73 13 4.91V19.09C13 21.27 10.41 22.4 8.81 20.93L5.61 18H4C2.34 18 1 16.66 1 15V9C1 7.34 2.34 6 4 6H5.61L8.81 3.07ZM20.32 6.36C20.8 6.09 21.41 6.27 21.67 6.76C22.52 8.32 23 10.1 23 12C23 13.85 22.54 15.6 21.73 17.13C21.47 17.62 20.87 17.81 20.38 17.55C19.89 17.29 19.71 16.68 19.96 16.2C20.62 14.94 21 13.52 21 12C21 10.45 20.61 8.99 19.91 7.71C19.65 7.23 19.83 6.62 20.32 6.36ZM15.8 7.9C16.24 7.57 16.87 7.66 17.2 8.1C18.02 9.19 18.5 10.54 18.5 12C18.5 13.31 18.11 14.54 17.44 15.56C17.14 16.02 16.52 16.15 16.05 15.85C15.59 15.55 15.46 14.93 15.77 14.46C16.23 13.76 16.5 12.91 16.5 12C16.5 10.99 16.17 10.05 15.6 9.3C15.27 8.86 15.36 8.23 15.8 7.9Z" fill="currentColor"/>
    </svg>`;
    voicePlayButton.appendChild(voicePlayIcon);
    message.appendChild(voicePlayButton);
    let isPlaying = false;
    const speech = new SpeechSynthesisUtterance(text);
    voicePlayButton.addEventListener('click', () => {
      if (isPlaying) {
        window.speechSynthesis.cancel();
        isPlaying = false;
      } else {
        window.speechSynthesis.speak(speech);
        isPlaying = true;
        speech.onend = () => {
          isPlaying = false;
        };
      }
    });
    setTimeout(() => {
      voicePlayButton.style.display = 'block';
    }, 2000);
  }
  toggleInput();
  setTimeout(() => {
    removeClass(profileIcon, 'invisible');
    setTimeout(() => {
      removeClass(content, 'invisible');
      setTimeout(() => animateMessageLetters(message, isReceived), 1000);
    }, 250);
  }, 250);
};

const checkIfInputFieldHasVal = () => MESSAGE_INPUT_FIELD.value.length > 0;

const clearInputField = () => {
  MESSAGE_INPUT_FIELD.value = '';
};

const disableInputField = () => {
  MESSAGE_INPUT_FIELD.blur();
  MESSAGE_INPUT_FIELD.value = '';
  MESSAGE_INPUT_FIELD.readOnly = true;
};

const enableInputField = () => {
  MESSAGE_INPUT_FIELD.readOnly = false;
  MESSAGE_INPUT_FIELD.focus();
};

const saveChatLog = (sender, message) => {
  fetch('save_chat.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      sender: sender,
      message: message,
    }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        console.log('Chat saved successfully');
      } else {
        console.error('Error saving chat:', data.message);
      }
    })
    .catch(error => {
      // console.error('Error:', error);
    });
};

const onEnterPress = e => {
  if (checkIfInputFieldHasVal() && e.key === 'Enter') {
    if (canSendMessage()) {
      sendUserMessage();
      clearInputField();
    }
  }
};

const initLetterPool = () => {
  clearLetterPool();
  fillLetterPool(STATE.nLetterSets);
};

const addInitialChatbotMessage = () => {
  const initialMessage = "Hello~資傳小幫手很高興為您解答問題。";
  addChatMessage(initialMessage, true);
};

const init = () => {
  setChatbotMood();
  initLetterPool();
  addInitialChatbotMessage();
  toggleInput();
};

let resetTimeout = null;

const resetLetterPool = () => {
  const intervals = STATE.letterPool.intervals;
  for (let i = 0; i < intervals.length; i++) {
    clearInterval(intervals[i]);
  }
  clearTimeout(resetTimeout);
  clearLetterPool();
  resetTimeout = setTimeout(() => {
    initLetterPool();
  }, 100);
};

const toggleInput = () => {
  if (checkIfInputFieldHasVal() && canSendMessage()) {
    addClass(MESSAGE_INPUT, 'send-enabled');
  } else {
    removeClass(MESSAGE_INPUT, 'send-enabled');
  }
};

const isValidLetter = e => {
  return !e.ctrlKey &&
    e.key !== 'Enter' &&
    e.keyCode !== 8 &&
    e.keyCode !== 9 &&
    e.keyCode !== 13;
};

const canSendMessage = () => !STATE.isUserSendingMessage && !STATE.isChatBotSendingMessage;

// 綁定鍵盤事件：當按下 Enter 時發送消息
MESSAGE_INPUT_FIELD.onkeypress = e => {
  if (e.key === "Enter" && checkIfInputFieldHasVal()) {
    sendUserMessage();
    clearInputField();
  }
};

MESSAGE_INPUT_FIELD.onkeyup = () => {
  toggleInput();
};

MESSAGE_INPUT_FIELD.oncut = () => toggleInput();

window.onload = () => init();
window.onfocus = () => resetLetterPool();
window.onresize = _.throttle(resetLetterPool, 200);

// ---------------------------
// 以下為 WebSocket 連線整合

// 修改發送用戶消息的函數，改用 HTTP POST 請求
const sendUserMessage = async () => {
  const userMessage = MESSAGE_INPUT_FIELD.value.trim();
  if (userMessage === "") return;
  
  // 禁用輸入框，防止重複發送
  STATE.isUserSendingMessage = true;
  MESSAGE_INPUT_FIELD.disabled = true;
  
  // 顯示用戶的消息
  addChatMessage(userMessage, false);
  
  try {
    // 發送 POST 請求到 Flask 後端
    const response = await fetch('https://120.108.111.136:5000/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: userMessage
      })
    });

    const data = await response.json();
    
    if (data.status === "error") {
      console.error('Error:', data.message);
      addChatMessage("抱歉，我遇到了一些問題。請稍後再試。", true);
    } else {
      // 顯示機器人的回應
      addChatMessage(data.answer, true);
    }
  } catch (error) {
    console.error('Error:', error);
    addChatMessage("抱歉，連接服務器時出現問題。請檢查網絡連接。", true);
  } finally {
    // 重新啟用輸入框
    STATE.isUserSendingMessage = false;
    MESSAGE_INPUT_FIELD.disabled = false;
    MESSAGE_INPUT_FIELD.focus();
  }
};

// 修改按鈕點擊事件
document.getElementById("send-message-button").onclick = () => {
  if (checkIfInputFieldHasVal()) {
    sendUserMessage();
    clearInputField();
  }
};
