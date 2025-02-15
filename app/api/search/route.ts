import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function POST(request: Request) {
  try {
    const { query } = await request.json()
    
    // 启动浏览器
    const browser = await puppeteer.launch({
      headless: true
    })
    
    // 创建新页面
    const page = await browser.newPage()
    
    // 访问Google搜索
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`)
    
    // 等待搜索结果加载
    await page.waitForSelector('div.g')
    
    // 提取搜索结果
    const searchResults = await page.evaluate(() => {
      const results: any[] = []
      // 选择所有搜索结果项
      const items = document.querySelectorAll('div.g')
      
      items.forEach((item) => {
        const titleElement = item.querySelector('h3')
        const linkElement = item.querySelector('a')
        const snippetElement = item.querySelector('div.VwiC3b')
        
        if (titleElement && linkElement && snippetElement) {
          results.push({
            title: titleElement.textContent || '',
            link: linkElement.href,
            snippet: snippetElement.textContent || ''
          })
        }
      })
      
      return results.slice(0, 5) // 只返回前5条结果
    })
    
    await browser.close()
    
    return NextResponse.json(searchResults)
  } catch (error) {
    console.error('搜索失败:', error)
    return NextResponse.json({ error: '搜索失败' }, { status: 500 })
  }
} 