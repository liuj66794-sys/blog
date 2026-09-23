import { activeWeek } from '../../scripts/lib/study-plan.mjs'
import { lessonStatus, reviewCounts, taskPreferences, studyIdentity, subjectProgress, localDay, withStudyContext, safeReturnTo } from '../../scripts/runtime/study-state.mjs'
import { readRecent } from '../../scripts/runtime/reading-state.mjs'
import { dueKnowledge } from '../../scripts/runtime/teaching-flow.mjs'
import { readMistakes, isDue, mistakeId } from '../../scripts/runtime/mistake-store.mjs'

export function weeklyTasks(plan,catalog,base='/blog/',storage,date=new Date()) {
  const week=activeWeek(plan,date)
  if (!week) return []
  return week.tasks.map(task=>{
    const course=catalog[task.slug]
    const lessons=task.lessonIds.map(id=>course.lessons.find(lesson=>lesson.id===id)).filter(Boolean)
    return {...task,week,lessons,completed:lessons.filter(lesson=>lessonStatus(task.slug,lesson,base,storage).state==='complete').length}
  })
}
export function todayTasks(plan,catalog,base='/blog/',storage,date=new Date(),{pace='progress',returnTo}={}) {
  const preferences=taskPreferences(storage), day=localDay(date), tasks=[]
  const origin=safeReturnTo(returnTo,base) || `${base}prep/${pace==='week'?'?pace=week':''}#today-tasks`
  const recent=readRecent(base,storage)
  const identity=recent && studyIdentity(recent.path,base)
  const addLesson=(slug,lesson,kind='本周的一课',resume=null)=>{
    const id=`lesson:${slug}:${lesson.id}`
    if (tasks.some(task=>task.id===id)) return
    const status=lessonStatus(slug,lesson,base,storage)
    if (status.state === 'complete') return
    const practiceHref=withStudyContext(lesson.interactive,origin,base)
    tasks.push({id,kind,title:lesson.title,subject:catalog[slug].subject,status,href:resume || practiceHref,practiceHref,limit:preferences[id]?.limit,description:status.total ? `${status.answered}/${status.total} 项练习已完成${status.reviewNeeded ? ` · ${status.reviewNeeded} 项需巩固` : ''}` : '边读边练，从当前练习继续。',minutes:15})
  }
  const counts=reviewCounts(storage,date)
  if(counts.due>0) tasks.push({id:'review:politics',kind:'到期复习',subject:'政治',title:'复习已学闪卡',description:`${counts.due} 张已学且到期，先复习一小组。`,count:counts.due,minutes:5,href:`${base}lessons/zsb-politics/lessons/srs.html?limit=10&returnTo=${encodeURIComponent(origin)}`})
  // 到期知识点复测：与错题任务按题目 id 去重——同一道题的复测只在一处出现。
  const knowledgeDue=dueKnowledge(storage,date.getTime())
  if(knowledgeDue.length) {
    const now=date.getTime(), mistakes=readMistakes(storage)
    const dueQuestions=new Set(Object.entries(mistakes).filter(([,entry])=>isDue(entry,now)).map(([id])=>id))
    const seenQuestions=new Set(), picked=[]
    for(const point of knowledgeDue) {
      const source=point.source
      if(!source || !catalog[source.slug]) continue
      const lesson=catalog[source.slug].lessons.find(item=>item.id===String(source.lessonId))
      if(!lesson) continue
      const question=mistakeId({slug:source.slug,lessonId:source.lessonId,ref:source.ref})
      if(dueQuestions.has(question) || seenQuestions.has(question)) continue
      seenQuestions.add(question)
      picked.push({...point,lesson,subject:catalog[source.slug].subject})
    }
    if(picked.length) {
      const first=picked[0], names=picked.slice(0,3).map(point=>point.source.name || '知识点')
      const practice=withStudyContext(first.lesson.interactive,origin,base)
      tasks.push({id:'knowledge:due',kind:'知识点复测',subject:first.subject,title:`复测 ${picked.length} 个到期知识点`,description:`${names.join('、')}${picked.length>names.length?' 等':''}已到 1/3/7 天复测期，回对应课重新作答。`,count:picked.length,minutes:5,href:practice,practiceHref:practice})
    }
  }
  const wrongTotal = counts.csWrong + counts.politicalWrong + counts.mathWrong + counts.englishWrong
  if(wrongTotal>0) {
    tasks.push({id:'wrong:all',kind:'处理一个薄弱点',subject:'四科复习',title:'重做错题',description:`${wrongTotal} 道现在可复习，先做一小组。`,minutes:5,href:withStudyContext('/review/',origin,base,{practice:1,limit:5})})
  }
  const preferred=identity?.slug || {0:'zsb-politics',2:'zsb-math',3:'zsb-cs',5:'zsb-english',6:'zsb-english'}[date.getDay()]
  const addProgress = (slug) => {
    const progress=subjectProgress(slug,catalog[slug].lessons,base,storage)
    const lesson=progress.continueLesson
    if (lesson) addLesson(slug,lesson,progress.statuses[lesson.id].state==='learning'?'继续上次学习':progress.started?'接着学下一课':'从基础开始',withStudyContext(progress.continueHref,origin,base))
  }
  const weekly=weeklyTasks(plan,catalog,base,storage,date).sort((a,b)=>Number(b.slug===preferred)-Number(a.slug===preferred))
  if (pace === 'week' && weekly.length) {
    if(identity && catalog[identity.slug]) {
      const progress=subjectProgress(identity.slug,catalog[identity.slug].lessons,base,storage)
      if(progress.continueLesson && progress.statuses[progress.continueLesson.id].state==='learning') addProgress(identity.slug)
    }
    for(const task of weekly) {
      const lesson=task.lessons.find(item=>lessonStatus(task.slug,item,base,storage).state!=='complete')
      if(lesson) addLesson(task.slug,lesson)
    }
  } else {
    // Independent of the plan's calendar: a new student starts at the beginning,
    // and returning students can still continue after the scheduled weeks end.
    for(const slug of Object.keys(catalog).sort((a,b)=>Number(b===preferred)-Number(a===preferred))) addProgress(slug)
  }
  return tasks.filter(task=>!(preferences[task.id]?.deferUntil>day)).slice(0,3).map(task=>{
    const limit=preferences[task.id]?.limit
    if(limit===1) {
      const url=new URL(task.practiceHref || task.href,'https://study.invalid');url.searchParams.delete('resume');url.hash='';url.searchParams.set('practice','1');url.searchParams.set('limit','1')
      return {...task,limit,href:url.pathname+url.search+url.hash,minutes:5}
    }
    return task
  })
}
