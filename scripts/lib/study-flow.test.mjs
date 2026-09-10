import assert from 'node:assert/strict'
import test from 'node:test'
import {lessonStatus,saveStudyProgress,studyIdentity,safeReturnTo,withStudyContext,reviewCounts,changeTask,subjectProgress,matchesStudyFilter,STUDY_KEY} from '../runtime/study-state.mjs'
import {filterPrepLessons} from './prep-catalog.mjs'
import {linkedLessons,activeWeek,buildStudyPlan} from './study-plan.mjs'
import {prepCatalog} from '../../docs/.vuepress/prep-catalog.mjs'
import {todayTasks,weeklyTasks} from '../../docs/.vuepress/study-tasks.mjs'
import {saveReading} from '../runtime/reading-state.mjs'
const storage = (initial={}) => {const map=new Map(Object.entries(initial));return {get length(){return map.size},getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),key:index=>[...map.keys()][index]}}
const lesson=prepCatalog['zsb-math'].lessons.find(item=>item.id==='10')
const week={no:1,label:'W1',start:'09-07',end:'09-13',phase:'强化刷题',items:{高数:'02 极限与连续 强化（极限计算、连续性、间断点）',英语:'语法①名词 ②冠词 ③代词',政治:'习概00 导论',计算机:'C语言01 程序设计与 C 语言'}}
const plan=buildStudyPlan({examDate:'2027-03-27',weeks:[week]},prepCatalog)
test('reading and interactive routes share one lesson identity and return context remains on site',()=>{
  assert.equal(studyIdentity('/blog/courses/zsb-math/l/10/').key,'zsb-math:10')
  assert.equal(studyIdentity('/blog/lessons/zsb-math/lessons/0010-极限概念与左右极限.html').key,'zsb-math:10')
  assert.equal(studyIdentity('/blog/lessons/zsb-politics/lessons/xg00.html').key,'zsb-politics:xg00')
  for(const bad of ['https://evil.test','//evil.test','/other/','/blog/../evil','/blog/courses/\\evil']) assert.equal(safeReturnTo(bad),null)
  const back='/blog/courses/?q=极限&group=专升本备考'
  assert.equal(new URL(withStudyContext(lesson.interactive,back),'https://study.test').searchParams.get('returnTo'),safeReturnTo(back))
})
test('visits and legacy aggregate counts cannot silently turn into completed exercises',()=>{
  const source=storage({'zc-progress-v1':JSON.stringify({'0010':{visits:2,quizRight:100,quizTotal:100}})})
  assert.equal(lessonStatus('zsb-math',lesson,'/blog/',source).state,'learning')
  saveStudyProgress({slug:'zsb-math',id:'10',title:lesson.title,path:'/blog'+lesson.interactive,total:4,answered:0,correct:0,reviewNeeded:1},source)
  assert.equal(lessonStatus('zsb-math',lesson,'/blog/',source).state,'learning')
  assert.equal(lessonStatus('zsb-math',lesson,'/blog/',source).reviewNeeded,1)
  saveStudyProgress({slug:'zsb-math',id:'10',title:lesson.title,path:'/blog'+lesson.interactive,total:4,answered:4,correct:3,reviewNeeded:1},source)
  const done=lessonStatus('zsb-math',lesson,'/blog/',source)
  assert.equal(done.label,'已完成练习');assert.equal(done.reviewNeeded,1)
})
test('daily review counts contain only learned and actually due cards and unfixed mistakes',()=>{
  const source=storage({'zzkk:v2:card:new':JSON.stringify({box:0}),'zzkk:v2:card:due':JSON.stringify({box:1,at:'2026-09-07'}),'zzkk:v2:card:later':JSON.stringify({box:3,at:'2026-09-07'}),'zsb-mistakes-v1':JSON.stringify({'0001':{1:{wrongs:2,fixed:false},2:{wrongs:1,fixed:true}}})})
  assert.deepEqual(reviewCounts(source,new Date(2026,8,8)),{due:1,politicalWrong:0,csWrong:1,mathWrong:0,englishWrong:0})
})
test('weekly task links use course semantics rather than confusing source chapter numbers with lesson IDs',()=>{
  assert.deepEqual(linkedLessons('zsb-english',week.items.英语,prepCatalog).map(x=>x.id),['1','2','3'])
  assert.deepEqual(linkedLessons('zsb-english','语法⑫定语从句 ⑬名词性从句',prepCatalog).map(x=>x.id),['12','13'])
  assert.deepEqual(linkedLessons('zsb-cs','C语言03 顺序结构程序设计',prepCatalog).map(x=>x.id),['4'])
  assert.deepEqual(linkedLessons('zsb-politics',week.items.政治,prepCatalog).map(x=>x.id),['xg00'])
  assert.ok(linkedLessons('zsb-math',week.items.高数,prepCatalog).some(x=>x.id==='14'))
  assert.equal(activeWeek(plan,new Date(2026,8,8)).no,1)
})
test('today has at most three direct tasks, supports deferral, and course completion updates weekly counts without checking the entire week',()=>{
  const source=storage(),date=new Date(2026,8,8)
  const initial=todayTasks(plan,prepCatalog,'/blog/',source,date)
  assert.equal(initial.length,3);assert.equal(initial[0].id,'lesson:zsb-math:10')
  assert.ok(initial.every(task=>task.href.includes('/lessons/') && task.href.includes('returnTo=')))
  changeTask(initial[0].id,{deferUntil:'2026-09-09'},source)
  assert.ok(!todayTasks(plan,prepCatalog,'/blog/',source,date).some(task=>task.id===initial[0].id))
  saveStudyProgress({slug:'zsb-math',id:'10',title:lesson.title,path:'/blog'+lesson.interactive,total:4,answered:4,correct:4,reviewNeeded:0},source)
  assert.equal(weeklyTasks(plan,prepCatalog,'/blog/',source,date)[0].completed,1)
  assert.equal(source.getItem('zsb-prep-checks'),null)
})
test('subject progress aggregates states and points at the lesson to continue',()=>{
  const lessons=prepCatalog['zsb-math'].lessons.slice(0,12)
  const empty=subjectProgress('zsb-math',lessons,'/blog/',storage())
  assert.deepEqual({complete:empty.complete,learning:empty.learning,started:empty.started},{complete:0,learning:0,started:false})
  assert.equal(empty.continueLesson.id,'1')
  const source=storage()
  saveReading({path:'/blog/lessons/zsb-math/lessons/0003-x.html',title:'函数概念与定义域',y:10,offset:0},'/blog/',source)
  saveStudyProgress({slug:'zsb-math',id:'1',title:'三角函数必背包',path:'/blog/lessons/zsb-math/lessons/0001-x.html',total:3,answered:3,correct:3,reviewNeeded:0},source)
  const progress=subjectProgress('zsb-math',lessons,'/blog/',source)
  assert.equal(progress.complete,1)
  assert.equal(progress.learning,1)
  assert.equal(progress.started,true)
  assert.equal(progress.continueLesson.id,'3')
  const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}
  assert.equal(subjectProgress('zsb-math',lessons,'/blog/',blocked).started,false)
})

