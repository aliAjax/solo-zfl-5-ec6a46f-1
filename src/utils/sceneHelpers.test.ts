import { describe, it, expect } from 'vitest'
import { generateWritingPrompt } from '@/utils/sceneHelpers'
import type { WindowScene, Weather, TreeDensity, PedestrianStatus } from '@/types'

const WEATHERS: Weather[] = ['晴', '多云', '阴', '小雨', '大雨', '雪', '雾']
const TREES: TreeDensity[] = ['稀疏', '适中', '茂密']
const PEDESTRIANS: PedestrianStatus[] = ['稀少', '零星', '密集']

function makeScene(overrides: Partial<WindowScene> = {}): WindowScene {
  return {
    id: 's1',
    routeName: '27路',
    segment: '钟楼 → 大差市',
    seatDirection: '左',
    timestamp: '2026-09-12T08:00:00.000Z',
    weather: '小雨',
    signText: '',
    treeDensity: '茂密',
    pedestrianStatus: '零星',
    note: '一句观察',
    ...overrides,
  }
}

describe('generateWritingPrompt', () => {
  it('所有天气 × 树木 × 行人组合都能生成非空提示', () => {
    for (const weather of WEATHERS) {
      for (const treeDensity of TREES) {
        for (const pedestrianStatus of PEDESTRIANS) {
          const prompt = generateWritingPrompt(makeScene({ weather, treeDensity, pedestrianStatus }))
          expect(prompt.length).toBeGreaterThan(8)
        }
      }
    }
  })

  it('有招牌时提示一定结合招牌文字', () => {
    const scene = makeScene({ signText: '老王修表' })
    for (let i = 0; i < 20; i++) {
      expect(generateWritingPrompt(scene)).toContain('老王修表')
    }
  })

  it('无招牌时不出现为招牌预留的空引号', () => {
    const scene = makeScene({ signText: '' })
    for (let i = 0; i < 20; i++) {
      expect(generateWritingPrompt(scene)).not.toContain('「」')
    }
  })

  it('招牌只有空白字符时按无招牌处理', () => {
    const scene = makeScene({ signText: '   ' })
    expect(generateWritingPrompt(scene)).not.toContain('「」')
  })

  it('同一条记录反复生成会有不同组合', () => {
    const scene = makeScene({ weather: '晴', signText: '老王修表' })
    const prompts = new Set(Array.from({ length: 30 }, () => generateWritingPrompt(scene)))
    expect(prompts.size).toBeGreaterThan(1)
  })

  it('提示由两个方面的句式组合而成', () => {
    const prompt = generateWritingPrompt(makeScene())
    expect(prompt).toContain('；')
  })
})
