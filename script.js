//20250831 22:05
document.addEventListener('DOMContentLoaded', () => {
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw13ZKohUZlQU-jjrg8C-bN4au4Jd2KwjSa9jmHIVppYjOE-Avxew1Bz_gWWlUGus68/exec';
    const chatBox = document.getElementById('chat-box');
    const usernameInput = document.getElementById('username');
    const messageInput = document.getElementById('message');
    const sendButton = document.getElementById('send-button');
    const groupList = document.getElementById('group-list');
    const createGroupBtn = document.getElementById('create-group-btn');
    const currentGroupTitle = document.getElementById('current-group-title');

    let currentGroup = null;
    let lastDate = null;
    let fetchInterval = null;

    /** 將字串中的HTML特殊字元轉換為實體，避免XSS攻擊 */
    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    /** 格式化日期和時間 */
    function formatMessageTime(timestamp) {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    /** 格式化日期標頭 */
    function formatDateHeader(timestamp) {
        const date = new Date(timestamp);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('zh-TW', options);
    }

    /** 獲取並顯示群組列表 */
    function fetchGroups() {
        $.ajax({
            url: APPS_SCRIPT_URL,
            type: 'GET',
            data: { action: 'getGroups' },
            dataType: 'jsonp',
            success: function(response) {
                groupList.innerHTML = '';
                
                let pinnedGroup = null;
                const filteredGroups = response.groups.filter(group => {
                    if (group.GroupID === '0') {
                        pinnedGroup = group;
                        return false;
                    }
                    return true;
                });
                
                if (pinnedGroup) {
                    currentGroup = pinnedGroup;
                    currentGroupTitle.textContent = pinnedGroup.GroupName;
                    messageInput.disabled = true;
                    messageInput.placeholder = "此為置頂公告區，無法發送訊息";
                    sendButton.disabled = true;
                    selectGroup(pinnedGroup);
                }

                filteredGroups.forEach(group => {
                    const groupItem = document.createElement('li');
                    groupItem.textContent = group.GroupName;
                    groupItem.dataset.groupId = group.GroupID;
                    groupItem.addEventListener('click', () => selectGroup(group));
                    groupList.appendChild(groupItem);
                });
                
                if (!currentGroup && filteredGroups.length > 0) {
                    selectGroup(filteredGroups[0]);
                } else if (currentGroup && filteredGroups.length > 0) {
                    const activeGroupElement = document.querySelector(`[data-group-id="${currentGroup.GroupID}"]`);
                    if (activeGroupElement) {
                        activeGroupElement.classList.add('active');
                    }
                } else if (!currentGroup) {
                    const noGroupsMessage = document.createElement('li');
                    noGroupsMessage.textContent = '沒有其他群組，請新增群組。';
                    noGroupsMessage.style.textAlign = 'center';
                    noGroupsMessage.style.padding = '15px';
                    groupList.appendChild(noGroupsMessage);
                }
            },
            error: function(xhr, status, error) {
                console.error('Error fetching groups:', error);
            }
        });
    }

    /** 選擇群組並載入訊息 */
    function selectGroup(group) {
        if (currentGroup && currentGroup.GroupID === group.GroupID) {
            return;
        }

        currentGroup = group;
        currentGroupTitle.textContent = group.GroupName;
        lastDate = null;
        messageInput.disabled = false;
        messageInput.placeholder = "輸入訊息...";
        sendButton.disabled = false;
        
        chatBox.innerHTML = '';
        
        document.querySelectorAll('#group-list li').forEach(item => item.classList.remove('active'));
        const activeGroupElement = document.querySelector(`[data-group-id="${group.GroupID}"]`);
        if (activeGroupElement) {
            activeGroupElement.classList.add('active');
        }

        if (fetchInterval) {
            clearInterval(fetchInterval);
        }

        fetchMessages(true);
        fetchInterval = setInterval(() => fetchMessages(false), 3000);
    }

    /** 讀取訊息 */
    function fetchMessages(isInitialLoad) {
        if (!currentGroup) return;

        const isScrolledToBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 1;
        
        $.ajax({
            url: APPS_SCRIPT_URL,
            type: 'GET',
            data: { 
                groupID: currentGroup.GroupID,
            },
            dataType: 'jsonp',
            success: function(response) {
                if (!response.messages || response.messages.length === 0) {
                    return;
                }

                chatBox.innerHTML = '';
                lastDate = null;
                
                response.messages.forEach(msg => {
                    if (!msg.message && !msg.temp_message) return;
                    
                    const messageDate = new Date(msg.Timestamp);
                    const currentDateString = messageDate.toDateString();

                    if (lastDate && currentDateString !== lastDate) {
                        const dateHeader = document.createElement('div');
                        dateHeader.classList.add('date-header');
                        dateHeader.textContent = formatDateHeader(messageDate);
                        chatBox.appendChild(dateHeader);
                    }
                    lastDate = currentDateString;

                    const messageElement = document.createElement('div');
                    messageElement.classList.add('message');
                    
                    const messageContent = msg.message;
                    
                    // 檢查訊息是否為程式碼格式
                    const codeMatch = messageContent.match(/^`{3}([\s\S]*)`{3}$/);
                    if (codeMatch) {
                        const codeContent = escapeHtml(codeMatch[1].trim());
                        messageElement.innerHTML = `
                            <strong>${escapeHtml(msg.user)}:</strong>
                            <pre><code style="white-space: pre-wrap;">${codeContent}</code></pre>
                            <span class="message-time">${formatMessageTime(msg.Timestamp)}</span>
                        `;
                    } else {
                        messageElement.innerHTML = `
                            <strong>${escapeHtml(msg.user)}:</strong> ${escapeHtml(messageContent)}
                            <span class="message-time">${formatMessageTime(msg.Timestamp)}</span>
                        `;
                    }

                    chatBox.appendChild(messageElement);
                });

                if (isInitialLoad || isScrolledToBottom) {
                    chatBox.scrollTop = chatBox.scrollHeight;
                }
            },
            error: function(xhr, status, error) {
                console.error('Error fetching messages:', error);
            }
        });
    }

    /** 發送訊息函式（使用 GET 請求並切割訊息） */
    async function sendMessage() {
        if (sendButton.disabled) return;
        if (!currentGroup) {
            alert('請先選擇一個群組！');
            return;
        }
        const user = usernameInput.value.trim();
        const message = messageInput.value.trim();

        if (!user || !message) {
            alert('請輸入你的名字和訊息！');
            return;
        }

        const chunkSize = 1000;
        const messageChunks = [];
        for (let i = 0; i < message.length; i += chunkSize) {
            messageChunks.push(message.substring(i, i + chunkSize));
        }
        const totalChunks = messageChunks.length;

        let tempRowId = null;

        for (let i = 0; i < totalChunks; i++) {
            const chunk = messageChunks[i];
            try {
                const response = await $.ajax({
                    url: APPS_SCRIPT_URL,
                    type: 'GET',
                    data: {
                        action: 'send',
                        groupID: currentGroup.GroupID,
                        user: user,
                        messageChunk: chunk,
                        chunkId: i,
                        totalChunks: totalChunks,
                        tempRowId: tempRowId
                    },
                    dataType: 'jsonp'
                });

                if (response.status !== 'success') {
                    throw new Error(response.message || '傳送失敗！');
                }

                if (response.tempRowId) {
                    tempRowId = response.tempRowId;
                }

                if (response.refresh) {
                    messageInput.value = '';
                    fetchMessages(true);
                }

            } catch (error) {
                console.error('Error sending message chunk:', error);
                alert(`訊息傳送失敗！錯誤：${error.message}`);
                return;
            }
        }
    }

    /** 建立新群組 */
    function createGroup() {
        const groupName = prompt('請輸入新群組名稱：');
        if (groupName) {
            $.ajax({
                url: APPS_SCRIPT_URL,
                type: 'GET',
                data: { action: 'createGroup', groupName: groupName },
                dataType: 'jsonp',
                success: function(response) {
                    if (response.status === 'success') {
                        alert('新群組已建立！');
                        fetchGroups();
                    } else {
                        alert('群組建立失敗！');
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Error creating group:', error);
                }
            });
        }
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    createGroupBtn.addEventListener('click', createGroup);

    fetchGroups();
});