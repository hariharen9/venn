import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

export default function ChatModal({ isOpen, onClose, topic, history = [], onSendMessage, settings }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      console.log('ChatModal opened, history:', history)
      setMessages(history || [])
    }
  }, [isOpen])

  useEffect(() => {
    console.log('Messages updated:', messages)
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    console.log('Sending message:', input)
    
    const userMsg = { role: 'user', content: input }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      console.log('Fetching /api/chat...')
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
          message: input,
          history: messages.filter(m => m.role !== 'system'),
          aiMode: settings?.aiMode || 'openrouter',
          ollamaModel: settings?.ollamaModel || 'gemma3',
          ollamaUrl: settings?.ollamaUrl || 'http://localhost:11434',
        }),
      })

      console.log('Chat response status:', res.status)
      
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      console.log('Chat response data:', data)
      
      const aiMsg = { role: 'assistant', content: data.content }
      setMessages(prev => [...newMessages, aiMsg])
      if (onSendMessage) {
        onSendMessage(null, null, [...newMessages, aiMsg], true)
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...newMessages, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-bg/90 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg h-[70vh] flex flex-col border border-accent bg-surface shadow-2xl"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-accent bg-accent/5">
          <div className="flex items-center gap-2">
            <span className="text-accent text-sm" style={{ fontFamily: 'var(--font-display)' }}>
              CHAT_SESSION
            </span>
            <span className="text-dim text-xs">/ {topic}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-dim text-xs">
              {settings?.aiMode === 'ollama' ? settings.ollamaModel : 'gemma-4-26b'}
            </span>
            <button onClick={onClose} className="text-dim hover:text-text text-lg">×</button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-dim text-xs text-center py-8">
              Ask anything about this topic...
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div 
                className={`inline-block max-w-[85%] px-3 py-2 text-xs rounded ${
                  msg.role === 'user' 
                    ? 'bg-accent/20 text-text border border-accent/30' 
                    : 'bg-bg text-dim border border-muted text-left'
                }`}
              >
                <span className="text-accent mr-1">{msg.role === 'user' ? '>' : '<'}</span>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <ReactMarkdown 
                    components={{
                      p: ({node, ...props}) => <p className="mb-1" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-1" {...props} />,
                      li: ({node, ...props}) => <li className="mb-0.5" {...props} />,
                      strong: ({node, ...props}) => <strong className="text-accent" {...props} />,
                      code: ({node, ...props}) => <code className="bg-border px-1 rounded text-accent" {...props} />,
                      pre: ({node, ...props}) => <pre className="bg-border p-2 rounded overflow-x-auto mb-1" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="text-left">
              <div className="inline-block px-3 py-2 text-xs text-dim bg-bg border border-muted rounded">
                <span className="animate-pulse">thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 bg-bg border border-muted text-text text-sm px-4 py-3 rounded outline-none focus:border-accent"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 border border-accent text-accent rounded hover:bg-accent hover:text-bg transition-colors disabled:opacity-30"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              SEND
            </button>
          </div>
        </div>

        <style jsx>{`
          .animate-fade-in {
            animation: fadeIn 0.2s ease-out forwards;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  )
}