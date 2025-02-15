'use client'

import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Paperclip, Globe, Mic, Send } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Resizable } from 're-resizable'

// 定义消息类型
type Message = {
  id: number
  content: string
  role: 'user' | 'ai' | 'professor'
}

// 添加类型定义
type StreamChunk = {
  choices: {
    delta: {
      content?: string
    }
  }[]
}

// 添加新的类型定义
type SearchResult = {
  title: string;
  link: string;
  snippet: string;
}

// 添加配置常量
const API_CONFIG = {
  baseUrl: 'https://api.siliconflow.cn/v1/chat/completions',
  model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', // 选择您想使用的模型
  apiKey: process.env.NEXT_PUBLIC_SILICON_API_KEY || '', // 请确保在.env.local中设置此环境变量
  searchApiUrl: '/api/search' // 我们将添加一个新的API路由来处理搜索
}

// 添加一个格式化文本的工具函数
const formatAIMessage = (text: string) => {
  return text.split('\n').map((line, index) => {
    const isListItem = /^[•*-]|^\d+\./.test(line.trim())
    const isHeading = /^#+\s/.test(line.trim())
    const isQuote = /^>/.test(line.trim())
    
    return (
      <div 
        key={index} 
        className={cn(
          "text-[15px] leading-relaxed",
          !line.trim() && "h-4",
          isListItem && "pl-5 relative before:absolute before:left-1 before:content-['•'] before:text-primary/70",
          isHeading && "text-lg font-medium tracking-tight my-3",
          isQuote && "pl-4 border-l-2 border-primary/30 italic text-muted-foreground my-2",
          !isListItem && !isHeading && !isQuote && line.trim() && "my-2"
        )}
      >
        {isListItem ? line.trim().replace(/^[•*-]|\d+\.\s*/, '') : line}
      </div>
    )
  })
}

// 添加评估函数
const shouldAddProfessorComment = (question: string, answer: string): boolean => {
  // 判断问题的复杂度
  const complexityIndicators = [
    '原理', '机制', '架构', '对比', '评估', '分析',
    '为什么', '如何', '区别', '优缺点', '发展趋势'
  ]
  
  const hasComplexity = complexityIndicators.some(indicator => 
    question.includes(indicator)
  )
  
  // 判断回答的深度
  const answerLength = answer.length
  const hasTechnicalTerms = /[A-Z]{2,}|[A-Za-z]+\d+|算法|模型|框架|技术|系统/.test(answer)
  const hasStructure = answer.includes('\n') || /[1-9]\.|\-|\•/.test(answer)
  
  // 根据问题复杂度和回答质量决定是否需要点评
  return hasComplexity || (answerLength > 100 && (hasTechnicalTerms || hasStructure))
}

// 添加可折叠消息组件
const CollapsibleMessage = ({ content, role }: { content: string, role: Message['role'] }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [shouldShowButton, setShouldShowButton] = useState(false)
  const maxHeight = 300 // 设置最大高度为300px

  useEffect(() => {
    if (contentRef.current) {
      setShouldShowButton(contentRef.current.scrollHeight > maxHeight)
    }
  }, [content])

  return (
    <div>
      <div
        ref={contentRef}
        className={cn(
          "overflow-hidden transition-all duration-200",
          !isExpanded && "max-h-[300px]"
        )}
      >
        {role === 'ai' || role === 'professor'
          ? formatAIMessage(content)
          : <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{content}</p>
        }
      </div>
      {shouldShowButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "w-full text-xs text-muted-foreground/80 hover:text-muted-foreground mt-2 flex items-center justify-center gap-1",
            role === 'professor' && "text-orange-700/70 hover:text-orange-700"
          )}
        >
          {isExpanded ? (
            <>
              收起内容
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M18 15L12 9L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          ) : (
            <>
              展开更多
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  )
}

// 添加加载状态组件
const LoadingMessage = () => {
  const [dots, setDots] = useState('...')
  const loadingTexts = [
    '正在联网搜索相关信息',
    '正在整理搜索结果',
    '正在思考如何更好地回答您的问题',
    '马上就好'
  ]
  const [currentText, setCurrentText] = useState(loadingTexts[0])
  
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.')
    }, 500)
    
    const textInterval = setInterval(() => {
      setCurrentText(prev => {
        const currentIndex = loadingTexts.indexOf(prev)
        return loadingTexts[(currentIndex + 1) % loadingTexts.length]
      })
    }, 3000)
    
    return () => {
      clearInterval(dotsInterval)
      clearInterval(textInterval)
    }
  }, [])
  
  return (
    <div className="flex items-center gap-2 text-muted-foreground/70 text-sm">
      <div className="animate-spin h-4 w-4">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
      <span className="animate-pulse">{currentText}{dots}</span>
    </div>
  )
}

