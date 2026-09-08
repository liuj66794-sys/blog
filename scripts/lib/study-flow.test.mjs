import assert from 'node:assert/strict'
import test from 'node:test'
import {lessonStatus,saveStudyProgress,studyIdentity,safeReturnTo,withStudyContext,reviewCounts,changeTask,STUDY_KEY} from '../runtime/study-state.mjs'
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
  assert.deepEqual(reviewCounts(source,new Date(2026,8,8)),{due:1,politicalWrong:0,csWrong:1})
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
