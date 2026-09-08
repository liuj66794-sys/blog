// Map the wording of the existing plan to actual catalog titles. Course IDs are never inferred from plan chapter numbers.
const rules = {
  'zsb-math': [
    [/极限|连续|间断/, /极限|连续|间断|无穷小|洛必达/], [/导数|求导|微分|03 章/, /导数|求导|微分|切线|中值定理/],
    [/不定积分|直接积分/, /原函数|直接积分|换元|分部积分|分式与三角积分/], [/换元|分部积分/, /换元|分部积分/],
    [/(?<!不)定积分|牛顿|面积/, /定积分|牛顿|变限积分/], [/多元|偏导/, /偏导|复合与隐函数|二元函数/],
    [/二重积分|多元函数积分/, /二重积分/], [/级数/, /级数/], [/微分方程/, /方程/],
  ],
  'zsb-cs': [
    [/程序设计与 C|C语言01/, /C 程序/], [/数据存储|进制|原反补码/, /数据的表示|运算符/],
    [/顺序结构/, /顺序结构/], [/选择结构/, /选择结构|选择进阶/], [/循环/, /循环/],
    [/数组/, /数组与字符串/], [/函数/, /函数基础|函数进阶/], [/指针/, /指针/],
    [/结构体|文件/, /结构体与文件/], [/绪论/, /数据结构绪论/], [/线性表/, /线性表/],
    [/栈|队列/, /栈和队列/], [/串|矩阵|广义表/, /串|矩阵|广义表/], [/树|森林/, /树/],
    [/图/, /图的/], [/查找/, /查找/], [/排序/, /排序/], [/简答/, /简答/],
  ],
}
export function linkedLessons(slug, text, catalog) {
  const lessons = catalog[slug]?.lessons || []
  let found = []
  if (slug === 'zsb-politics') {
    const ids = [...text.matchAll(/(习概|毛中特|毛概)(\d{1,2})/g)].map(match => (match[1] === '习概' ? 'xg' : 'mzt') + match[2].padStart(2,'0'))
    found = lessons.filter(lesson => ids.includes(lesson.id) || (/时政/.test(text) && lesson.id === 'sz00'))
  } else if (slug === 'zsb-english') {
    let remaining = text
    found = [...lessons].sort((a,b)=>b.title.split(/\s[A-Za-z]/)[0].length-a.title.split(/\s[A-Za-z]/)[0].length).filter(lesson => {
      const topic = lesson.title.split(/\s[A-Za-z]/)[0]
      const parts = topic.split(/和|与/).filter(part => part.length > 1)
      if (!parts.some(part => remaining.includes(part))) return false
      for (const part of parts) remaining = remaining.split(part).join(' ')
      return true
    }).sort((a,b)=>Number(a.id)-Number(b.id))
  } else {
    const matches = (rules[slug] || []).filter(([pattern]) => pattern.test(text))
    found = lessons.filter(lesson => matches.some(([,pattern]) => pattern.test(lesson.title)))
  }
  if (!found.length && /真题|模拟|模考|押题|备考卷|整卷|冲刺|复习|错题|公式/.test(text)) {
    found = lessons.filter(lesson => /真题混编|模拟卷限时|真题模拟|模拟卷一|混合测试|考前一周|背诵策略/.test(lesson.title))
  }
  return found
}
export function linkedTools(slug, text, catalog) {
  const names = []
  if (/错题|易错|薄弱/.test(text)) names.push('错题本')
  if (/混合|复盘/.test(text)) names.push('混合测试')
  if (/材料题/.test(text)) names.push('刷题场')
  const tools = (catalog[slug]?.tools || []).filter(tool=>names.includes(tool.title))
  if (slug==='zsb-politics' && /速记|速查/.test(text)) {
    if (/习概/.test(text)) tools.push({title:'习概速记总表',href:'/lessons/zsb-politics/reference/xg.html'})
    if (/毛中特|毛概/.test(text)) tools.push({title:'毛中特速记总表',href:'/lessons/zsb-politics/reference/mzt.html'})
  }
  return tools
}
export function buildStudyPlan(plan, catalog) {
  const year = Number(plan.examDate.slice(0,4))
  const date = value => `${Number(value.slice(0,2)) > Number(plan.examDate.slice(5,7)) ? year-1 : year}-${value}`
  return {examDate:plan.examDate, weeks:plan.weeks.map(week => ({
    no:week.no, label:week.label, phase:week.phase, start:date(week.start), end:date(week.end),
    tasks:Object.entries(catalog).map(([slug,course]) => {
      const text = week.items[course.subject] || week.items['全科'] || ''
      return {slug,subject:course.subject,prep:course.prep,text,lessonIds:linkedLessons(slug,text,catalog).map(lesson=>lesson.id),tools:linkedTools(slug,text,catalog)}
    }),
  }))}
}
export function activeWeek(plan, date = new Date()) {
  const day = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  return plan.weeks.find(week => day >= week.start && day <= week.end) || (day < plan.weeks[0]?.start ? plan.weeks[0] : plan.weeks.at(-1))
}