const ChatInterface = () => {
<<<<<<< Updated upstream
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // 添加状态管理
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "LLM具体功能是什么",
      role: "ai"
    },
    {
      id: 2, 
      content: "能详细解释一下NLU的应用场景吗？",
      role: "user"
    },
    {
      id: 3,
      content: "NLU在现代技术中有广泛的应用场景：\n• 智能客服：自动理解客户询问，提供相关解答\n• 搜索引擎：理解用户搜索意图，返回相关结果\n• 语音助手：理解口头指令，执行相应操作\n• 情感分析：分析文本中的情感倾向和态度",
      role: "ai"
    }
  ])
=======
  // 修改状态初始化
  const [messages, setMessages] = useState<Message[]>(() => {
    // 从 localStorage 读取历史消息
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatHistory')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
>>>>>>> Stashed changes
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isWebEnabled, setIsWebEnabled] = useState(false)
  const [size, setSize] = useState({
    width: '100%',
    height: '700px'
  })
  const minHeight = 400 // 最小高度
  const minWidth = 320 // 最小宽度
  const maxWidth = 1200 // 最大宽度
  
  // 添加消息保存效果
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(messages))
    }
  }, [messages])

  // 添加清除历史的函数
  const clearHistory = () => {
    setMessages([])
    localStorage.removeItem('chatHistory')
  }

  // 取消未完成的请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // 修改搜索函数
  const searchWeb = async (query: string): Promise<string> => {
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      })
      
      if (!response.ok) {
        throw new Error('搜索请求失败')
      }
      
      const searchResults = await response.json()
      
      // 格式化搜索结果
      return searchResults.map((result: SearchResult) => 
        `标题: ${result.title}\n链接: ${result.link}\n摘要: ${result.snippet}\n\n`
      ).join('---\n')
    } catch (error) {
      console.error('搜索失败:', error)
      throw error
    }
  }

  // 修改教授点评函数
  const addProfessorComment = async (aiMessage: Message, userMessage: Message) => {
    try {
      const professorPrompt = `作为一位资深的AI领域教授，请对以下对话进行专业点评。
      
用户问题：${userMessage.content}

AI助手回答：${aiMessage.content}

请从专业角度对这个回答进行分析。重点关注：
1. 回答中的关键技术概念是否准确
2. 论述是否有理论支撑
3. 是否遗漏了重要观点
4. 对实际应用的指导价值

要求：
- 保持学术严谨性，必要时引用相关研究或最新进展
- 如发现明显疏漏，请补充必要的知识点
- 点评要简洁专业，避免冗长
- 如果回答已经很完善，可以从更高的视角进行延伸或补充

请以"从学术角度来看..."或"从专业视角分析..."开始您的点评。`

      const response = await fetch(API_CONFIG.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: API_CONFIG.model,
          messages: [
            {
              role: 'user',
              content: professorPrompt
            }
          ],
          stream: true,
          temperature: 0.7, // 适当降低随机性
          max_tokens: 1000  // 允许更长的回答
        }),
        signal: abortControllerRef.current?.signal
      })

      if (!response.ok) throw new Error('API请求失败')

      // 创建教授消息
      const professorMessage: Message = {
        id: Date.now() + 2,
        content: '',
        role: 'professor'
      }
      setMessages(prev => [...prev, professorMessage])

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6))
              const content = data.choices[0]?.delta?.content || ''
              
              setMessages(prev => prev.map(msg => 
                msg.id === professorMessage.id 
                  ? { ...msg, content: msg.content + content }
                  : msg
              ))
            } catch (e) {
              console.error('解析响应数据失败:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('教授点评生成失败:', error)
    }
  }

  // 修改消息发送函数
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return
    
    // 初始化 abortController
    abortControllerRef.current = new AbortController()
    
    const userMessage: Message = {
      id: Date.now(),
      content: inputValue,
      role: 'user'
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)
    
    try {
      let messageContent = inputValue
      let systemPrompt = ''
      
      // 如果启用了联网功能，先进行网络搜索
      if (isWebEnabled) {
        try {
          const searchResults = await searchWeb(inputValue)
          systemPrompt = `我已经为您搜索到以下相关信息：\n\n${searchResults}\n\n基于以上搜索结果，请对问题"${inputValue}"进行全面的回答。请注意：
1. 综合搜索结果中的关键信息
2. 保持回答的准确性和客观性
3. 适当引用来源
4. 用通俗易懂的方式解释专业概念`
          messageContent = systemPrompt
        } catch (error) {
          console.error('搜索失败:', error)
          // 搜索失败时回退到直接使用用户输入
          messageContent = inputValue
        }
      }
      
      const response = await fetch(API_CONFIG.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: API_CONFIG.model,
          messages: [
            {
              role: 'user',
              content: messageContent
            }
          ],
          stream: true
        }),
        signal: abortControllerRef.current?.signal
      })

      if (!response.ok) {
        throw new Error('API请求失败')
      }

      // 创建一个新的AI消息
      const aiMessage: Message = {
        id: Date.now() + 1,
        content: '',
        role: 'ai'
      }
      setMessages(prev => [...prev, aiMessage])

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6))
              const content = data.choices[0]?.delta?.content || ''
              
              setMessages(prev => prev.map(msg => 
                msg.id === aiMessage.id 
                  ? { ...msg, content: msg.content + content }
                  : msg
              ))
            } catch (e) {
              console.error('解析响应数据失败:', e)
            }
          }
        }
      }

      // 判断是否需要添加教授点评
      if (shouldAddProfessorComment(userMessage.content, aiMessage.content)) {
        await addProfessorComment(aiMessage, userMessage)
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('请求被取消')
      } else {
        console.error('发送消息失败:', error)
        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          content: '抱歉，发送消息时出现错误。',
          role: 'ai'
        }])
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  // 添加滚动到底部的函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // 当消息更新时自动滚动
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
<<<<<<< Updated upstream
    <div className="w-full h-[100vh] pt-4 flex items-start justify-center">
      <Resizable
        size={size}
        onResizeStop={(e, direction, ref, d) => {
          setSize({
            width: direction === 'bottom' ? size.width : size.width + d.width,
            height: direction === 'bottom' ? size.height + d.height : size.height
          })
        }}
        minHeight={minHeight}
        maxWidth={maxWidth}
        minWidth={minWidth}
        enable={{
          top: false,
          right: true,
          bottom: true,
          left: true,
          topRight: false,
          bottomRight: true,
          bottomLeft: true,
          topLeft: false
        }}
        className="relative"
      >
        <Card className="w-full h-full flex flex-col bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 hover:opacity-100 transition-opacity">
            <svg 
              viewBox="0 0 24 24" 
              className="w-full h-full text-muted-foreground/30"
            >
              <path 
                fill="currentColor" 
                d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z"
              />
            </svg>
          </div>

          <CardContent className="flex-1 overflow-auto p-6 space-y-6 min-h-0 scroll-smooth">
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {(message.role === 'ai' || message.role === 'professor') && (
                    <Avatar className="h-8 w-8 ring-2 ring-primary/10 flex-shrink-0">
                      <AvatarImage 
                        src={message.role === 'professor' ? "/professor-avatar.png" : "/ai-avatar.png"} 
                        alt={message.role === 'professor' ? "Professor Avatar" : "AI Avatar"} 
                      />
                      <AvatarFallback 
                        className={cn(
                          "text-sm",
                          message.role === 'professor' 
                            ? "bg-orange-100 text-orange-700" 
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        {message.role === 'professor' ? 'P' : 'AI'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                    "flex",
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                    "min-w-0 max-w-[85%]"
                  )}>
                    <div 
                      className={cn(
                        "rounded-2xl px-4 py-3 shadow-sm break-words inline-block",
                        message.role === 'user' 
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : message.role === 'professor'
                            ? "bg-gradient-to-br from-orange-50 to-amber-50 text-orange-900 rounded-tl-sm border border-orange-200/50"
                            : "bg-muted/50 backdrop-blur-sm rounded-tl-sm"
                      )}
                    >
                      {message.role === 'professor' && (
                        <div className="text-orange-800/70 text-xs mb-2 font-medium">
                          学术点评
                        </div>
                      )}
                      <CollapsibleMessage content={message.content} role={message.role} />
                    </div>
                  </div>
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 ring-2 ring-primary/10 flex-shrink-0">
                      <AvatarImage src="/user-avatar.png" alt="User Avatar" />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3 px-4 py-2">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <LoadingMessage />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
          
          <CardFooter className="border-t p-6 shrink-0">
            <form onSubmit={handleSendMessage} className="flex w-full gap-3 items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                type="button" 
                disabled={isLoading}
                className="hover:bg-muted"
              >
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </Button>
              <div className="flex-1 relative">
                <Input 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder='发送消息...'
                  className="pr-24 py-5 text-base bg-muted/50 border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-0"
                  disabled={isLoading}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button 
                    variant={isWebEnabled ? "default" : "ghost"} 
                    size="icon" 
                    type="button" 
                    disabled={isLoading}
                    onClick={() => setIsWebEnabled(!isWebEnabled)}
                    className={cn(
                      "h-8 w-8",
                      !isWebEnabled && "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Globe className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    type="button" 
                    disabled={isLoading}
                    className="h-8 w-8 hover:bg-muted text-muted-foreground"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
=======
    <Card className="w-full max-w-3xl mx-auto h-[600px] flex flex-col">
      <div className="p-4 border-b flex justify-end">
        <Button 
          variant="outline" 
          size="sm"
          onClick={clearHistory}
        >
          清除历史记录
        </Button>
      </div>
      <CardContent className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'ai' && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt="AI Avatar" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}
              <div className={`flex-1 ${message.role === 'user' ? 'max-w-[80%]' : ''}`}>
                <div className={`rounded-lg p-4 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  {message.content}
>>>>>>> Stashed changes
                </div>
              </div>
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading}
                className="h-11 w-11 rounded-xl"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </Resizable>
    </div>
  )
}

export default ChatInterface

