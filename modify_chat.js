const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/src/components/ChatInterface.tsx');
let code = fs.readFileSync(filePath, 'utf-8');

// 1. Add Mic imports
code = code.replace(/import { Send(.*?) } from 'lucide-react';/, "import { Send$1, Mic, X, Play, Square } from 'lucide-react';");

// 2. Add message interface update (linkPreview)
code = code.replace(/setMessages\(useState<\s*\{\s*id:\s*string,\s*text:\s*string,\s*sent:\s*boolean,\s*time:\s*string,\s*timestamp:\s*number\s*\}\s*\[\]\>\(\[\]\);/g, 
"setMessages(useState<{id: string, text: string, sent: boolean, time: string, timestamp: number, linkPreview?: any, attachment?: any}[]>([]));");

// 3. Add states
const statesInsert = `
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
`;
code = code.replace(/const \[activeCall, setActiveCall\] = useState<.*?\| null>\(null\);/, match => match + '\n' + statesInsert);

// 4. Update Message Payload to handle voice/audio and link previews
code = code.replace(/if \(messageObj.type === 'attachment'\) \{/, 
`if (messageObj.linkPreview) {
          attachment = { type: 'link', data: messageObj.linkPreview };
        } else if (messageObj.type === 'voice') {
          displayContent = '🎤 Voice message received (Decryption pending...)';
          attachment = { type: 'voice', s3Key: messageObj.s3Key, keyBase64: messageObj.keyBase64, ivBase64: messageObj.ivBase64, contentType: messageObj.contentType };
        } else if (messageObj.type === 'attachment') {`);

// 5. Update send function to support link previews
const handleSendCode = `
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeContact) return;
    
    const plaintext = input;
    setInput('');
    
    // Check for link preview
    let linkPreview = null;
    const urlRegex = /(https?:\\/\\/[^\\s]+)/g;
    const urls = plaintext.match(urlRegex);
    if (urls && urls.length > 0) {
      try {
        const token = localStorage.getItem('signal_token');
        const res = await fetch(\`http://localhost:4000/api/utils/link-preview?url=\${encodeURIComponent(urls[0])}\`, {
          headers: { 'Authorization': \`Bearer \${token}\` }
        });
        if (res.ok) {
          linkPreview = await res.json();
        }
      } catch (err) {
        console.error('Failed to fetch link preview', err);
      }
    }

    const payloadString = JSON.stringify({ type: 'text', content: plaintext, linkPreview });

    const newMsg = {
      id: Date.now().toString(),
      conversationId: activeContact,
      text: plaintext,
      attachment: linkPreview ? { type: 'link', data: linkPreview } : null,
      sent: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, newMsg]);
    await saveMessage(newMsg);

    const store = new SignalProtocolStore();
    const address = new SignalProtocolAddress(activeContact, 1);
    const cipher = new SessionCipher(store, address);

    try {
      const encoder = new TextEncoder();
      const ptBuffer = encoder.encode(payloadString).buffer;
      const ciphertextMessage = await cipher.encrypt(ptBuffer);
      socket.send(JSON.stringify({
        type: 'message:send',
        recipientId: activeContact,
        ciphertext: ciphertextMessage.body,
        ciphertextType: ciphertextMessage.type
      }));
    } catch (err) {
      console.error('Encryption failed', err);
    }
  };
`;
// We replace the original handleSend block:
code = code.replace(/const handleSend = async \(\w+: React.FormEvent\) => \{[\s\S]*?catch \(err\) \{\s*console\.error\('Encryption failed', err\);\s*\}\s*\};/, handleSendCode);


// 6. Voice upload logic (similar to handleFileUpload)
const voiceUploadCode = `
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUpload(audioBlob);
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    if (!activeContact) return;
    setUploading(true);
    try {
      const key = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const arrayBuffer = await audioBlob.arrayBuffer();
      const ciphertextBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, arrayBuffer);
      
      const token = localStorage.getItem('signal_token');
      const resUrl = await fetch(\`http://localhost:4000/api/attachments/upload-url?contentType=audio/webm\`, {
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      const { uploadUrl, s3Key } = await resUrl.json();
      await fetch(uploadUrl, { method: 'PUT', body: ciphertextBuffer, headers: { 'Content-Type': 'audio/webm' } });

      const exportedKey = await window.crypto.subtle.exportKey('raw', key);
      const keyBase64 = arrayBufferToBase64(exportedKey);
      const ivBase64 = arrayBufferToBase64(iv.buffer);

      const attachmentPayload = JSON.stringify({
        type: 'voice', s3Key, keyBase64, ivBase64, contentType: 'audio/webm'
      });

      const newMsg = {
        id: Date.now().toString(), conversationId: activeContact, text: '🎤 Voice message sent',
        attachment: { type: 'voice', s3Key, keyBase64, ivBase64, contentType: 'audio/webm' },
        sent: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), timestamp: Date.now()
      };
      setMessages(prev => [...prev, newMsg]);
      await saveMessage(newMsg);

      const store = new SignalProtocolStore();
      const cipher = new SessionCipher(store, new SignalProtocolAddress(activeContact, 1));
      const ciphertextMessage = await cipher.encrypt(new TextEncoder().encode(attachmentPayload).buffer);
      socket.send(JSON.stringify({ type: 'message:send', recipientId: activeContact, ciphertext: ciphertextMessage.body, ciphertextType: ciphertextMessage.type }));
    } catch (err) {
      console.error('Audio upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const displayedMessages = messages.filter(m => !chatSearchQuery || m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()));
`;
code = code.replace(/const handleLogout = async \(\) => \{/, voiceUploadCode + '\n  const handleLogout = async () => {');

// 7. Update UI to add Search button and search bar in header
code = code.replace(/<button className="p-2 hover:bg-\[var\(--color-messenger-light\)\] rounded-full transition-colors ml-1 text-\[var\(--color-messenger-blue\)\]">[\s]*<Info className="w-6 h-6" \/>[\s]*<\/button>/,
`<button onClick={() => setIsSearching(!isSearching)} className="p-2 hover:bg-[var(--color-messenger-light)] rounded-full transition-colors ml-1 text-[var(--color-messenger-blue)]">
                  <Search className="w-6 h-6" />
                </button>
                <button className="p-2 hover:bg-[var(--color-messenger-light)] rounded-full transition-colors ml-1 text-[var(--color-messenger-blue)]">
                  <Info className="w-6 h-6" />
                </button>`);

// Search bar below header
code = code.replace(/\{\/\* Messages Area \*\/\}/, 
`{isSearching && (
              <div className="absolute top-[72px] left-0 w-full bg-white border-b border-gray-200 p-2 z-10 flex gap-2 shadow-sm">
                <Search className="w-5 h-5 text-gray-400 mt-2 ml-2" />
                <input 
                  autoFocus
                  type="text" 
                  value={chatSearchQuery}
                  onChange={e => setChatSearchQuery(e.target.value)}
                  placeholder="Search in conversation..."
                  className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm outline-none"
                />
                <button onClick={() => { setIsSearching(false); setChatSearchQuery(''); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            )}
            {/* Messages Area */}`);

// Update messages map loop to use displayedMessages
code = code.replace(/\{messages\.map\(\(m, i\) => \{/g, '{displayedMessages.map((m, i) => {');
code = code.replace(/isFirstInGroup = i === 0 \|\| messages\[i-1\]\.sent !== m\.sent;/g, 'isFirstInGroup = i === 0 || displayedMessages[i-1].sent !== m.sent;');
code = code.replace(/isLastInGroup = i === messages\.length - 1 \|\| messages\[i\+1\]\.sent !== m\.sent;/g, 'isLastInGroup = i === displayedMessages.length - 1 || displayedMessages[i+1].sent !== m.sent;');

// Render link previews and voice messages inside message bubble
const rendererCode = `
                      {m.text}
                      {m.attachment && m.attachment.type === 'link' && (
                        <a href={m.attachment.data.url} target="_blank" rel="noreferrer" className="block mt-2 bg-white/10 rounded-lg overflow-hidden border border-white/20 text-current no-underline hover:opacity-90">
                          {m.attachment.data.image && <img src={m.attachment.data.image} alt="preview" className="w-full h-32 object-cover" />}
                          <div className="p-2">
                            <div className="font-bold text-sm line-clamp-1">{m.attachment.data.title}</div>
                            {m.attachment.data.description && <div className="text-xs opacity-80 line-clamp-2 mt-1">{m.attachment.data.description}</div>}
                          </div>
                        </a>
                      )}
                      {m.attachment && m.attachment.type === 'voice' && (
                        <div className="mt-2 bg-white/20 p-2 rounded-lg flex items-center gap-2">
                           <Mic className="w-5 h-5" />
                           <span className="text-sm font-medium">Voice Message</span>
                           <span className="text-xs opacity-75">(E2EE Encrypted)</span>
                        </div>
                      )}
`;
code = code.replace(/\{m\.text\}\n\s*<\/div>/, rendererCode + '\n                    </div>');

// Update mic button
const micButton = `
                {input.trim() ? (
                  <button type="submit" className="p-2 text-[var(--color-messenger-blue)] hover:bg-[var(--color-messenger-light)] rounded-full transition-colors mb-0.5">
                    <Send className="w-6 h-6 fill-current" />
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording}
                    className={\`p-2 rounded-full transition-colors mb-0.5 \${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-[var(--color-messenger-blue)] hover:bg-[var(--color-messenger-light)]'}\`}
                  >
                    <Mic className="w-6 h-6" />
                  </button>
                )}
`;
code = code.replace(/\{input\.trim\(\) \? \([\s\S]*?\}\)/, micButton);

fs.writeFileSync(filePath, code);