test('damaged or unavailable storage leaves learning and its navigation usable',()=>{
  const source=storage({[STUDY_KEY]:'null'})
  assert.equal(lessonStatus('zsb-math',lesson,'/blog/',source).state,'new')
  const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}
  assert.equal(saveStudyProgress({slug:'zsb-math',id:'10'},blocked),false)
  assert.ok(todayTasks(plan,prepCatalog,'/blog/',blocked,new Date(2026,8,8)).length>0)
})

test('shrinking a resumed reading task opens the current interactive exercise instead of restoring a reading offset',()=>{
  const source=storage()
  saveReading({path:'/blog/courses/zsb-math/l/10/',title:lesson.title,y:450,offset:20},'/blog/',source)
  changeTask('lesson:zsb-math:10',{limit:1},source)
  const [task]=todayTasks(plan,prepCatalog,'/blog/',source,new Date(2026,8,8))
  const target=new URL(task.href,'https://study.test')
  assert.match(target.pathname,/\/lessons\/zsb-math\/lessons\/0010-/)
  assert.equal(target.searchParams.get('practice'),'1')
  assert.equal(target.searchParams.has('resume'),false)
})

test('subject continuation chooses the latest unfinished lesson and its latest reading mode', () => {
  const lessons = prepCatalog['zsb-math'].lessons
  const source = storage({ 'l1uj-reading-v1': JSON.stringify({ version: 1, entries: [
    { path: '/blog/courses/zsb-math/l/3/', mode: 'reading', title: '函数', updatedAt: 100, y: 80 },
    { path: '/blog' + lessons[9].interactive, mode: 'interactive', title: '极限', updatedAt: 200, y: 500 },
    { path: '/blog/courses/zsb-math/l/10/', mode: 'reading', title: '极限', updatedAt: 300, y: 900 },
    { path: '/blog/courses/zsb-english/l/1/', mode: 'reading', title: '名词', updatedAt: 500, y: 100 },
  ] }) })
  const before = source.getItem('l1uj-reading-v1')
  const progress = subjectProgress('zsb-math', lessons, '/blog/', source)
  assert.equal(progress.continueLesson.id, '10')
  assert.equal(progress.learning, 2, 'reading and interactive visits represent one lesson')
  assert.equal(progress.continueEntry.mode, 'reading')
  assert.equal(progress.continueEntry.y, 900)
  assert.equal(progress.continueHref, '/blog/courses/zsb-math/l/10/?resume=1')
  assert.equal(source.getItem('l1uj-reading-v1'), before, 'selection does not mutate the history')
})

