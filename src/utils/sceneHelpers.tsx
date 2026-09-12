import type { WindowScene, Weather, TreeDensity, PedestrianStatus } from '@/types'
import {
  Sun, Cloud, CloudRain, CloudDrizzle, CloudSnow, CloudFog,
  TreePine, TreePine as TreeSparse, Trees,
  PersonStanding, Users,
} from 'lucide-react'

export function getWeatherIcon(weather: Weather) {
  const map: Record<Weather, React.ReactNode> = {
    '晴': <Sun className="w-4 h-4 text-dusk-400" />,
    '多云': <Cloud className="w-4 h-4 text-mist-400" />,
    '阴': <Cloud className="w-4 h-4 text-mist-500" />,
    '小雨': <CloudDrizzle className="w-4 h-4 text-blue-400" />,
    '大雨': <CloudRain className="w-4 h-4 text-blue-500" />,
    '雪': <CloudSnow className="w-4 h-4 text-mist-200" />,
    '雾': <CloudFog className="w-4 h-4 text-mist-400" />,
  }
  return map[weather]
}

export function getTreeIcon(density: TreeDensity) {
  const map: Record<TreeDensity, React.ReactNode> = {
    '稀疏': <TreeSparse className="w-4 h-4 text-green-600" />,
    '适中': <TreePine className="w-4 h-4 text-green-500" />,
    '茂密': <Trees className="w-4 h-4 text-green-400" />,
  }
  return map[density]
}

export function getPedestrianIcon(status: PedestrianStatus) {
  const map: Record<PedestrianStatus, React.ReactNode> = {
    '稀少': <PersonStanding className="w-4 h-4 text-mist-400" />,
    '零星': <PersonStanding className="w-4 h-4 text-dusk-300" />,
    '密集': <Users className="w-4 h-4 text-dusk-400" />,
  }
  return map[status]
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hour}:${minute}`
}

export function getTimeOfDay(iso: string): string {
  const h = new Date(iso).getHours()
  if (h < 6) return '深夜'
  if (h < 9) return '清晨'
  if (h < 12) return '上午'
  if (h < 14) return '中午'
  if (h < 17) return '下午'
  if (h < 19) return '傍晚'
  return '夜晚'
}

// 写作提示按记录字段生成：天气 / 招牌 / 树木密度 / 行人状态各有一组句式，
// 每次抽取时随机组合两个方面，同一条记录重抽也会得到不同的提示。
const WEATHER_PROMPTS: Record<Weather, string[]> = {
  '晴': ['把阳光写成一个沉默的在场者，它看见了什么', '让光线在段落之间移动，标记时间的流逝'],
  '多云': ['让云层的厚薄对应人物情绪的起伏', '写一段光线犹豫不决的路途'],
  '阴': ['用低垂的天色压住对话的音量', '让阴天成为人物回避某个话题的理由'],
  '小雨': ['让雨声决定段落的节奏与停顿', '写一个在雨里放慢脚步的人，他在回避什么'],
  '大雨': ['让一场暴雨打断一句重要的对话', '把大雨写成把城市冲出另一副面孔的力量'],
  '雪': ['让雪吸走所有声音，写一段近乎无声的相遇', '用初雪覆盖熟悉的街道，写出陌生感'],
  '雾': ['让雾气藏起一个关键细节，到结尾才显现', '写在雾里只听得见声音的一小段路'],
}

const TREE_PROMPTS: Record<TreeDensity, string[]> = {
  '稀疏': ['让稀疏的树影之间，露出人物刻意保持的距离'],
  '适中': ['用行道树的间隔，丈量人物若即若离的关系'],
  '茂密': ['让浓密的树冠，遮住一句没说出口的话'],
}

const PEDESTRIAN_PROMPTS: Record<PedestrianStatus, string[]> = {
  '稀少': ['把空荡的人行道写成一种等待'],
  '零星': ['让零星的路人，各自携带一个不相干的秘密'],
  '密集': ['在拥挤的人潮里，安排一次只有一个人察觉的回望'],
}

function signPrompts(signText: string): string[] {
  return [
    `以「${signText}」的招牌为线索，牵出一个陌生人的故事`,
    `想象「${signText}」打烊之后，店里发生的事`,
    `让主人公在「${signText}」的灯箱下，做一个犹豫已久的决定`,
  ]
}

const pickOne = <T,>(pool: T[]): T => pool[Math.floor(Math.random() * pool.length)]

export function generateWritingPrompt(scene: WindowScene): string {
  const aspectPools = [
    WEATHER_PROMPTS[scene.weather],
    TREE_PROMPTS[scene.treeDensity],
    PEDESTRIAN_PROMPTS[scene.pedestrianStatus],
  ]
  const sign = scene.signText.trim()
  if (sign) {
    // 招牌是最具体的线索，有招牌时一定带上，再从其余方面随机配一个
    return [pickOne(signPrompts(sign)), pickOne(pickOne(aspectPools))].join('；')
  }
  // 无招牌时从三个方面里不重复地随机取两个
  const first = Math.floor(Math.random() * aspectPools.length)
  const second = (first + 1 + Math.floor(Math.random() * (aspectPools.length - 1))) % aspectPools.length
  return [pickOne(aspectPools[first]), pickOne(aspectPools[second])].join('；')
}