test('finished recent lessons do not displace unfinished work, and all-finished courses have no fake next lesson', () => {
  const lessons = prepCatalog['zsb-math'].lessons.slice(0, 2)
  const entries = Object.fromEntries(lessons.map((lesson, i) => [`zsb-math:${lesson.id}`, {
    total: 2, answered: i ? 1 : 2, reviewNeeded: i ? 0 : 1, updatedAt: i ? 100 : 500,
  }]))
  const source = storage({ [STUDY_KEY]: JSON.stringify({ version: 1, entries }) })
  assert.equal(subjectProgress('zsb-math', lessons, '/blog/', source).continueLesson.id, '2')
  entries['zsb-math:2'].answered = 2
  source.setItem(STUDY_KEY, JSON.stringify({ version: 1, entries }))
  const result = subjectProgress('zsb-math', lessons, '/blog/', source)
  assert.equal(result.continueLesson, null)
  assert.equal(result.continueHref, null)
  assert.equal(result.complete, 2)
  assert.equal(result.review, 1, 'finishing all answers does not hide review needs')
})

test('practice timestamps choose recent unfinished work even if no reading position survived', () => {
  const lessons = prepCatalog['zsb-math'].lessons.slice(0, 2)
  const source = storage({ [STUDY_KEY]: JSON.stringify({ version: 1, entries: {
    'zsb-math:1': { total: 4, answered: 1, updatedAt: 10 },
    'zsb-math:2': { total: 4, answered: 2, updatedAt: 20 },
  } }) })
  const result = subjectProgress('zsb-math', lessons, '/blog/', source)
  assert.equal(result.continueLesson.id, '2')
  assert.equal(result.continueEntry, null)
  assert.equal(new URL(result.continueHref, 'https://study.test').searchParams.has('resume'), false)
})

test('renamed or unsafe old resume URLs fall back to the current catalog route', () => {
  const lessons = prepCatalog['zsb-math'].lessons
  const source = storage({ 'l1uj-reading-v1': JSON.stringify({ version: 1, entries: [
    { path: '/blog/lessons/zsb-math/lessons/0003-renamed.html', title: '函数', updatedAt: 100, y: 800 },
    { path: 'https://other.test/blog/courses/zsb-math/l/10/', title: '无效', updatedAt: 200, y: 20 },
  ] }) })
  const progress = subjectProgress('zsb-math', lessons, '/blog/', source)
  assert.equal(progress.continueLesson.id, '3')
  assert.equal(progress.continueEntry, null)
  assert.equal(decodeURI(new URL(progress.continueHref, 'https://study.test').pathname), '/blog' + lessons[2].interactive)
  const unavailable = { getItem() { throw Error('denied') } }
  assert.equal(subjectProgress('zsb-math', lessons, '/blog/', unavailable).continueLesson.id, '1')
  assert.equal(subjectProgress('zsb-math', [], '/blog/', unavailable).continueHref, null)
})

test('learning-state filtering combines with knowledge and chapter filters without equating completion and mastery', () => {
  const lessons = [
    { id: '1', label: '01', title: '极限概念', group: '基础' },
    { id: '2', label: '02', title: '极限计算', group: '基础' },
    { id: '3', label: '03', title: '极限练习', group: '强化' },
  ]
  const states = { 1: { state: 'complete', reviewNeeded: 1 }, 2: { state: 'learning', reviewNeeded: 1 }, 3: { state: 'new' } }
  const filter = (q, group, state) => filterPrepLessons(lessons, q, group).filter(lesson => matchesStudyFilter(states[lesson.id], state)).map(lesson => lesson.id)
  assert.deepEqual(filter('极限', '基础', 'review'), ['1', '2'])
  assert.deepEqual(filter('极限', '基础', 'complete'), ['1'])
  assert.deepEqual(filter('极限', '基础', 'learning'), ['2'])
  assert.deepEqual(filter('', '强化', 'review'), [])
  assert.deepEqual(filter('', '', 'new'), ['3'])
  assert.deepEqual(filter('', '', 'invalid-old-filter'), ['1', '2', '3'])
  const back = '/blog/courses/zsb-math/?q=极限&group=基础&status=review'
  assert.equal(new URL(withStudyContext('/courses/zsb-math/l/1/', back), 'https://study.test').searchParams.get('returnTo'), safeReturnTo(back))
})
